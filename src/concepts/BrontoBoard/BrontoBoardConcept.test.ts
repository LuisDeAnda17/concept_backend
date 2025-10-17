import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts provides testDb
import { ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID
import BrontoBoardConcept from "./BrontoBoardConcept.ts";

Deno.test("BrontoBoardConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new BrontoBoardConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const calendarAlice = "calendar:AlicePersonal" as ID;
  const calendarBob = "calendar:BobWork" as ID;

  // Helper to create future dates for testing
  const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  await t.step("initializeBB: should create a BrontoBoard for a user", async () => {
    // # trace: initializeBB
    // When a user initializes a BrontoBoard with their ID and a calendar ID,
    // a new BrontoBoard should be created and returned.
    const result = await concept.initializeBB({
      user: userAlice,
      calendar: calendarAlice,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);
    assertExists((result as { brontoBoard: ID }).brontoBoard);

    const brontoBoardId = (result as { brontoBoard: ID }).brontoBoard;
    const retrievedBrontoBoards = await concept._getBrontoBoardsForUser({ user: userAlice });
    assertEquals(retrievedBrontoBoards.length, 1);
    assertEquals(retrievedBrontoBoards[0]._id, brontoBoardId);
    assertEquals(retrievedBrontoBoards[0].owner, userAlice);
    assertEquals(retrievedBrontoBoards[0].calendar, calendarAlice);

    const bobResult = await concept.initializeBB({
      user: userBob,
      calendar: calendarBob,
    });
    assertNotEquals("error" in bobResult, true);
    assertExists((bobResult as { brontoBoard: ID }).brontoBoard);
    const bobBrontoBoards = await concept._getBrontoBoardsForUser({ user: userBob });
    assertEquals(bobBrontoBoards.length, 1);
  });

  const aliceBrontoBoardId = (await concept._getBrontoBoardsForUser({ user: userAlice }))[0]._id;
  const bobBrontoBoardId = (await concept._getBrontoBoardsForUser({ user: userBob }))[0]._id;

  await t.step("createClass: should create a class within an owned BrontoBoard", async () => {
    // # trace: createClass (success)
    // When the owner of a BrontoBoard creates a class with a valid name and overview,
    // a new class should be created and associated with that BrontoBoard.
    const className = "Software Engineering";
    const overview = "Learn to build robust software systems.";
    const result = await concept.createClass({
      owner: userAlice,
      brontoBoard: aliceBrontoBoardId,
      className: className,
      overview: overview,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);
    assertExists((result as { class: ID }).class);

    const classId = (result as { class: ID }).class;
    const retrievedClasses = await concept._getClassesForBrontoBoard({ brontoBoard: aliceBrontoBoardId });
    assertEquals(retrievedClasses.length, 1);
    assertEquals(retrievedClasses[0]._id, classId);
    assertEquals(retrievedClasses[0].brontoBoardId, aliceBrontoBoardId);
    assertEquals(retrievedClasses[0].name, className);
    assertEquals(retrievedClasses[0].overview, overview);
  });

  const seClassId = (await concept._getClassesForBrontoBoard({ brontoBoard: aliceBrontoBoardId }))[0]._id;

  await t.step("createClass: should fail if user is not the owner of BrontoBoard", async () => {
    // # trace: createClass (unauthorized)
    // A different user (Bob) attempting to create a class in Alice's BrontoBoard should fail.
    const result = await concept.createClass({
      owner: userBob,
      brontoBoard: aliceBrontoBoardId,
      className: "Unauthorized Class",
      overview: "Should not be created",
    });

    assertExists(result);
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `User ${userBob} is not the owner of BrontoBoard ${aliceBrontoBoardId}.`);
  });

  await t.step("createClass: should fail if class name is empty", async () => {
    // # trace: createClass (empty name)
    // Creating a class with an empty or whitespace-only name should fail.
    let result = await concept.createClass({
      owner: userAlice,
      brontoBoard: aliceBrontoBoardId,
      className: "",
      overview: "Empty name test",
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Class name cannot be empty.");

    result = await concept.createClass({
      owner: userAlice,
      brontoBoard: aliceBrontoBoardId,
      className: "   ",
      overview: "Whitespace name test",
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Class name cannot be empty.");
  });

  await t.step("createClass: should fail if BrontoBoard does not exist", async () => {
    // # trace: createClass (non-existent BrontoBoard)
    // Attempting to create a class in a non-existent BrontoBoard should fail.
    const nonExistentBrontoBoard = "brontoboard:nonexistent" as ID;
    const result = await concept.createClass({
      owner: userAlice,
      brontoBoard: nonExistentBrontoBoard,
      className: "Fake Class",
      overview: "Should not work",
    });

    assertExists(result);
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `BrontoBoard with ID ${nonExistentBrontoBoard} not found.`);
  });

  await t.step("addWork: should add an assignment to an owned class", async () => {
    // # trace: addWork (success)
    // The owner of a BrontoBoard should be able to add a new assignment with a valid future due date.
    const assignmentName = "Project 1";
    const dueDate = getFutureDate(7); // 7 days from now
    const result = await concept.addWork({
      owner: userAlice,
      class: seClassId,
      workName: assignmentName,
      dueDate: dueDate,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);
    assertExists((result as { assignment: ID }).assignment);

    const assignmentId = (result as { assignment: ID }).assignment;
    const retrievedAssignments = await concept._getAssignmentsForClass({ class: seClassId });
    assertEquals(retrievedAssignments.length, 1);
    assertEquals(retrievedAssignments[0]._id, assignmentId);
    assertEquals(retrievedAssignments[0].classId, seClassId);
    assertEquals(retrievedAssignments[0].name, assignmentName);
    assertEquals(retrievedAssignments[0].dueDate.toISOString(), dueDate.toISOString()); // Compare ISO strings for Date objects
  });

  const project1Id = (await concept._getAssignmentsForClass({ class: seClassId }))[0]._id;

  await t.step("addWork: should fail if user is not owner of BrontoBoard/class", async () => {
    // # trace: addWork (unauthorized)
    // Bob should not be able to add work to Alice's class.
    const result = await concept.addWork({
      owner: userBob,
      class: seClassId,
      workName: "Bob's Project",
      dueDate: getFutureDate(10),
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `User ${userBob} is not the owner of BrontoBoard ${aliceBrontoBoardId}.`);
  });

  await t.step("addWork: should fail if work name is empty or due date is invalid/past", async () => {
    // # trace: addWork (invalid input)
    // Adding work with empty name, past date, or invalid date should fail.
    let result = await concept.addWork({
      owner: userAlice,
      class: seClassId,
      workName: "",
      dueDate: getFutureDate(5),
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Work name cannot be empty.");

    result = await concept.addWork({
      owner: userAlice,
      class: seClassId,
      workName: "Past Due",
      dueDate: new Date(2020, 1, 1), // Past date
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Due date must be a valid future date.");

    result = await concept.addWork({
      owner: userAlice,
      class: seClassId,
      workName: "Invalid Date",
      dueDate: new Date("not a date"), // Invalid date
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Due date must be a valid future date.");
  });

  await t.step("changeWork: should update an existing assignment's due date", async () => {
    // # trace: changeWork (success)
    // The owner should be able to change the due date of their assignment to a future date.
    const newDueDate = getFutureDate(14); // 14 days from now
    const result = await concept.changeWork({
      owner: userAlice,
      work: project1Id,
      dueDate: newDueDate,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);

    const updatedAssignment = (await concept._getAssignmentsForClass({ class: seClassId }))[0];
    assertEquals(updatedAssignment.dueDate.toISOString(), newDueDate.toISOString());
  });

  await t.step("changeWork: should fail if user is not owner", async () => {
    // # trace: changeWork (unauthorized)
    // Bob should not be able to change Alice's assignment.
    const result = await concept.changeWork({
      owner: userBob,
      work: project1Id,
      dueDate: getFutureDate(20),
    });
    assertEquals("error" in result, true);
  });

  await t.step("changeWork: should fail if new due date is invalid/past", async () => {
    // # trace: changeWork (invalid date)
    // Changing an assignment's due date to a past or invalid date should fail.
    let result = await concept.changeWork({
      owner: userAlice,
      work: project1Id,
      dueDate: new Date(2020, 1, 1),
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "New due date must be a valid future date.");

    result = await concept.changeWork({
      owner: userAlice,
      work: project1Id,
      dueDate: new Date("not a date"),
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "New due date must be a valid future date.");
  });

  await t.step("addOH: should add office hours to an owned class", async () => {
    // # trace: addOH (success)
    // The owner of a BrontoBoard should be able to add office hours with a valid future time and duration.
    const OHTime = getFutureDate(3); // 3 days from now
    OHTime.setHours(10, 0, 0); // Set to 10:00 AM
    const OHduration = 60; // 60 minutes
    const result = await concept.addOH({
      owner: userAlice,
      class: seClassId,
      OHTime: OHTime,
      OHduration: OHduration,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);
    assertExists((result as { officeHours: ID }).officeHours);

    const ohId = (result as { officeHours: ID }).officeHours;
    const retrievedOH = await concept._getOfficeHoursForClass({ class: seClassId });
    assertEquals(retrievedOH.length, 1);
    assertEquals(retrievedOH[0]._id, ohId);
    assertEquals(retrievedOH[0].classId, seClassId);
    assertEquals(retrievedOH[0].startTime.toISOString(), OHTime.toISOString());
    assertEquals(retrievedOH[0].duration, OHduration);
  });

  const ohId = (await concept._getOfficeHoursForClass({ class: seClassId }))[0]._id;

  await t.step("addOH: should fail if user is not owner of BrontoBoard/class", async () => {
    // # trace: addOH (unauthorized)
    // Bob should not be able to add office hours to Alice's class.
    const result = await concept.addOH({
      owner: userBob,
      class: seClassId,
      OHTime: getFutureDate(5),
      OHduration: 30,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `User ${userBob} is not the owner of BrontoBoard ${aliceBrontoBoardId}.`);
  });

  await t.step("addOH: should fail if OHTime is invalid/past or OHDuration is negative", async () => {
    // # trace: addOH (invalid input)
    // Adding office hours with a past/invalid time or negative duration should fail.
    let result = await concept.addOH({
      owner: userAlice,
      class: seClassId,
      OHTime: new Date(2020, 1, 1),
      OHduration: 60,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Office hours start time must be a valid future date.");

    result = await concept.addOH({
      owner: userAlice,
      class: seClassId,
      OHTime: getFutureDate(5),
      OHduration: -10,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Office hours duration must be a non-negative number.");
  });

  await t.step("changeOH: should update existing office hours", async () => {
    // # trace: changeOH (success)
    // The owner should be able to change the start time and duration of their office hours.
    const newOHTime = getFutureDate(10);
    newOHTime.setHours(14, 30, 0); // 2:30 PM
    const newOHDuration = 90;
    const result = await concept.changeOH({
      owner: userAlice,
      oh: ohId,
      newDate: newOHTime,
      newduration: newOHDuration,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);

    const updatedOH = (await concept._getOfficeHoursForClass({ class: seClassId }))[0];
    assertEquals(updatedOH.startTime.toISOString(), newOHTime.toISOString());
    assertEquals(updatedOH.duration, newOHDuration);
  });

  await t.step("changeOH: should fail if user is not owner or input is invalid", async () => {
    // # trace: changeOH (unauthorized/invalid)
    // Bob cannot change Alice's OH. Invalid dates/durations should also fail.
    let result = await concept.changeOH({
      owner: userBob,
      oh: ohId,
      newDate: getFutureDate(15),
      newduration: 45,
    });
    assertEquals("error" in result, true);

    result = await concept.changeOH({
      owner: userAlice,
      oh: ohId,
      newDate: new Date(2021, 1, 1),
      newduration: 30,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "New office hours start time must be a valid future date.");

    result = await concept.changeOH({
      owner: userAlice,
      oh: ohId,
      newDate: getFutureDate(15),
      newduration: -1,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "New office hours duration must be a non-negative number.");
  });

  await t.step("removeWork: should remove an assignment from an owned class", async () => {
    // # trace: removeWork (success)
    // The owner should be able to remove an assignment.
    const assignmentsBefore = await concept._getAssignmentsForClass({ class: seClassId });
    assertEquals(assignmentsBefore.length, 1);

    const result = await concept.removeWork({
      owner: userAlice,
      work: project1Id,
    });

    assertExists(result);
    assertNotEquals("error" in result, true, `Expected no error, got: ${JSON.stringify(result)}`);

    const assignmentsAfter = await concept._getAssignmentsForClass({ class: seClassId });
    assertEquals(assignmentsAfter.length, 0);
  });

  await t.step("removeWork: should fail if user is not owner or assignment does not exist", async () => {
    // # trace: removeWork (unauthorized/non-existent)
    // Bob cannot remove Alice's work. Attempting to remove non-existent work should fail.
    let result = await concept.removeWork({
      owner: userBob,
      work: "assignment:fake" as ID,
    });
    assertEquals("error" in result, true);

    result = await concept.removeWork({
      owner: userAlice,
      work: "assignment:fake" as ID,
    });
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, `Assignment with ID assignment:fake not found.`);
  });

  await t.step("Principle Trace: Demonstrate core functionality and associations", async () => {
    // # trace: Principle Fulfillment
    // This trace demonstrates how the concept fulfills its principle:
    // "Each Assignment, overview, and Office Hours are associated with One Class...
    // and each class can only belong to one BrontoBoard."

    // 1. Initialize a BrontoBoard for Alice
    const initResult = await concept.initializeBB({ user: userAlice, calendar: calendarAlice });
    assertNotEquals("error" in initResult, true);
    const bbId = (initResult as { brontoBoard: ID }).brontoBoard;

    // 2. Create a Class in Alice's BrontoBoard
    const classResult = await concept.createClass({
      owner: userAlice,
      brontoBoard: bbId,
      className: "Data Structures",
      overview: "Algorithms and data organization",
    });
    assertNotEquals("error" in classResult, true);
    const dsClassId = (classResult as { class: ID }).class;

    // 3. Add an Assignment to the Data Structures Class
    const assignResult = await concept.addWork({
      owner: userAlice,
      class: dsClassId,
      workName: "Midterm Exam",
      dueDate: getFutureDate(30),
    });
    assertNotEquals("error" in assignResult, true);
    const midtermId = (assignResult as { assignment: ID }).assignment;

    // 4. Add Office Hours to the Data Structures Class
    const ohResult = await concept.addOH({
      owner: userAlice,
      class: dsClassId,
      OHTime: getFutureDate(15),
      OHduration: 45,
    });
    assertNotEquals("error" in ohResult, true);
    const dsOhId = (ohResult as { officeHours: ID }).officeHours;

    // Verify associations using queries
    const retrievedBb = (await concept._getBrontoBoardsForUser({ user: userAlice }))
      .find(b => b._id === bbId);
    assertExists(retrievedBb, "BrontoBoard should exist for Alice");

    const retrievedClasses = await concept._getClassesForBrontoBoard({ brontoBoard: bbId });
    assertEquals(retrievedClasses.length, 1, "Should be one class in BrontoBoard");
    assertEquals(retrievedClasses[0]._id, dsClassId, "Class ID should match");
    assertEquals(retrievedClasses[0].brontoBoardId, bbId, "Class should be linked to BrontoBoard");

    const retrievedAssignments = await concept._getAssignmentsForClass({ class: dsClassId });
    assertEquals(retrievedAssignments.length, 1, "Should be one assignment in class");
    assertEquals(retrievedAssignments[0]._id, midtermId, "Assignment ID should match");
    assertEquals(retrievedAssignments[0].classId, dsClassId, "Assignment should be linked to class");

    const retrievedOfficeHours = await concept._getOfficeHoursForClass({ class: dsClassId });
    assertEquals(retrievedOfficeHours.length, 1, "Should be one office hour record in class");
    assertEquals(retrievedOfficeHours[0]._id, dsOhId, "Office Hour ID should match");
    assertEquals(retrievedOfficeHours[0].classId, dsClassId, "Office Hour should be linked to class");

    // Create another BrontoBoard for Bob and try to link Alice's class to it (should fail implicitly via ownership checks)
    const bobBbResult = await concept.initializeBB({ user: userBob, calendar: calendarBob });
    assertNotEquals("error" in bobBbResult, true);
    const bobBbId = (bobBbResult as { brontoBoard: ID }).brontoBoard;

    const bobClassAttempt = await concept.createClass({
      owner: userBob,
      brontoBoard: bobBbId,
      className: "Attempted Alice Class",
      overview: "This should not work with Alice's class ID",
    });
    assertNotEquals("error" in bobClassAttempt, true, "Bob should be able to create his own class.");
    const bobClassId = (bobClassAttempt as {class: ID}).class;

    // Try to add Alice's class to Bob's BrontoBoard (concept's internal _getClassIfBrontoBoardOwned handles this)
    // There isn't an explicit "moveClass" action, but the structure ensures a class only belongs to one BB.
    // If Bob tries to modify Alice's class, it will fail due to ownership checks.
    const bobTriesChangeAliceClass = await concept.addWork({
      owner: userBob,
      class: dsClassId, // Alice's class
      workName: "Bob's attempt",
      dueDate: getFutureDate(10),
    });
    assertEquals("error" in bobTriesChangeAliceClass, true, "Bob should not be able to interact with Alice's class");
  });

  await client.close();
});