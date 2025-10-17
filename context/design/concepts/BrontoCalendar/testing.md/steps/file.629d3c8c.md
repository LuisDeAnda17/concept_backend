---
timestamp: 'Thu Oct 16 2025 11:02:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_110209.58f5a961.md]]'
content_id: 629d3c8ca62175a86f004259ab36f6671604c5b6ceb44c2cc32094e6d0b25323
---

# file: src/brontoCalendar/BrontoCalendarConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming testDb handles database dropping and client closing.
import BrontoCalendarConcept from "./BrontoCalendarConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("BrontoCalendarConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new BrontoCalendarConcept(db);

  // Define some common test data
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const classMath = "class:Math101" as ID;
  const classPhysics = "class:Physics200" as ID;

  // Helper to normalize dates for comparison (as done internally by the concept)
  const normalizeDate = (date: Date) => date.toISOString().split("T")[0];

  await t.step("should create a calendar for a user", async () => {
    const result = await concept.createCalendar({ user: userAlice });
    assertExists(result);
    assertEquals(typeof (result as { calendarId: ID }).calendarId, "string");

    const calendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(calendar);
    assertEquals(calendar.owner, userAlice);

    const errorResult = await concept.createCalendar({ user: userAlice });
    assertExists((errorResult as { error: string }).error);
    assertEquals((errorResult as { error: string }).error, `Calendar already exists for user ${userAlice}`);
  });

  await t.step("should create an assignment", async () => {
    const dueDate = new Date("2024-01-15T23:59:59Z");
    const result = await concept.createAssignment({ classId: classMath, name: "Homework 1", dueDate });
    assertExists(result);
    assertEquals(typeof (result as { assignmentId: ID }).assignmentId, "string");

    const assignment = await concept._getAssignment({ assignmentId: (result as { assignmentId: ID }).assignmentId });
    assertExists(assignment);
    assertEquals(assignment.name, "Homework 1");
    assertEquals(normalizeDate(assignment.dueDate), normalizeDate(dueDate));

    const invalidResult = await concept.createAssignment({ classId: classMath, name: "", dueDate });
    assertExists((invalidResult as { error: string }).error);
    assertEquals((invalidResult as { error: string }).error, "Invalid assignment data: classId, non-empty name, and valid dueDate are required.");
  });

  await t.step("should assign an assignment to a user's calendar", async () => {
    const aliceCalendarResult = await concept.createCalendar({ user: userAlice });
    const aliceCalendarId = (aliceCalendarResult as { calendarId: ID }).calendarId;

    const dueDate = new Date("2024-01-20T10:00:00Z");
    const assignmentResult = await concept.createAssignment({ classId: classMath, name: "Exam 1", dueDate });
    const assignmentId = (assignmentResult as { assignmentId: ID }).assignmentId;

    const assignResult = await concept.assignWork({ owner: userAlice, assignmentId });
    assertEquals(assignResult, {}); // Expect empty success result

    const assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: dueDate });
    assertEquals(assignmentsOnDay.length, 1);
    assertEquals(assignmentsOnDay[0]._id, assignmentId);

    // Test with non-existent calendar
    const errorResult = await concept.assignWork({ owner: "user:NonExistent" as ID, assignmentId });
    assertExists((errorResult as { error: string }).error);
    assertEquals((errorResult as { error: string }).error, `No calendar found for user user:NonExistent`);

    // Test with non-existent assignment
    const errorResult2 = await concept.assignWork({ owner: userAlice, assignmentId: "assignment:NonExistent" as ID });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals((errorResult2 as { error: string }).error, `Assignment with ID assignment:NonExistent not found in BrontoCalendar's state.`);
  });

  await t.step("should remove an assignment from a user's calendar", async () => {
    const bobCalendarResult = await concept.createCalendar({ user: userBob });
    const bobCalendarId = (bobCalendarResult as { calendarId: ID }).calendarId;

    const dueDate = new Date("2024-02-01T12:00:00Z");
    const assignmentResult = await concept.createAssignment({ classId: classPhysics, name: "Lab Report", dueDate });
    const assignmentId = (assignmentResult as { assignmentId: ID }).assignmentId;

    await concept.assignWork({ owner: userBob, assignmentId });

    let assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId: bobCalendarId, date: dueDate });
    assertEquals(assignmentsOnDay.length, 1);

    const removeResult = await concept.removeWork({ owner: userBob, assignmentId });
    assertEquals(removeResult, {});

    assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId: bobCalendarId, date: dueDate });
    assertEquals(assignmentsOnDay.length, 0);

    // Test removing non-existent assignment from calendar
    const errorResult = await concept.removeWork({ owner: userBob, assignmentId: "assignment:Another" as ID });
    assertExists((errorResult as { error: string }).error);
    assertArrayIncludes((errorResult as { error: string }).error.split(" "), ["not", "found"]);
  });

  await t.step("should update an assignment's due date and move it on the calendar", async () => {
    const aliceCalendar = (await concept._getCalendarForUser({ user: userAlice }))!;
    const aliceCalendarId = aliceCalendar._id;

    const originalDueDate = new Date("2024-03-05T09:00:00Z");
    const newDueDate = new Date("2024-03-10T11:00:00Z");

    const assignmentResult = await concept.createAssignment({ classId: classMath, name: "Quiz 3", dueDate: originalDueDate });
    const assignmentId = (assignmentResult as { assignmentId: ID }).assignmentId;
    await concept.assignWork({ owner: userAlice, assignmentId });

    // Verify initial state
    let assignmentsOnOldDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: originalDueDate });
    assertEquals(assignmentsOnOldDay.length, 1);
    assertEquals(assignmentsOnOldDay[0]._id, assignmentId);
    let assignmentsOnNewDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: newDueDate });
    assertEquals(assignmentsOnNewDay.length, 0);

    // Perform the update
    const updateResult = await concept.updateAssignmentDueDate({ owner: userAlice, assignmentId, newDueDate });
    assertEquals(updateResult, {});

    // Verify post-update state
    assignmentsOnOldDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: originalDueDate });
    assertEquals(assignmentsOnOldDay.length, 0, "Assignment should be removed from old due date.");
    assignmentsOnNewDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: newDueDate });
    assertEquals(assignmentsOnNewDay.length, 1, "Assignment should be present on new due date.");
    assertEquals(assignmentsOnNewDay[0]._id, assignmentId);

    const updatedAssignment = await concept._getAssignment({ assignmentId });
    assertEquals(normalizeDate(updatedAssignment!.dueDate), normalizeDate(newDueDate));

    // Test changing time but not date
    const sameDayNewTime = new Date("2024-03-10T14:00:00Z");
    await concept.updateAssignmentDueDate({ owner: userAlice, assignmentId, newDueDate: sameDayNewTime });
    assignmentsOnNewDay = await concept._getAssignmentsOnDay({ calendarId: aliceCalendarId, date: sameDayNewTime });
    assertEquals(assignmentsOnNewDay.length, 1, "Assignment should still be on the same date after time-only change.");
  });


  await t.step("should delete an assignment and remove it from calendars", async () => {
    const bobCalendar = (await concept._getCalendarForUser({ user: userBob }))!;
    const bobCalendarId = bobCalendar._id;

    const dueDate = new Date("2024-02-15T00:00:00Z");
    const assignmentResult = await concept.createAssignment({ classId: classPhysics, name: "Homework 2", dueDate });
    const assignmentId = (assignmentResult as { assignmentId: ID }).assignmentId;
    await concept.assignWork({ owner: userBob, assignmentId });

    let assignmentInDb = await concept._getAssignment({ assignmentId });
    assertExists(assignmentInDb);
    let assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId: bobCalendarId, date: dueDate });
    assertEquals(assignmentsOnDay.length, 1);

    const deleteResult = await concept.deleteAssignment({ assignmentId });
    assertEquals(deleteResult, {});

    assignmentInDb = await concept._getAssignment({ assignmentId });
    assertEquals(assignmentInDb, null, "Assignment should be deleted from assignments collection.");
    assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId: bobCalendarId, date: dueDate });
    assertEquals(assignmentsOnDay.length, 0, "Assignment should be removed from calendar day.");

    const errorResult = await concept.deleteAssignment({ assignmentId: "assignment:nonexistent" as ID });
    assertExists((errorResult as { error: string }).error);
    assertEquals((errorResult as { error: string }).error, `Assignment with ID assignment:nonexistent not found.`);
  });

  await t.step("should create office hours", async () => {
    const startTime = new Date("2024-01-25T14:00:00Z");
    const duration = 60;
    const result = await concept.createOfficeHours({ classId: classMath, startTime, duration });
    assertExists(result);
    assertEquals(typeof (result as { officeHoursId: ID }).officeHoursId, "string");

    const oh = await concept._getOfficeHours({ officeHoursId: (result as { officeHoursId: ID }).officeHoursId });
    assertExists(oh);
    assertEquals(oh.duration, duration);
  });

  await t.step("should assign office hours to a user's calendar", async () => {
    const aliceCalendar = (await concept._getCalendarForUser({ user: userAlice }))!;
    const aliceCalendarId = aliceCalendar._id;

    const startTime = new Date("2024-01-26T15:00:00Z");
    const officeHoursResult = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: 90 });
    const officeHoursId = (officeHoursResult as { officeHoursId: ID }).officeHoursId;

    await concept.assignOH({ owner: userAlice, officeHoursId });

    const ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: startTime });
    assertEquals(ohOnDay.length, 1);
    assertEquals(ohOnDay[0]._id, officeHoursId);
  });

  await t.step("should change office hours and move them on the calendar if date changes", async () => {
    const aliceCalendar = (await concept._getCalendarForUser({ user: userAlice }))!;
    const aliceCalendarId = aliceCalendar._id;

    const originalStartTime = new Date("2024-02-10T10:00:00Z");
    const newStartTime = new Date("2024-02-12T11:00:00Z");
    const newDuration = 75;

    const ohResult = await concept.createOfficeHours({ classId: classMath, startTime: originalStartTime, duration: 60 });
    const officeHoursId = (ohResult as { officeHoursId: ID }).officeHoursId;
    await concept.assignOH({ owner: userAlice, officeHoursId });

    // Verify initial state
    let ohOnOldDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: originalStartTime });
    assertEquals(ohOnOldDay.length, 1);
    assertEquals(ohOnOldDay[0]._id, officeHoursId);
    let ohOnNewDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: newStartTime });
    assertEquals(ohOnNewDay.length, 0);

    // Perform the update
    const changeResult = await concept.changeOH({ owner: userAlice, officeHoursId, newDate: newStartTime, newDuration });
    assertEquals(changeResult, {});

    // Verify post-update state
    ohOnOldDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: originalStartTime });
    assertEquals(ohOnOldDay.length, 0, "Office hours should be removed from old day.");
    ohOnNewDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: newStartTime });
    assertEquals(ohOnNewDay.length, 1, "Office hours should be present on new day.");
    assertEquals(ohOnNewDay[0]._id, officeHoursId);

    const updatedOH = await concept._getOfficeHours({ officeHoursId });
    assertEquals(normalizeDate(updatedOH!.startTime), normalizeDate(newStartTime));
    assertEquals(updatedOH!.duration, newDuration);

    // Test changing only duration on the same day
    const sameDayNewDuration = 90;
    const sameDayNewTime = new Date("2024-02-12T13:00:00Z"); // Change time on same day
    await concept.changeOH({ owner: userAlice, officeHoursId, newDate: sameDayNewTime, newDuration: sameDayNewDuration });
    ohOnNewDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: sameDayNewTime });
    assertEquals(ohOnNewDay.length, 1);
    const updatedOH2 = await concept._getOfficeHours({ officeHoursId });
    assertEquals(normalizeDate(updatedOH2!.startTime), normalizeDate(sameDayNewTime));
    assertEquals(updatedOH2!.duration, sameDayNewDuration);

    // Test error cases
    const errorNoCalendar = await concept.changeOH({ owner: "user:unknown" as ID, officeHoursId, newDate: new Date(), newDuration: 30 });
    assertExists((errorNoCalendar as { error: string }).error);
    assertEquals((errorNoCalendar as { error: string }).error, `No calendar found for user user:unknown`);

    const errorNoOH = await concept.changeOH({ owner: userAlice, officeHoursId: "oh:bad" as ID, newDate: new Date(), newDuration: 30 });
    assertExists((errorNoOH as { error: string }).error);
    assertEquals((errorNoOH as { error: string }).error, `Office hours with ID oh:bad not found in BrontoCalendar's state.`);

    const errorNegativeDuration = await concept.changeOH({ owner: userAlice, officeHoursId, newDate: new Date(), newDuration: -10 });
    assertExists((errorNegativeDuration as { error: string }).error);
    assertEquals((errorNegativeDuration as { error: string }).error, `New duration must be non-negative`);
  });

  await t.step("should delete office hours and remove them from calendars", async () => {
    const bobCalendar = (await concept._getCalendarForUser({ user: userBob }))!;
    const bobCalendarId = bobCalendar._id;

    const startTime = new Date("2024-02-20T16:00:00Z");
    const ohResult = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: 45 });
    const officeHoursId = (ohResult as { officeHoursId: ID }).officeHoursId;
    await concept.assignOH({ owner: userBob, officeHoursId });

    let ohInDb = await concept._getOfficeHours({ officeHoursId });
    assertExists(ohInDb);
    let ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: bobCalendarId, date: startTime });
    assertEquals(ohOnDay.length, 1);

    const deleteResult = await concept.deleteOfficeHours({ officeHoursId });
    assertEquals(deleteResult, {});

    ohInDb = await concept._getOfficeHours({ officeHoursId });
    assertEquals(ohInDb, null, "Office hours should be deleted from officeHours collection.");
    ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: bobCalendarId, date: startTime });
    assertEquals(ohOnDay.length, 0, "Office hours should be removed from calendar day.");

    const errorResult = await concept.deleteOfficeHours({ officeHoursId: "oh:nonexistent" as ID });
    assertExists((errorResult as { error: string }).error);
    assertEquals((errorResult as { error: string }).error, `Office hours with ID oh:nonexistent not found.`);
  });


  await t.step("should fulfill the principle: create, assign, query, and move an assignment", async () => {
    // 1. Setup: Create a user and their calendar
    const principleUser = "user:PrincipleTestUser" as ID;
    const createCalResult = await concept.createCalendar({ user: principleUser });
    assertNotEquals((createCalResult as { error: string }).error, `Calendar already exists for user ${principleUser}`); // Ensure it's a new calendar
    const principleCalendarId = (createCalResult as { calendarId: ID }).calendarId;
    assertExists(principleCalendarId);

    // 2. Create an assignment
    const initialDueDate = new Date("2024-04-01T10:00:00Z");
    const createAssignmentResult = await concept.createAssignment({ classId: classMath, name: "Principle Assignment", dueDate: initialDueDate });
    const principleAssignmentId = (createAssignmentResult as { assignmentId: ID }).assignmentId;
    assertExists(principleAssignmentId);

    // 3. Assign the assignment to the calendar
    const assignResult = await concept.assignWork({ owner: principleUser, assignmentId: principleAssignmentId });
    assertEquals(assignResult, {}); // Expect success

    // 4. Query that day and find the assignment listed
    const assignmentsOnInitialDay = await concept._getAssignmentsOnDay({ calendarId: principleCalendarId, date: initialDueDate });
    assertEquals(assignmentsOnInitialDay.length, 1);
    assertEquals(assignmentsOnInitialDay[0]._id, principleAssignmentId);
    assertEquals(assignmentsOnInitialDay[0].name, "Principle Assignment");

    // 5. Change the assignment's due date
    const updatedDueDate = new Date("2024-04-05T14:30:00Z");
    const updateAssignmentResult = await concept.updateAssignmentDueDate({ owner: principleUser, assignmentId: principleAssignmentId, newDueDate: updatedDueDate });
    assertEquals(updateAssignmentResult, {}); // Expect success

    // 6. Verify it moved: old day should be empty, new day should have it
    const assignmentsOnOldDayAfterMove = await concept._getAssignmentsOnDay({ calendarId: principleCalendarId, date: initialDueDate });
    assertEquals(assignmentsOnOldDayAfterMove.length, 0, "Assignment should be removed from the original due date.");

    const assignmentsOnNewDayAfterMove = await concept._getAssignmentsOnDay({ calendarId: principleCalendarId, date: updatedDueDate });
    assertEquals(assignmentsOnNewDayAfterMove.length, 1, "Assignment should be listed on the new due date.");
    assertEquals(assignmentsOnNewDayAfterMove[0]._id, principleAssignmentId);
    assertEquals(assignmentsOnNewDayAfterMove[0].name, "Principle Assignment");

    // Ensure the assignment object itself has the updated due date
    const finalAssignmentState = await concept._getAssignment({ assignmentId: principleAssignmentId });
    assertExists(finalAssignmentState);
    assertEquals(normalizeDate(finalAssignmentState.dueDate), normalizeDate(updatedDueDate));
  });

  await client.close();
});
```
