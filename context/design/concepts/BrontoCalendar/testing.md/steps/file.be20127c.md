---
timestamp: 'Thu Oct 16 2025 11:21:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_112123.a9147042.md]]'
content_id: be20127c337f935c34fb3e70c7ebc87f4e31bf4ee2bcfb48cec5fe6fc730ce49
---

# file: src/brontoCalendar/BrontoCalendarConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists, assertObjectMatch, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts provides `testDb()`
import BrontoCalendarConcept from "./BrontoCalendarConcept.ts";
import { ID, Empty } from "@utils/types.ts";

Deno.test("BrontoCalendarConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new BrontoCalendarConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const classCS101 = "class:CS101" as ID;
  const classMATH200 = "class:MATH200" as ID;

  await t.step("creates a calendar for a user", async () => {
    const result = await concept.createCalendar({ user: userAlice });
    assertExists(result);
    assertObjectMatch(result, { calendarId: assertExists });
    const { calendarId } = result as { calendarId: ID };

    const calendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(calendar);
    assertEquals(calendar._id, calendarId);
    assertEquals(calendar.owner, userAlice);
  });

  await t.step("prevents creating a duplicate calendar for the same user", async () => {
    const result = await concept.createCalendar({ user: userAlice });
    assertObjectMatch(result, { error: "Calendar already exists for user user:Alice" });
  });

  await t.step("creates an assignment", async () => {
    const dueDate = new Date("2023-11-15T23:59:59Z");
    const result = await concept.createAssignment({ classId: classCS101, name: "Homework 1", dueDate });
    assertExists(result);
    assertObjectMatch(result, { assignmentId: assertExists });
    const { assignmentId } = result as { assignmentId: ID };

    const assignment = await concept._getAssignment({ assignmentId });
    assertExists(assignment);
    assertEquals(assignment._id, assignmentId);
    assertEquals(assignment.name, "Homework 1");
    assertEquals(assignment.classId, classCS101);
    assertEquals(assignment.dueDate.toISOString(), dueDate.toISOString());
  });

  await t.step("assigns an assignment to a user's calendar", async () => {
    // Re-fetch calendarId for userAlice, assuming it was created in a prior step
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    // Create an assignment
    const assignmentDueDate = new Date("2023-11-20T10:00:00Z");
    const createAssignResult = await concept.createAssignment({
      classId: classCS101,
      name: "Final Project",
      dueDate: assignmentDueDate,
    });
    assertExists(createAssignResult);
    const { assignmentId: finalProjectAssignmentId } = createAssignResult as { assignmentId: ID };

    // Assign it to Alice's calendar
    const assignResult = await concept.assignWork({ owner: userAlice, assignmentId: finalProjectAssignmentId });
    assertObjectMatch(assignResult, {}); // Expect Empty result

    // Verify it's on Alice's calendar for the correct day
    const assignmentsOnDay = await concept._getAssignmentsOnDay({
      calendarId: aliceCalendarId,
      date: assignmentDueDate,
    });
    assertEquals(assignmentsOnDay.length, 1);
    assertEquals(assignmentsOnDay[0]._id, finalProjectAssignmentId);
    assertEquals(assignmentsOnDay[0].name, "Final Project");
  });

  await t.step("fails to assign work if calendar or assignment not found", async () => {
    const nonExistentUser = "user:NonExistent" as ID;
    const nonExistentAssignment = "assignment:NonExistent" as ID;

    const result1 = await concept.assignWork({ owner: nonExistentUser, assignmentId: nonExistentAssignment });
    assertObjectMatch(result1, { error: `No calendar found for user ${nonExistentUser}` });

    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar); // Assuming Alice's calendar exists

    const result2 = await concept.assignWork({ owner: userAlice, assignmentId: nonExistentAssignment });
    assertObjectMatch(result2, { error: `Assignment with ID ${nonExistentAssignment} not found in BrontoCalendar's state.` });
  });

  await t.step("removes an assignment from a user's calendar", async () => {
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    const assignmentDueDate = new Date("2023-12-01T10:00:00Z");
    const createAssignResult = await concept.createAssignment({
      classId: classMATH200,
      name: "Midterm Review",
      dueDate: assignmentDueDate,
    });
    assertExists(createAssignResult);
    const { assignmentId: midtermAssignmentId } = createAssignResult as { assignmentId: ID };

    await concept.assignWork({ owner: userAlice, assignmentId: midtermAssignmentId });

    let assignmentsOnDay = await concept._getAssignmentsOnDay({
      calendarId: aliceCalendarId,
      date: assignmentDueDate,
    });
    assertEquals(assignmentsOnDay.length, 1);

    const removeResult = await concept.removeWork({ owner: userAlice, assignmentId: midtermAssignmentId });
    assertObjectMatch(removeResult, {});

    assignmentsOnDay = await concept._getAssignmentsOnDay({
      calendarId: aliceCalendarId,
      date: assignmentDueDate,
    });
    assertEquals(assignmentsOnDay.length, 0);
  });

  await t.step("creates office hours", async () => {
    const startTime = new Date("2023-11-25T14:00:00Z");
    const result = await concept.createOfficeHours({ classId: classCS101, startTime, duration: 60 });
    assertExists(result);
    assertObjectMatch(result, { officeHoursId: assertExists });
    const { officeHoursId } = result as { officeHoursId: ID };

    const oh = await concept._getOfficeHours({ officeHoursId });
    assertExists(oh);
    assertEquals(oh._id, officeHoursId);
    assertEquals(oh.startTime.toISOString(), startTime.toISOString());
    assertEquals(oh.duration, 60);
    assertEquals(oh.classId, classCS101);
  });

  await t.step("assigns office hours to a user's calendar", async () => {
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    const ohStartTime = new Date("2023-11-25T14:00:00Z");
    const createOHResult = await concept.createOfficeHours({
      classId: classCS101,
      startTime: ohStartTime,
      duration: 90,
    });
    assertExists(createOHResult);
    const { officeHoursId: newOhId } = createOHResult as { officeHoursId: ID };

    const assignOHResult = await concept.assignOH({ owner: userAlice, officeHoursId: newOhId });
    assertObjectMatch(assignOHResult, {});

    const ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: ohStartTime });
    assertEquals(ohOnDay.length, 1);
    assertEquals(ohOnDay[0]._id, newOhId);
  });

  await t.step("changes existing office hours, moving them to a new day if date changes", async () => {
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    // Create initial office hours on Nov 26th
    const originalStartTime = new Date("2023-11-26T10:00:00Z");
    const createOHResult = await concept.createOfficeHours({
      classId: classMATH200,
      startTime: originalStartTime,
      duration: 60,
    });
    assertExists(createOHResult);
    const { officeHoursId: changeableOhId } = createOHResult as { officeHoursId: ID };
    await concept.assignOH({ owner: userAlice, officeHoursId: changeableOhId });

    // Verify initial state
    let ohsOnOriginalDay = await concept._getOfficeHoursOnDay({
      calendarId: aliceCalendarId,
      date: originalStartTime,
    });
    assertEquals(ohsOnOriginalDay.length, 1);
    assertEquals(ohsOnOriginalDay[0]._id, changeableOhId);

    // Change office hours to Nov 27th with new duration
    const newStartTime = new Date("2023-11-27T15:30:00Z");
    const newDuration = 75;
    const changeResult = await concept.changeOH({
      owner: userAlice,
      officeHoursId: changeableOhId,
      newDate: newStartTime,
      newDuration: newDuration,
    });
    assertObjectMatch(changeResult, {});

    // Verify the office hours document itself is updated
    const updatedOh = await concept._getOfficeHours({ officeHoursId: changeableOhId });
    assertExists(updatedOh);
    assertEquals(updatedOh.startTime.toISOString(), newStartTime.toISOString());
    assertEquals(updatedOh.duration, newDuration);

    // Verify it's removed from the old day
    ohsOnOriginalDay = await concept._getOfficeHoursOnDay({
      calendarId: aliceCalendarId,
      date: originalStartTime,
    });
    assertEquals(ohsOnOriginalDay.length, 0);

    // Verify it's added to the new day
    const ohsOnNewDay = await concept._getOfficeHoursOnDay({
      calendarId: aliceCalendarId,
      date: newStartTime,
    });
    assertEquals(ohsOnNewDay.length, 1);
    assertEquals(ohsOnNewDay[0]._id, changeableOhId);
  });

  await t.step("removes office hours entirely", async () => {
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    const ohStartTime = new Date("2023-11-28T11:00:00Z");
    const createOHResult = await concept.createOfficeHours({
      classId: classCS101,
      startTime: ohStartTime,
      duration: 45,
    });
    assertExists(createOHResult);
    const { officeHoursId: deletableOhId } = createOHResult as { officeHoursId: ID };
    await concept.assignOH({ owner: userAlice, officeHoursId: deletableOhId });

    let ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: ohStartTime });
    assertEquals(ohOnDay.length, 1);

    const deleteResult = await concept.deleteOfficeHours({ officeHoursId: deletableOhId });
    assertObjectMatch(deleteResult, {});

    // Verify office hours document is gone
    const deletedOh = await concept._getOfficeHours({ officeHoursId: deletableOhId });
    assertEquals(deletedOh, null);

    // Verify it's removed from the calendar day
    ohOnDay = await concept._getOfficeHoursOnDay({ calendarId: aliceCalendarId, date: ohStartTime });
    assertEquals(ohOnDay.length, 0);
  });

  await t.step("deletes an assignment entirely", async () => {
    const aliceCalendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(aliceCalendar);
    const aliceCalendarId = aliceCalendar._id;

    const assignmentDueDate = new Date("2023-12-05T10:00:00Z");
    const createAssignResult = await concept.createAssignment({
      classId: classCS101,
      name: "Report",
      dueDate: assignmentDueDate,
    });
    assertExists(createAssignResult);
    const { assignmentId: deletableAssignmentId } = createAssignResult as { assignmentId: ID };
    await concept.assignWork({ owner: userAlice, assignmentId: deletableAssignmentId });

    let assignmentsOnDay = await concept._getAssignmentsOnDay({
      calendarId: aliceCalendarId,
      date: assignmentDueDate,
    });
    assertEquals(assignmentsOnDay.length, 1);

    const deleteResult = await concept.deleteAssignment({ assignmentId: deletableAssignmentId });
    assertObjectMatch(deleteResult, {});

    // Verify assignment document is gone
    const deletedAssignment = await concept._getAssignment({ assignmentId: deletableAssignmentId });
    assertEquals(deletedAssignment, null);

    // Verify it's removed from the calendar day
    assignmentsOnDay = await concept._getAssignmentsOnDay({
      calendarId: aliceCalendarId,
      date: assignmentDueDate,
    });
    assertEquals(assignmentsOnDay.length, 0);
  });

  await t.step("principle fulfillment trace: assignment moves on calendar when due date changes", async () => {
    // 1. User Alice creates her calendar
    const createCalendarResult = await concept.createCalendar({ user: userBob }); // Use Bob to avoid conflicts with Alice's existing calendar
    assertObjectMatch(createCalendarResult, { calendarId: assertExists });
    const { calendarId: bobCalendarId } = createCalendarResult as { calendarId: ID };

    // 2. Alice creates an assignment
    const initialDueDate = new Date("2023-12-10T17:00:00Z");
    const createAssignResult = await concept.createAssignment({
      classId: classCS101,
      name: "Homework 3",
      dueDate: initialDueDate,
    });
    assertObjectMatch(createAssignResult, { assignmentId: assertExists });
    const { assignmentId: hw3Id } = createAssignResult as { assignmentId: ID };

    // 3. Alice assigns the assignment to her calendar
    const assignWorkResult = await concept.assignWork({ owner: userBob, assignmentId: hw3Id });
    assertObjectMatch(assignWorkResult, {});

    // Query initial day - should have the assignment
    let assignmentsOnInitialDay = await concept._getAssignmentsOnDay({
      calendarId: bobCalendarId,
      date: initialDueDate,
    });
    assertEquals(assignmentsOnInitialDay.length, 1);
    assertEquals(assignmentsOnInitialDay[0]._id, hw3Id);
    console.log(`Initial: Assignment ${hw3Id} found on ${initialDueDate.toISOString().split('T')[0]}`);


    // 4. Change the assignment's due date
    const newDueDate = new Date("2023-12-12T23:59:59Z");
    // To change assignment's due date, we need a specific action. The spec doesn't have one,
    // so I'll add an action `changeAssignmentDueDate` for demonstration purposes,
    // or simulate it by modifying the assignment and then re-assigning/handling the move.
    // For now, I'll simulate an internal change, and then verify the calendar reflects it.
    // In a real concept, an `updateAssignment` action would handle this.
    // For this principle, it's about *how the calendar reflects changes to assignments*.

    // **Simulating `updateAssignmentDueDate` internal to BrontoCalendar**
    await db.collection("BrontoCalendar.assignments").updateOne(
      { _id: hw3Id },
      { $set: { dueDate: newDueDate } }
    );
    // The concept's `assignWork` implicitly handles moving if the due date changes
    // because it uses the assignment's current `dueDate` to determine the calendar day.
    // So, we just need to re-call `assignWork` or ensure internal logic handles this.
    // My `assignWork` doesn't automatically move; it only adds.
    // So, a `changeAssignmentDueDate` action would be necessary.
    // Since it's not in the spec, I'll refine the `principle` and manually implement the required logic.

    // Principle: "If the assignment's due date is then changed, it will automatically move to the new day on the calendar"
    // My current `assignWork` doesn't implement "automatically move". It adds to a day based on its *current* dueDate.
    // To fulfill this principle, I need an action that *updates* an assignment's dueDate and ensures its calendar entry is moved.
    // Let's add an action `changeAssignmentDueDate` to the concept to support the principle directly.

    // If I cannot modify the concept's actions, then the principle must be interpreted differently:
    // "After assignment is updated *externally*, you'd need to `removeWork` and `assignWork` again."
    // This contradicts "automatically move".

    // Okay, I will add an `updateAssignmentDueDate` action for principle fulfillment.

    // 5. Update assignment's due date
    // This action would internally handle removing from old day and adding to new.
    await concept.updateAssignmentDueDate({ owner: userBob, assignmentId: hw3Id, newDueDate: newDueDate });

    // Verify it's removed from the old day
    assignmentsOnInitialDay = await concept._getAssignmentsOnDay({
      calendarId: bobCalendarId,
      date: initialDueDate,
    });
    assertEquals(assignmentsOnInitialDay.length, 0);
    console.log(`After update: Assignment ${hw3Id} removed from old day ${initialDueDate.toISOString().split('T')[0]}`);

    // Verify it's added to the new day
    const assignmentsOnNewDay = await concept._getAssignmentsOnDay({
      calendarId: bobCalendarId,
      date: newDueDate,
    });
    assertEquals(assignmentsOnNewDay.length, 1);
    assertEquals(assignmentsOnNewDay[0]._id, hw3Id);
    assertEquals(assignmentsOnNewDay[0].dueDate.toISOString(), newDueDate.toISOString());
    console.log(`After update: Assignment ${hw3Id} found on new day ${newDueDate.toISOString().split('T')[0]}`);

  }); // End of principle fulfillment trace

  await client.close();
});
```
