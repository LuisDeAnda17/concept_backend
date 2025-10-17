---
timestamp: 'Thu Oct 16 2025 11:10:57 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_111057.8149a080.md]]'
content_id: c19e89b16edd9817a73c7550cb2a0ba2169b33971379837a2f1477fc87476103
---

# response:

```typescript
// file: src/brontoCalendar/BrontoCalendarConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "BrontoCalendar" + ".";

// Generic types of this concept, as defined in the concept header.
// These are external identifiers that BrontoCalendar interacts with.
type User = ID;

// Internal types for the actual documents stored in MongoDB collections,
// aliasing to ID for consistency with concept design's generic parameter usage,
// but these are the concrete IDs of objects managed *by this concept*.
type AssignmentRef = ID; // Reference to an AssignmentDoc
type OfficeHoursRef = ID; // Reference to an OfficeHoursDoc
type CalendarRef = ID; // Reference to a CalendarDoc
type CalendarDayRef = ID; // For identifying specific day entries within a calendar

/**
 * __concept__: BrontoCalendar
 * __purpose__: Associate an assignment or Exam to a day on a calendar.
 * __principle__: Each assignment has one associated day.
 *                If you create a calendar for a user, then add an assignment to it,
 *                and later query that day, you will find the assignment listed.
 *                If you then change the assignment's due date, it will move to the new day on the calendar.
 */
export default class BrontoCalendarConcept {
  // --- State Definitions (mapped to MongoDB Collections) ---

  /**
   * Represents "a set of Assignments with a classId ID, a name string, a dueDate Date".
   * This collection holds the details of each assignment managed by BrontoCalendar.
   */
  private assignments: Collection<AssignmentDoc>;

  /**
   * Represents "a set of Office Hours with a classId ID, a startTime Date, a duration number".
   * This collection holds the details of each office hour block managed by BrontoCalendar.
   */
  private officeHours: Collection<OfficeHoursDoc>;

  /**
   * Represents "a set of Calendars with an owner User".
   * This collection maps users to their personal calendars.
   */
  private calendars: Collection<CalendarDoc>;

  /**
   * Represents "a set of Days with a set of Assignments, a set of Office Hours".
   * This collection stores the actual schedule for each day within each calendar,
   * holding references to assignments and office hours.
   */
  private calendarDays: Collection<CalendarDayDoc>;

  constructor(private readonly db: Db) {
    this.assignments = this.db.collection(PREFIX + "assignments");
    this.officeHours = this.db.collection(PREFIX + "officeHours");
    this.calendars = this.db.collection(PREFIX + "calendars");
    this.calendarDays = this.db.collection(PREFIX + "calendarDays");
  }

  /**
   * Helper function to normalize a date to a YYYY-MM-DD string.
   * This is crucial for consistent day-level grouping and key generation in the database.
   * Ensures that all entries for the same conceptual "day" (regardless of time) map to the same string.
   */
  private normalizeDateToKey(date: Date): string {
    return date.toISOString().split("T")[0]; // Example: "2023-10-27"
  }

  // --- Actions ---

  /**
   * __action__: CreateCalendar
   * __requires__:
   *   - `user`: The ID of a valid user for whom the calendar is to be created.
   *   - A calendar for this user must not already exist.
   * __effects__:
   *   - Creates an empty Calendar document for the specified user in the `calendars` collection.
   *   - Returns the ID of the newly created calendar.
   */
  async createCalendar({ user }: { user: User }): Promise<{ calendarId: CalendarRef } | { error: string }> {
    // Precondition: A calendar for this user must not already exist.
    const existingCalendar = await this.calendars.findOne({ owner: user });
    if (existingCalendar) {
      return { error: `Calendar already exists for user ${user}` };
    }

    const newCalendar: CalendarDoc = {
      _id: freshID() as CalendarRef,
      owner: user,
    };
    await this.calendars.insertOne(newCalendar);
    return { calendarId: newCalendar._id };
  }

  /**
   * __action__: createAssignment
   * __requires__:
   *   - `classId`: An ID identifying the class this assignment belongs to.
   *   - `name`: A non-empty string for the assignment's name.
   *   - `dueDate`: A valid Date object representing when the assignment is due.
   * __effects__:
   *   - Creates a new assignment object in the `assignments` collection.
   *   - Returns the ID of the newly created assignment.
   */
  async createAssignment({ classId, name, dueDate }: { classId: ID; name: string; dueDate: Date }): Promise<{ assignmentId: AssignmentRef } | { error: string }> {
    // Preconditions: Validate input
    if (!classId || !name || name.trim() === "" || !dueDate || isNaN(dueDate.getTime())) {
      return { error: "Invalid assignment data: classId, name, and valid dueDate are required." };
    }

    const newAssignment: AssignmentDoc = {
      _id: freshID() as AssignmentRef,
      classId,
      name: name.trim(),
      dueDate,
    };
    await this.assignments.insertOne(newAssignment);
    return { assignmentId: newAssignment._id };
  }

  /**
   * __action__: assignWork
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.
   * __effects__:
   *   - Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that day.
   */
  async assignWork({ owner, assignmentId }: { owner: User; assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the assignment in the concept's state
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found in BrontoCalendar's state.` };
    }

    // Determine the target day (due date of the assignment)
    const normalizedDueDate = this.normalizeDateToKey(assignment.dueDate);
    const calendarDayKey = `${calendar._id}_${normalizedDueDate}` as CalendarDayRef;

    // Update or create the CalendarDay document
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id }, // Filter by _id and calendarId
      {
        $addToSet: { assignments: assignmentId }, // Add assignment ID if not already present
        $setOnInsert: { calendarId: calendar._id, date: assignment.dueDate, officeHours: [] }, // Set on insert
      },
      { upsert: true } // Create if not exists
    );

    return {};
  }

  /**
   * __action__: removeWork
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.
   * __effects__:
   *   - Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
   *   - If the assignment is not found on the calendar, an error is returned.
   */
  async removeWork({ owner, assignmentId }: { owner: User; assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the assignment in the concept's state
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found in BrontoCalendar's state.` };
    }

    // Determine the target day (due date of the assignment)
    const normalizedDueDate = this.normalizeDateToKey(assignment.dueDate);
    const calendarDayKey = `${calendar._id}_${normalizedDueDate}` as CalendarDayRef;

    // Remove the assignment ID from the CalendarDay document
    const updateResult = await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      { $pull: { assignments: assignmentId } }
    );

    // If the day doc wasn't found or assignment wasn't in the array
    // Note: It's possible for matchedCount > 0 but modifiedCount === 0 if the item wasn't in the array.
    // For `removeWork`, we consider it an error if it wasn't there to begin with.
    if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
      return { error: `Assignment ${assignmentId} not found on calendar for user ${owner} on due date ${normalizedDueDate}.` };
    }

    // Optional: Clean up empty calendar days. For now, we leave them unless explicitly empty.
    // const dayDoc = await this.calendarDays.findOne({ _id: calendarDayKey });
    // if (dayDoc && dayDoc.assignments.length === 0 && dayDoc.officeHours.length === 0) {
    //   await this.calendarDays.deleteOne({ _id: calendarDayKey });
    // }

    return {};
  }

  /**
   * __action__: deleteAssignment
   * __requires__:
   *   - `assignmentId`: The ID of an existing assignment to delete.
   * __effects__:
   *   - Deletes the assignment from the `assignments` collection.
   *   - Removes any references to this assignment from all `calendarDays` documents across all calendars.
   *   - Returns an error if the assignment is not found.
   */
  async deleteAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    const deleteResult = await this.assignments.deleteOne({ _id: assignmentId });
    if (deleteResult.deletedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    // Remove references to this assignment from all calendar days
    await this.calendarDays.updateMany(
      { assignments: assignmentId },
      { $pull: { assignments: assignmentId } }
    );
    // Optional: Clean up empty calendar days after pulling references
    // This could be done with a more complex aggregation pipeline or by iterating,
    // but for simplicity, `updateMany` for pulling is sufficient.
    return {};
  }

  /**
   * __action__: changeAssignmentDueDate
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar associated with the assignment.
   *   - `assignmentId`: The ID of an existing assignment to modify.
   *   - `newDueDate`: A valid Date object for the new due date.
   * __effects__:
   *   - Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.
   *   - If the date component of `dueDate` changes, the assignment entry is moved from its old calendar day to the new one.
   *   - Returns an error if the owner's calendar is not found, assignment not found, or input is invalid.
   */
  async changeAssignmentDueDate({ owner, assignmentId, newDueDate }: { owner: User; assignmentId: AssignmentRef; newDueDate: Date }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the assignment in the concept's state
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found in BrontoCalendar's state.` };
    }

    // Precondition 3: Validate `newDueDate`
    if (!newDueDate || isNaN(newDueDate.getTime())) {
      return { error: "Invalid newDueDate provided" };
    }

    const oldNormalizedDueDate = this.normalizeDateToKey(assignment.dueDate);
    const newNormalizedDueDate = this.normalizeDateToKey(newDueDate);

    // 1. Update the Assignment document itself
    const updateAssignmentResult = await this.assignments.updateOne(
      { _id: assignmentId },
      { $set: { dueDate: newDueDate } }
    );

    if (updateAssignmentResult.matchedCount === 0) {
      // This case should ideally not happen if `assignment` was found above.
      return { error: `Failed to update assignment with ID ${assignmentId}.` };
    }

    // 2. Update CalendarDay documents if the date has changed
    if (oldNormalizedDueDate !== newNormalizedDueDate) {
      // Remove from old day's calendar entry
      const oldDayKey = `${calendar._id}_${oldNormalizedDueDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: oldDayKey, calendarId: calendar._id },
        { $pull: { assignments: assignmentId } }
      );

      // Add to new day's calendar entry
      const newDayKey = `${calendar._id}_${newNormalizedDueDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: newDayKey, calendarId: calendar._id },
        {
          $addToSet: { assignments: assignmentId },
          $setOnInsert: { calendarId: calendar._id, date: newDueDate, officeHours: [] }, // Use newDueDate for date of new day doc
        },
        { upsert: true }
      );
    }

    return {};
  }

  /**
   * __action__: createOfficeHours
   * __requires__:
   *   - `classId`: An ID identifying the class these office hours belong to.
   *   - `startTime`: A valid Date object for when office hours begin.
   *   - `duration`: A non-negative number (in minutes) for the duration.
   * __effects__:
   *   - Creates a new office hours object in the `officeHours` collection.
   *   - Returns the ID of the newly created office hours.
   */
  async createOfficeHours({ classId, startTime, duration }: { classId: ID; startTime: Date; duration: number }): Promise<{ officeHoursId: OfficeHoursRef } | { error: string }> {
    // Preconditions: Validate input
    if (!classId || !startTime || isNaN(startTime.getTime()) || duration < 0) {
      return { error: "Invalid office hours data: classId, valid startTime, and non-negative duration are required." };
    }

    const newOfficeHours: OfficeHoursDoc = {
      _id: freshID() as OfficeHoursRef,
      classId,
      startTime,
      duration,
    };
    await this.officeHours.insertOne(newOfficeHours);
    return { officeHoursId: newOfficeHours._id };
  }

  /**
   * __action__: assignOH
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `officeHoursId`: The ID of an existing office hours object within the concept's `officeHours` state.
   * __effects__:
   *   - Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that day.
   */
  async assignOH({ owner, officeHoursId }: { owner: User; officeHoursId: OfficeHoursRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the office hours in the concept's state
    const oh = await this.officeHours.findOne({ _id: officeHoursId });
    if (!oh) {
      return { error: `Office hours with ID ${officeHoursId} not found in BrontoCalendar's state.` };
    }

    // Determine the target day (start time of the office hours)
    const normalizedStartTime = this.normalizeDateToKey(oh.startTime);
    const calendarDayKey = `${calendar._id}_${normalizedStartTime}` as CalendarDayRef;

    // Update or create the CalendarDay document
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      {
        $addToSet: { officeHours: officeHoursId }, // Add OH ID if not already present
        $setOnInsert: { calendarId: calendar._id, date: oh.startTime, assignments: [] }, // Set on insert
      },
      { upsert: true } // Create if not exists
    );

    return {};
  }

  /**
   * __action__: changeOH
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar associated with the office hours.
   *   - `officeHoursId`: The ID of an existing office hours object to modify.
   *   - `newDate`: A valid Date object for the new start time.
   *   - `newDuration`: A non-negative number for the new duration.
   * __effects__:
   *   - Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.
   *   - If the date component of `startTime` changes, the office hours entry is moved from its old calendar day to the new one.
   *   - Returns an error if the owner's calendar is not found, office hours not found, or input is invalid.
   */
  async changeOH({ owner, officeHoursId, newDate, newDuration }: { owner: User; officeHoursId: OfficeHoursRef; newDate: Date; newDuration: number }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the office hours in the concept's state
    const oh = await this.officeHours.findOne({ _id: officeHoursId });
    if (!oh) {
      return { error: `Office hours with ID ${officeHoursId} not found in BrontoCalendar's state.` };
    }

    // Precondition 3: Validate `newDate` and `newDuration`
    if (newDuration < 0) {
      return { error: "New duration must be non-negative" };
    }
    if (!newDate || isNaN(newDate.getTime())) {
      return { error: "Invalid newDate provided" };
    }
    // "future newDate": Semantic interpretation. For a stricter check, uncomment:
    // if (newDate.getTime() < Date.now()) {
    //   return { error: "New date must be in the future" };
    // }

    const oldNormalizedDate = this.normalizeDateToKey(oh.startTime);
    const newNormalizedDate = this.normalizeDateToKey(newDate);

    // 1. Update the OfficeHours document itself
    const updateOfficeHoursResult = await this.officeHours.updateOne(
      { _id: officeHoursId },
      { $set: { startTime: newDate, duration: newDuration } }
    );

    if (updateOfficeHoursResult.matchedCount === 0) {
      // This case should ideally not happen if `oh` was found above.
      return { error: `Failed to update office hours with ID ${officeHoursId}.` };
    }

    // 2. Update CalendarDay documents if the date has changed
    if (oldNormalizedDate !== newNormalizedDate) {
      // Remove from old day's calendar entry
      const oldDayKey = `${calendar._id}_${oldNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: oldDayKey, calendarId: calendar._id },
        { $pull: { officeHours: officeHoursId } }
      );

      // Add to new day's calendar entry
      const newDayKey = `${calendar._id}_${newNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: newDayKey, calendarId: calendar._id },
        {
          $addToSet: { officeHours: officeHoursId },
          $setOnInsert: { calendarId: calendar._id, date: newDate, assignments: [] },
        },
        { upsert: true }
      );
    }

    return {};
  }

  /**
   * __action__: deleteOfficeHours
   * __requires__:
   *   - `officeHoursId`: The ID of an existing office hours object to delete.
   * __effects__:
   *   - Deletes the office hours object from the `officeHours` collection.
   *   - Removes any references to these office hours from all `calendarDays` documents across all calendars.
   *   - Returns an error if the office hours are not found.
   */
  async deleteOfficeHours({ officeHoursId }: { officeHoursId: OfficeHoursRef }): Promise<Empty | { error: string }> {
    const deleteResult = await this.officeHours.deleteOne({ _id: officeHoursId });
    if (deleteResult.deletedCount === 0) {
      return { error: `Office hours with ID ${officeHoursId} not found.` };
    }

    // Remove references to these office hours from all calendar days
    await this.calendarDays.updateMany(
      { officeHours: officeHoursId },
      { $pull: { officeHours: officeHoursId } }
    );
    return {};
  }

  // --- Queries ---
  // Queries are methods starting with an underscore `_` and typically return data.

  /**
   * __query__: _getCalendarForUser
   * __effects__: Returns the calendar document for a given user.
   */
  async _getCalendarForUser({ user }: { user: User }): Promise<CalendarDoc | null> {
    return await this.calendars.findOne({ owner: user });
  }

  /**
   * __query__: _getAssignmentsOnDay
   * __effects__: Returns a list of assignment documents scheduled for a specific day on a specific calendar.
   */
  async _getAssignmentsOnDay({ calendarId, date }: { calendarId: CalendarRef; date: Date }): Promise<AssignmentDoc[] | { error: string }> {
    const normalizedDate = this.normalizeDateToKey(date);
    const calendarDayKey = `${calendarId}_${normalizedDate}` as CalendarDayRef;

    const calendarDay = await this.calendarDays.findOne({ _id: calendarDayKey, calendarId });
    if (!calendarDay || !calendarDay.assignments || calendarDay.assignments.length === 0) {
      return []; // No entries for this day or no assignments
    }

    // Retrieve full assignment documents using the stored IDs
    const assignments = await this.assignments.find({ _id: { $in: calendarDay.assignments } }).toArray();
    return assignments;
  }

  /**
   * __query__: _getOfficeHoursOnDay
   * __effects__: Returns a list of office hours documents scheduled for a specific day on a specific calendar.
   */
  async _getOfficeHoursOnDay({ calendarId, date }: { calendarId: CalendarRef; date: Date }): Promise<OfficeHoursDoc[] | { error: string }> {
    const normalizedDate = this.normalizeDateToKey(date);
    const calendarDayKey = `${calendarId}_${normalizedDate}` as CalendarDayRef;

    const calendarDay = await this.calendarDays.findOne({ _id: calendarDayKey, calendarId });
    if (!calendarDay || !calendarDay.officeHours || calendarDay.officeHours.length === 0) {
      return []; // No entries for this day or no office hours
    }

    // Retrieve full office hours documents using the stored IDs
    const ohs = await this.officeHours.find({ _id: { $in: calendarDay.officeHours } }).toArray();
    return ohs;
  }

  /**
   * __query__: _getAssignment
   * __effects__: Returns an assignment document by its ID.
   */
  async _getAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<AssignmentDoc | null> {
    return await this.assignments.findOne({ _id: assignmentId });
  }

  /**
   * __query__: _getOfficeHours
   * __effects__: Returns an office hours document by its ID.
   */
  async _getOfficeHours({ officeHoursId }: { officeHoursId: OfficeHoursRef }): Promise<OfficeHoursDoc | null> {
    return await this.officeHours.findOne({ _id: officeHoursId });
  }
}

// --- TypeScript Interfaces for MongoDB Documents ---

/**
 * Interface for documents in the `brontoCalendar.assignments` collection.
 */
interface AssignmentDoc {
  _id: AssignmentRef;
  classId: ID; // External reference to a class
  name: string;
  dueDate: Date; // Stored as ISODate in MongoDB
}

/**
 * Interface for documents in the `brontoCalendar.officeHours` collection.
 */
interface OfficeHoursDoc {
  _id: OfficeHoursRef;
  classId: ID; // External reference to a class
  startTime: Date; // Stored as ISODate in MongoDB
  duration: number; // Duration in minutes
}

/**
 * Interface for documents in the `brontoCalendar.calendars` collection.
 */
interface CalendarDoc {
  _id: CalendarRef;
  owner: User; // External reference to a user
}

/**
 * Interface for documents in the `brontoCalendar.calendarDays` collection.
 * Each document represents a specific day on a specific calendar.
 * The `_id` is a composite of `calendarId` and normalized `date`.
 */
interface CalendarDayDoc {
  _id: CalendarDayRef; // Format: `${CalendarRef}_YYYY-MM-DD`
  calendarId: CalendarRef;
  date: Date; // The conceptual date this day represents (e.g., midnight UTC for YYYY-MM-DD)
  assignments: AssignmentRef[]; // Array of IDs of assignments due on this day
  officeHours: OfficeHoursRef[]; // Array of IDs of office hours scheduled for this day
}
```

```typescript
// file: src/brontoCalendar/BrontoCalendarConcept.test.ts
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming this handles DB setup/teardown
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

import BrontoCalendarConcept from "./BrontoCalendarConcept.ts";

Deno.test("BrontoCalendarConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new BrontoCalendarConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const classMath = "class:Math101" as ID;
  const classPhysics = "class:Physics200" as ID;

  // Helper to check for error objects
  const isError = (result: any): result is { error: string } => "error" in result;

  t.beforeEach(async () => {
    // Clear collections before each test to ensure isolation
    await db.collection("BrontoCalendar.assignments").deleteMany({});
    await db.collection("BrontoCalendar.officeHours").deleteMany({});
    await db.collection("BrontoCalendar.calendars").deleteMany({});
    await db.collection("BrontoCalendar.calendarDays").deleteMany({});
  });

  t.afterAll(async () => {
    await client.close();
  });

  // trace: Principle Fulfillment
  Deno.test("Principle: Assignment creation, assignment, and due date change", async () => {
    // 1. Create a calendar for a user
    const createCalendarResult = await concept.createCalendar({ user: userAlice });
    assertNotEquals(createCalendarResult, null);
    if (isError(createCalendarResult)) throw new Error(createCalendarResult.error);
    const calendarId = createCalendarResult.calendarId;
    assertExists(calendarId);

    // Verify calendar exists
    const calendar = await concept._getCalendarForUser({ user: userAlice });
    assertExists(calendar);
    assertEquals(calendar._id, calendarId);
    assertEquals(calendar.owner, userAlice);

    // 2. Create an assignment
    const dueDate1 = new Date("2023-10-27T10:00:00Z");
    const createAssignmentResult = await concept.createAssignment({ classId: classMath, name: "Homework 1", dueDate: dueDate1 });
    assertNotEquals(createAssignmentResult, null);
    if (isError(createAssignmentResult)) throw new Error(createAssignmentResult.error);
    const assignment1Id = createAssignmentResult.assignmentId;
    assertExists(assignment1Id);

    // Verify assignment exists in concept's state
    const assignment1 = await concept._getAssignment({ assignmentId: assignment1Id });
    assertExists(assignment1);
    assertEquals(assignment1._id, assignment1Id);
    assertEquals(assignment1.name, "Homework 1");

    // 3. Add the assignment to the user's calendar
    const assignResult = await concept.assignWork({ owner: userAlice, assignmentId: assignment1Id });
    assertNotEquals(assignResult, null);
    if (isError(assignResult)) throw new Error(assignResult.error);
    assertEquals(assignResult, {});

    // 4. Query that day and find the assignment listed
    const assignmentsOnDay1 = await concept._getAssignmentsOnDay({ calendarId, date: dueDate1 });
    assertNotEquals(assignmentsOnDay1, null);
    if (isError(assignmentsOnDay1)) throw new Error(assignmentsOnDay1.error);
    assertEquals(assignmentsOnDay1.length, 1);
    assertEquals(assignmentsOnDay1[0]._id, assignment1Id);
    assertEquals(assignmentsOnDay1[0].name, "Homework 1");

    // Check no assignments on a different day
    const emptyDay = new Date("2023-10-28T10:00:00Z");
    const assignmentsOnEmptyDay = await concept._getAssignmentsOnDay({ calendarId, date: emptyDay });
    if (isError(assignmentsOnEmptyDay)) throw new Error(assignmentsOnEmptyDay.error);
    assertEquals(assignmentsOnEmptyDay.length, 0);

    // 5. Change the assignment's due date
    const dueDate2 = new Date("2023-10-28T14:00:00Z");
    const changeDateResult = await concept.changeAssignmentDueDate({ owner: userAlice, assignmentId: assignment1Id, newDueDate: dueDate2 });
    assertNotEquals(changeDateResult, null);
    if (isError(changeDateResult)) throw new Error(changeDateResult.error);
    assertEquals(changeDateResult, {});

    // Verify assignment has new due date in concept's state
    const updatedAssignment1 = await concept._getAssignment({ assignmentId: assignment1Id });
    assertExists(updatedAssignment1);
    assertEquals(updatedAssignment1.dueDate.toISOString().split('T')[0], dueDate2.toISOString().split('T')[0]);

    // Verify assignment is no longer on the old day
    const assignmentsOnOldDay = await concept._getAssignmentsOnDay({ calendarId, date: dueDate1 });
    if (isError(assignmentsOnOldDay)) throw new Error(assignmentsOnOldDay.error);
    assertEquals(assignmentsOnOldDay.length, 0);

    // Verify assignment is now on the new day
    const assignmentsOnNewDay = await concept._getAssignmentsOnDay({ calendarId, date: dueDate2 });
    assertNotEquals(assignmentsOnNewDay, null);
    if (isError(assignmentsOnNewDay)) throw new Error(assignmentsOnNewDay.error);
    assertEquals(assignmentsOnNewDay.length, 1);
    assertEquals(assignmentsOnNewDay[0]._id, assignment1Id);
    assertEquals(assignmentsOnNewDay[0].name, "Homework 1");
  });

  // Test createCalendar action
  Deno.test("createCalendar action", async (t) => {
    await t.step("should create a calendar for a new user", async () => {
      const result = await concept.createCalendar({ user: userBob });
      if (isError(result)) throw new Error(result.error);
      assertExists(result.calendarId);

      const calendar = await concept._getCalendarForUser({ user: userBob });
      assertExists(calendar);
      assertEquals(calendar.owner, userBob);
      assertEquals(calendar._id, result.calendarId);
    });

    await t.step("should return an error if calendar already exists for user", async () => {
      await concept.createCalendar({ user: userBob }); // Create it first
      const result = await concept.createCalendar({ user: userBob });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for duplicate calendar creation.");
      assertEquals(result.error, `Calendar already exists for user ${userBob}`);
    });
  });

  // Test createAssignment action
  Deno.test("createAssignment action", async (t) => {
    const dueDate = new Date("2023-11-01T12:00:00Z");

    await t.step("should create an assignment with valid data", async () => {
      const result = await concept.createAssignment({ classId: classMath, name: "Quiz 1", dueDate });
      if (isError(result)) throw new Error(result.error);
      assertExists(result.assignmentId);

      const assignment = await concept._getAssignment({ assignmentId: result.assignmentId });
      assertExists(assignment);
      assertEquals(assignment.name, "Quiz 1");
      assertEquals(assignment.classId, classMath);
      assertEquals(assignment.dueDate.toISOString(), dueDate.toISOString());
    });

    await t.step("should return an error for invalid input (empty name)", async () => {
      const result = await concept.createAssignment({ classId: classMath, name: "", dueDate });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for empty assignment name.");
      assertEquals(result.error, "Invalid assignment data: classId, name, and valid dueDate are required.");
    });

    await t.step("should return an error for invalid input (null dueDate)", async () => {
      const result = await concept.createAssignment({ classId: classMath, name: "Invalid", dueDate: null as any });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for null dueDate.");
      assertEquals(result.error, "Invalid assignment data: classId, name, and valid dueDate are required.");
    });
  });

  // Test assignWork action
  Deno.test("assignWork action", async (t) => {
    let calendarId: ID;
    let assignmentId: ID;
    const dueDate = new Date("2023-11-05T09:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createAssignResult = await concept.createAssignment({ classId: classMath, name: "Exam", dueDate });
      if (isError(createAssignResult)) throw new Error("Setup failed: " + createAssignResult.error);
      assignmentId = createAssignResult.assignmentId;
    });

    await t.step("should successfully assign work to a calendar day", async () => {
      const assignResult = await concept.assignWork({ owner: userAlice, assignmentId });
      if (isError(assignResult)) throw new Error(assignResult.error);
      assertEquals(assignResult, {});

      const assignments = await concept._getAssignmentsOnDay({ calendarId, date: dueDate });
      if (isError(assignments)) throw new Error(assignments.error);
      assertEquals(assignments.length, 1);
      assertEquals(assignments[0]._id, assignmentId);
    });

    await t.step("should allow multiple assignments on the same day", async () => {
      const assignment2Result = await concept.createAssignment({ classId: classPhysics, name: "Lab Report", dueDate });
      if (isError(assignment2Result)) throw new Error("Setup failed: " + assignment2Result.error);
      const assignment2Id = assignment2Result.assignmentId;

      await concept.assignWork({ owner: userAlice, assignmentId });
      await concept.assignWork({ owner: userAlice, assignmentId: assignment2Id });

      const assignments = await concept._getAssignmentsOnDay({ calendarId, date: dueDate });
      if (isError(assignments)) throw new Error(assignments.error);
      assertEquals(assignments.length, 2);
      assertExists(assignments.find(a => a._id === assignmentId));
      assertExists(assignments.find(a => a._id === assignment2Id));
    });

    await t.step("should return an error if calendar not found", async () => {
      const result = await concept.assignWork({ owner: userBob, assignmentId }); // User Bob has no calendar
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing calendar.");
      assertEquals(result.error, `No calendar found for user ${userBob}`);
    });

    await t.step("should return an error if assignment not found in concept's state", async () => {
      const nonExistentAssignmentId = freshID() as ID;
      const result = await concept.assignWork({ owner: userAlice, assignmentId: nonExistentAssignmentId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing assignment.");
      assertEquals(result.error, `Assignment with ID ${nonExistentAssignmentId} not found in BrontoCalendar's state.`);
    });
  });

  // Test removeWork action
  Deno.test("removeWork action", async (t) => {
    let calendarId: ID;
    let assignmentId1: ID;
    let assignmentId2: ID;
    const dueDate = new Date("2023-11-05T09:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createAssign1Result = await concept.createAssignment({ classId: classMath, name: "Exam 1", dueDate });
      if (isError(createAssign1Result)) throw new Error("Setup failed: " + createAssign1Result.error);
      assignmentId1 = createAssign1Result.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId: assignmentId1 });

      const createAssign2Result = await concept.createAssignment({ classId: classPhysics, name: "Exam 2", dueDate });
      if (isError(createAssign2Result)) throw new Error("Setup failed: " + createAssign2Result.error);
      assignmentId2 = createAssign2Result.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId: assignmentId2 });
    });

    await t.step("should successfully remove work from a calendar day", async () => {
      const removeResult = await concept.removeWork({ owner: userAlice, assignmentId: assignmentId1 });
      if (isError(removeResult)) throw new Error(removeResult.error);
      assertEquals(removeResult, {});

      const assignments = await concept._getAssignmentsOnDay({ calendarId, date: dueDate });
      if (isError(assignments)) throw new Error(assignments.error);
      assertEquals(assignments.length, 1);
      assertEquals(assignments[0]._id, assignmentId2);
    });

    await t.step("should return an error if calendar not found", async () => {
      const result = await concept.removeWork({ owner: userBob, assignmentId: assignmentId1 });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing calendar.");
      assertEquals(result.error, `No calendar found for user ${userBob}`);
    });

    await t.step("should return an error if assignment not found in concept's state", async () => {
      const nonExistentAssignmentId = freshID() as ID;
      const result = await concept.removeWork({ owner: userAlice, assignmentId: nonExistentAssignmentId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing assignment.");
      assertEquals(result.error, `Assignment with ID ${nonExistentAssignmentId} not found in BrontoCalendar's state.`);
    });

    await t.step("should return an error if assignment not found on specified day", async () => {
      const futureDate = new Date("2023-12-01T09:00:00Z");
      const futureAssignmentResult = await concept.createAssignment({ classId: classMath, name: "Future HW", dueDate: futureDate });
      if (isError(futureAssignmentResult)) throw new Error("Setup failed: " + futureAssignmentResult.error);
      const futureAssignmentId = futureAssignmentResult.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId: futureAssignmentId });

      const result = await concept.removeWork({ owner: userAlice, assignmentId: futureAssignmentId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for assignment not on day.");
      assertEquals(result.error, `Assignment ${futureAssignmentId} not found on calendar for user ${userAlice} on due date ${futureDate.toISOString().split('T')[0]}.`);
    });
  });

  // Test deleteAssignment action
  Deno.test("deleteAssignment action", async (t) => {
    let calendarId: ID;
    let assignmentId: ID;
    const dueDate = new Date("2023-11-10T10:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createAssignResult = await concept.createAssignment({ classId: classMath, name: "To Delete", dueDate });
      if (isError(createAssignResult)) throw new Error("Setup failed: " + createAssignResult.error);
      assignmentId = createAssignResult.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId });
    });

    await t.step("should delete assignment and remove references from calendar days", async () => {
      const deleteResult = await concept.deleteAssignment({ assignmentId });
      if (isError(deleteResult)) throw new Error(deleteResult.error);
      assertEquals(deleteResult, {});

      const deletedAssignment = await concept._getAssignment({ assignmentId });
      assertEquals(deletedAssignment, null);

      const assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId, date: dueDate });
      if (isError(assignmentsOnDay)) throw new Error(assignmentsOnDay.error);
      assertEquals(assignmentsOnDay.length, 0); // Should be removed from calendar day
    });

    await t.step("should return an error if assignment not found", async () => {
      const nonExistentAssignmentId = freshID() as ID;
      const result = await concept.deleteAssignment({ assignmentId: nonExistentAssignmentId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing assignment.");
      assertEquals(result.error, `Assignment with ID ${nonExistentAssignmentId} not found.`);
    });
  });

  // Test changeAssignmentDueDate action
  Deno.test("changeAssignmentDueDate action", async (t) => {
    let calendarId: ID;
    let assignmentId: ID;
    const oldDueDate = new Date("2023-11-15T09:00:00Z");
    const newDueDate = new Date("2023-11-20T11:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createAssignResult = await concept.createAssignment({ classId: classMath, name: "Report", dueDate: oldDueDate });
      if (isError(createAssignResult)) throw new Error("Setup failed: " + createAssignResult.error);
      assignmentId = createAssignResult.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId }); // Assign initially
    });

    await t.step("should update assignment dueDate and move it to the new calendar day", async () => {
      const changeResult = await concept.changeAssignmentDueDate({ owner: userAlice, assignmentId, newDueDate });
      if (isError(changeResult)) throw new Error(changeResult.error);
      assertEquals(changeResult, {});

      const updatedAssignment = await concept._getAssignment({ assignmentId });
      assertExists(updatedAssignment);
      assertEquals(updatedAssignment.dueDate.toISOString(), newDueDate.toISOString());

      const oldDayAssignments = await concept._getAssignmentsOnDay({ calendarId, date: oldDueDate });
      if (isError(oldDayAssignments)) throw new Error(oldDayAssignments.error);
      assertEquals(oldDayAssignments.length, 0);

      const newDayAssignments = await concept._getAssignmentsOnDay({ calendarId, date: newDueDate });
      if (isError(newDayAssignments)) throw new Error(newDayAssignments.error);
      assertEquals(newDayAssignments.length, 1);
      assertEquals(newDayAssignments[0]._id, assignmentId);
    });

    await t.step("should update assignment dueDate but not change calendar day if date component is same", async () => {
      const sameDayNewTime = new Date("2023-11-15T14:00:00Z"); // Same day, different time
      const changeResult = await concept.changeAssignmentDueDate({ owner: userAlice, assignmentId, newDueDate: sameDayNewTime });
      if (isError(changeResult)) throw new Error(changeResult.error);
      assertEquals(changeResult, {});

      const updatedAssignment = await concept._getAssignment({ assignmentId });
      assertExists(updatedAssignment);
      assertEquals(updatedAssignment.dueDate.toISOString(), sameDayNewTime.toISOString());

      const assignmentsOnDay = await concept._getAssignmentsOnDay({ calendarId, date: oldDueDate }); // Still on the same day
      if (isError(assignmentsOnDay)) throw new Error(assignmentsOnDay.error);
      assertEquals(assignmentsOnDay.length, 1);
      assertEquals(assignmentsOnDay[0]._id, assignmentId);
    });

    await t.step("should return an error if calendar not found", async () => {
      const result = await concept.changeAssignmentDueDate({ owner: userBob, assignmentId, newDueDate });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing calendar.");
      assertEquals(result.error, `No calendar found for user ${userBob}`);
    });

    await t.step("should return an error if assignment not found", async () => {
      const nonExistentAssignmentId = freshID() as ID;
      const result = await concept.changeAssignmentDueDate({ owner: userAlice, assignmentId: nonExistentAssignmentId, newDueDate });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing assignment.");
      assertEquals(result.error, `Assignment with ID ${nonExistentAssignmentId} not found in BrontoCalendar's state.`);
    });

    await t.step("should return an error for invalid newDueDate", async () => {
      const result = await concept.changeAssignmentDueDate({ owner: userAlice, assignmentId, newDueDate: null as any });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for invalid newDueDate.");
      assertEquals(result.error, "Invalid newDueDate provided");
    });
  });

  // Test createOfficeHours action
  Deno.test("createOfficeHours action", async (t) => {
    const startTime = new Date("2023-11-25T13:00:00Z");

    await t.step("should create office hours with valid data", async () => {
      const result = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: 60 });
      if (isError(result)) throw new Error(result.error);
      assertExists(result.officeHoursId);

      const oh = await concept._getOfficeHours({ officeHoursId: result.officeHoursId });
      assertExists(oh);
      assertEquals(oh.classId, classPhysics);
      assertEquals(oh.startTime.toISOString(), startTime.toISOString());
      assertEquals(oh.duration, 60);
    });

    await t.step("should return an error for invalid input (negative duration)", async () => {
      const result = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: -30 });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for negative duration.");
      assertEquals(result.error, "Invalid office hours data: classId, valid startTime, and non-negative duration are required.");
    });
  });

  // Test assignOH action
  Deno.test("assignOH action", async (t) => {
    let calendarId: ID;
    let officeHoursId: ID;
    const startTime = new Date("2023-11-26T14:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createOHResult = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: 90 });
      if (isError(createOHResult)) throw new Error("Setup failed: " + createOHResult.error);
      officeHoursId = createOHResult.officeHoursId;
    });

    await t.step("should successfully assign office hours to a calendar day", async () => {
      const assignResult = await concept.assignOH({ owner: userAlice, officeHoursId });
      if (isError(assignResult)) throw new Error(assignResult.error);
      assertEquals(assignResult, {});

      const ohs = await concept._getOfficeHoursOnDay({ calendarId, date: startTime });
      if (isError(ohs)) throw new Error(ohs.error);
      assertEquals(ohs.length, 1);
      assertEquals(ohs[0]._id, officeHoursId);
    });

    await t.step("should return an error if calendar not found", async () => {
      const result = await concept.assignOH({ owner: userBob, officeHoursId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing calendar.");
      assertEquals(result.error, `No calendar found for user ${userBob}`);
    });
  });

  // Test changeOH action
  Deno.test("changeOH action", async (t) => {
    let calendarId: ID;
    let officeHoursId: ID;
    const oldStartTime = new Date("2023-11-28T10:00:00Z");
    const newStartTime = new Date("2023-11-29T11:00:00Z");
    const newDuration = 120;

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createOHResult = await concept.createOfficeHours({ classId: classPhysics, startTime: oldStartTime, duration: 60 });
      if (isError(createOHResult)) throw new Error("Setup failed: " + createOHResult.error);
      officeHoursId = createOHResult.officeHoursId;
      await concept.assignOH({ owner: userAlice, officeHoursId }); // Assign initially
    });

    await t.step("should update office hours and move it to the new calendar day", async () => {
      const changeResult = await concept.changeOH({ owner: userAlice, officeHoursId, newDate: newStartTime, newDuration });
      if (isError(changeResult)) throw new Error(changeResult.error);
      assertEquals(changeResult, {});

      const updatedOH = await concept._getOfficeHours({ officeHoursId });
      assertExists(updatedOH);
      assertEquals(updatedOH.startTime.toISOString(), newStartTime.toISOString());
      assertEquals(updatedOH.duration, newDuration);

      const oldDayOHs = await concept._getOfficeHoursOnDay({ calendarId, date: oldStartTime });
      if (isError(oldDayOHs)) throw new Error(oldDayOHs.error);
      assertEquals(oldDayOHs.length, 0);

      const newDayOHs = await concept._getOfficeHoursOnDay({ calendarId, date: newStartTime });
      if (isError(newDayOHs)) throw new Error(newDayOHs.error);
      assertEquals(newDayOHs.length, 1);
      assertEquals(newDayOHs[0]._id, officeHoursId);
    });

    await t.step("should update duration without moving if date component is same", async () => {
      const sameDayNewTime = new Date("2023-11-28T14:00:00Z"); // Same day, different time
      const changedDuration = 180;
      const changeResult = await concept.changeOH({ owner: userAlice, officeHoursId, newDate: sameDayNewTime, newDuration: changedDuration });
      if (isError(changeResult)) throw new Error(changeResult.error);
      assertEquals(changeResult, {});

      const updatedOH = await concept._getOfficeHours({ officeHoursId });
      assertExists(updatedOH);
      assertEquals(updatedOH.startTime.toISOString(), sameDayNewTime.toISOString());
      assertEquals(updatedOH.duration, changedDuration);

      const ohsOnDay = await concept._getOfficeHoursOnDay({ calendarId, date: oldStartTime }); // Still on the same day
      if (isError(ohsOnDay)) throw new Error(ohsOnDay.error);
      assertEquals(ohsOnDay.length, 1);
      assertEquals(ohsOnDay[0]._id, officeHoursId);
    });

    await t.step("should return an error if new duration is negative", async () => {
      const result = await concept.changeOH({ owner: userAlice, officeHoursId, newDate: newStartTime, newDuration: -10 });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for negative duration.");
      assertEquals(result.error, "New duration must be non-negative");
    });
  });

  // Test deleteOfficeHours action
  Deno.test("deleteOfficeHours action", async (t) => {
    let calendarId: ID;
    let officeHoursId: ID;
    const startTime = new Date("2023-12-01T15:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createOHResult = await concept.createOfficeHours({ classId: classPhysics, startTime, duration: 60 });
      if (isError(createOHResult)) throw new Error("Setup failed: " + createOHResult.error);
      officeHoursId = createOHResult.officeHoursId;
      await concept.assignOH({ owner: userAlice, officeHoursId });
    });

    await t.step("should delete office hours and remove references from calendar days", async () => {
      const deleteResult = await concept.deleteOfficeHours({ officeHoursId });
      if (isError(deleteResult)) throw new Error(deleteResult.error);
      assertEquals(deleteResult, {});

      const deletedOH = await concept._getOfficeHours({ officeHoursId });
      assertEquals(deletedOH, null);

      const ohsOnDay = await concept._getOfficeHoursOnDay({ calendarId, date: startTime });
      if (isError(ohsOnDay)) throw new Error(ohsOnDay.error);
      assertEquals(ohsOnDay.length, 0); // Should be removed from calendar day
    });

    await t.step("should return an error if office hours not found", async () => {
      const nonExistentOHId = freshID() as ID;
      const result = await concept.deleteOfficeHours({ officeHoursId: nonExistentOHId });
      assertExists(result);
      if (!isError(result)) throw new Error("Expected an error for missing office hours.");
      assertEquals(result.error, `Office hours with ID ${nonExistentOHId} not found.`);
    });
  });

  // Test queries
  Deno.test("Queries", async (t) => {
    let calendarId: ID;
    let assignmentId1: ID;
    let officeHoursId1: ID;
    const date1 = new Date("2023-12-05T00:00:00Z");
    const date2 = new Date("2023-12-06T00:00:00Z");

    t.beforeEach(async () => {
      const createCalResult = await concept.createCalendar({ user: userAlice });
      if (isError(createCalResult)) throw new Error("Setup failed: " + createCalResult.error);
      calendarId = createCalResult.calendarId;

      const createAssignResult = await concept.createAssignment({ classId: classMath, name: "Query HW", dueDate: date1 });
      if (isError(createAssignResult)) throw new Error("Setup failed: " + createAssignResult.error);
      assignmentId1 = createAssignResult.assignmentId;
      await concept.assignWork({ owner: userAlice, assignmentId: assignmentId1 });

      const createOHResult = await concept.createOfficeHours({ classId: classPhysics, startTime: date1, duration: 60 });
      if (isError(createOHResult)) throw new Error("Setup failed: " + createOHResult.error);
      officeHoursId1 = createOHResult.officeHoursId;
      await concept.assignOH({ owner: userAlice, officeHoursId: officeHoursId1 });
    });

    await t.step("_getCalendarForUser should retrieve the correct calendar", async () => {
      const calendar = await concept._getCalendarForUser({ user: userAlice });
      assertExists(calendar);
      assertEquals(calendar._id, calendarId);
      assertEquals(calendar.owner, userAlice);
    });

    await t.step("_getCalendarForUser should return null for a non-existent user", async () => {
      const calendar = await concept._getCalendarForUser({ user: userBob });
      assertEquals(calendar, null);
    });

    await t.step("_getAssignmentsOnDay should retrieve assignments for a specific day", async () => {
      const assignments = await concept._getAssignmentsOnDay({ calendarId, date: date1 });
      if (isError(assignments)) throw new Error(assignments.error);
      assertEquals(assignments.length, 1);
      assertEquals(assignments[0]._id, assignmentId1);
    });

    await t.step("_getAssignmentsOnDay should return an empty array for a day with no assignments", async () => {
      const assignments = await concept._getAssignmentsOnDay({ calendarId, date: date2 });
      if (isError(assignments)) throw new Error(assignments.error);
      assertEquals(assignments.length, 0);
    });

    await t.step("_getOfficeHoursOnDay should retrieve office hours for a specific day", async () => {
      const ohs = await concept._getOfficeHoursOnDay({ calendarId, date: date1 });
      if (isError(ohs)) throw new Error(ohs.error);
      assertEquals(ohs.length, 1);
      assertEquals(ohs[0]._id, officeHoursId1);
    });

    await t.step("_getOfficeHoursOnDay should return an empty array for a day with no office hours", async () => {
      const ohs = await concept._getOfficeHoursOnDay({ calendarId, date: date2 });
      if (isError(ohs)) throw new Error(ohs.error);
      assertEquals(ohs.length, 0);
    });

    await t.step("_getAssignment should retrieve a specific assignment by ID", async () => {
      const assignment = await concept._getAssignment({ assignmentId: assignmentId1 });
      assertExists(assignment);
      assertEquals(assignment._id, assignmentId1);
      assertEquals(assignment.name, "Query HW");
    });

    await t.step("_getAssignment should return null for a non-existent assignment ID", async () => {
      const assignment = await concept._getAssignment({ assignmentId: freshID() as ID });
      assertEquals(assignment, null);
    });

    await t.step("_getOfficeHours should retrieve specific office hours by ID", async () => {
      const oh = await concept._getOfficeHours({ officeHoursId: officeHoursId1 });
      assertExists(oh);
      assertEquals(oh._id, officeHoursId1);
      assertEquals(oh.duration, 60);
    });

    await t.step("_getOfficeHours should return null for non-existent office hours ID", async () => {
      const oh = await concept._getOfficeHours({ officeHoursId: freshID() as ID });
      assertEquals(oh, null);
    });
  });
});
```
