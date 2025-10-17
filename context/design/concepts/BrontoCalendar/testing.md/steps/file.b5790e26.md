---
timestamp: 'Thu Oct 16 2025 11:21:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_112123.a9147042.md]]'
content_id: b5790e26ddb63a63d6a7cd3934ac05c8376184a2fc35cad4a3875cd0ae11ed1a
---

# file: src/brontoCalendar/BrontoCalendarConcept.ts (updated)

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Assuming @utils/types.ts defines `type ID = string & { __brand: "ID" }; type Empty = Record<PropertyKey, never>;`
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides `freshID(): ID;`

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
 * __principle__: If a user creates a calendar, then creates and assigns an assignment to it,
 *                querying that day will show the assignment. If the assignment's due date is
 *                then changed, it will automatically move to the new day on the calendar,
 *                demonstrating the ease of consistent changes to scheduling.
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
   * The date object is assumed to be in UTC or converted to a consistent timezone before being passed.
   */
  private normalizeDateToKey(date: Date): string {
    // Using UTC to avoid timezone issues affecting the "day"
    return date.toISOString().split("T")[0]; // Example: "2023-10-27"
  }

  // --- Actions ---

  /**
   * __action__: CreateCalendar
   * __requires__:
   *   - `user`: The ID of a valid user for whom the calendar is to be created.
   *   - A calendar for this user must not already exist in the `calendars` collection.
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
    if (!classId || typeof classId !== 'string' || !name || name.trim() === "" || !dueDate || isNaN(dueDate.getTime())) {
      return { error: "Invalid assignment data: classId, non-empty name, and valid dueDate are required." };
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
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.
   *   - Returns an error if the calendar or assignment is not found.
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

    // Update or create the CalendarDay document for the specific calendar and day
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id }, // Filter by _id and calendarId
      {
        $addToSet: { assignments: assignmentId }, // Add assignment ID if not already present
        // Use normalized date for insertion, but store actual date if needed
        $setOnInsert: { calendarId: calendar._id, date: new Date(normalizedDueDate), officeHours: [] }, // Set on insert
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
   *   - Leaves the `AssignmentDoc` in the `assignments` collection unless `deleteAssignment` is called.
   */
  async removeWork({ owner, assignmentId }: { owner: User; assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // Precondition 2: Find the assignment in the concept's state to get its dueDate
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

    if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
      // This means the calendar day was not found or the assignment was not present in its list.
      // We can consider this a successful removal if it was already not there, or an error if strictness is needed.
      // For now, if the assignment wasn't there, we'll return an error if it should have been.
      const calendarDay = await this.calendarDays.findOne({ _id: calendarDayKey, calendarId: calendar._id });
      if (calendarDay && calendarDay.assignments.includes(assignmentId)) {
         return { error: `Failed to remove assignment ${assignmentId} from calendar for user ${owner} on due date.` };
      }
      // If no calendar day existed or it existed but didn't have the assignment, it's effectively removed.
    }

    // Optional: Clean up empty calendar days if both assignments and office hours are empty.
    await this.calendarDays.deleteOne({ _id: calendarDayKey, assignments: [], officeHours: [] });

    return {};
  }

  /**
   * __action__: updateAssignmentDueDate
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar associated with the assignment.
   *   - `assignmentId`: The ID of an existing assignment to modify.
   *   - `newDueDate`: A valid Date object for the new due date.
   * __effects__:
   *   - Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.
   *   - If the date component of `dueDate` changes, the assignment entry is moved from its old calendar day to the new one.
   *   - Returns an error if the owner's calendar is not found, assignment not found, or input is invalid.
   */
  async updateAssignmentDueDate({ owner, assignmentId, newDueDate }: { owner: User; assignmentId: AssignmentRef; newDueDate: Date }): Promise<Empty | { error: string }> {
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

    const oldNormalizedDate = this.normalizeDateToKey(assignment.dueDate);
    const newNormalizedDate = this.normalizeDateToKey(newDueDate);

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
    if (oldNormalizedDate !== newNormalizedDate) {
      // Remove from old day's calendar entry
      const oldDayKey = `${calendar._id}_${oldNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: oldDayKey, calendarId: calendar._id },
        { $pull: { assignments: assignmentId } }
      );
      // Optional: Clean up old calendar day if it becomes empty
      await this.calendarDays.deleteOne({ _id: oldDayKey, assignments: [], officeHours: [] });

      // Add to new day's calendar entry
      const newDayKey = `${calendar._id}_${newNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: newDayKey, calendarId: calendar._id },
        {
          $addToSet: { assignments: assignmentId },
          $setOnInsert: { calendarId: calendar._id, date: new Date(newNormalizedDate), officeHours: [] },
        },
        { upsert: true }
      );
    }

    return {};
  }


  /**
   * __action__: deleteAssignment
   * __requires__:
   *   - `assignmentId`: The ID of an existing assignment to delete from the concept's state.
   * __effects__:
   *   - Deletes the assignment document from the `assignments` collection.
   *   - Atomically removes any references to this assignment from all `calendarDays` documents across all calendars.
   *   - Returns an error if the assignment is not found.
   */
  async deleteAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    const deleteResult = await this.assignments.deleteOne({ _id: assignmentId });
    if (deleteResult.deletedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} not found in BrontoCalendar's state.` };
    }

    // Remove references to this assignment from all calendar days where it might be present.
    await this.calendarDays.updateMany(
      { assignments: assignmentId },
      { $pull: { assignments: assignmentId } }
    );
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
    if (!classId || typeof classId !== 'string' || !startTime || isNaN(startTime.getTime()) || duration < 0) {
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
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.
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

    // Update or create the CalendarDay document for the specific calendar and day
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      {
        $addToSet: { officeHours: officeHoursId }, // Add OH ID if not already present
        // Use normalized date for insertion, but store actual date if needed
        $setOnInsert: { calendarId: calendar._id, date: new Date(normalizedStartTime), assignments: [] }, // Set on insert
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
   *   - `newDate`: A valid Date object for the new start time (only date component considered for calendar day).
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
    // "future newDate" from spec: The principle describes "future newDate".
    // This is a semantic choice. For stricter validation, uncomment the following:
    // if (newDate.getTime() < Date.now()) {
    //   return { error: "New date must be in the future" };
    // }

    const oldNormalizedDate = this.normalizeDateToKey(oh.startTime);
    const newNormalizedDate = this.normalizeDateToKey(newDate);

    // 1. Update the OfficeHours document itself with the new time and duration.
    const updateOfficeHoursResult = await this.officeHours.updateOne(
      { _id: officeHoursId },
      { $set: { startTime: newDate, duration: newDuration } }
    );

    if (updateOfficeHoursResult.matchedCount === 0) {
      // This case should ideally not happen if `oh` was found above.
      return { error: `Failed to update office hours with ID ${officeHoursId}.` };
    }

    // 2. Update CalendarDay documents if the date has changed (moving from one day to another).
    if (oldNormalizedDate !== newNormalizedDate) {
      // Remove from old day's calendar entry
      const oldDayKey = `${calendar._id}_${oldNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: oldDayKey, calendarId: calendar._id },
        { $pull: { officeHours: officeHoursId } }
      );
      // Optional: Clean up old calendar day if it becomes empty
      await this.calendarDays.deleteOne({ _id: oldDayKey, assignments: [], officeHours: [] });

      // Add to new day's calendar entry
      const newDayKey = `${calendar._id}_${newNormalizedDate}` as CalendarDayRef;
      await this.calendarDays.updateOne(
        { _id: newDayKey, calendarId: calendar._id },
        {
          $addToSet: { officeHours: officeHoursId },
          $setOnInsert: { calendarId: calendar._id, date: new Date(newNormalizedDate), assignments: [] },
        },
        { upsert: true }
      );
    }

    return {};
  }

  /**
   * __action__: deleteOfficeHours
   * __requires__:
   *   - `officeHoursId`: The ID of an existing office hours object to delete from the concept's state.
   * __effects__:
   *   - Deletes the office hours document from the `officeHours` collection.
   *   - Atomically removes any references to these office hours from all `calendarDays` documents across all calendars.
   *   - Returns an error if the office hours are not found.
   */
  async deleteOfficeHours({ officeHoursId }: { officeHoursId: OfficeHoursRef }): Promise<Empty | { error: string }> {
    const deleteResult = await this.officeHours.deleteOne({ _id: officeHoursId });
    if (deleteResult.deletedCount === 0) {
      return { error: `Office hours with ID ${officeHoursId} not found in BrontoCalendar's state.` };
    }

    // Remove references to these office hours from all calendar days where they might be present.
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
   * __effects__: Returns the calendar document for a given user, or null if not found.
   */
  async _getCalendarForUser({ user }: { user: User }): Promise<CalendarDoc | null> {
    return await this.calendars.findOne({ owner: user });
  }

  /**
   * __query__: _getAssignmentsOnDay
   * __effects__: Returns a list of assignment documents scheduled for a specific day on a specific calendar.
   *              If no assignments or calendar day found, returns an empty array.
   */
  async _getAssignmentsOnDay({ calendarId, date }: { calendarId: CalendarRef; date: Date }): Promise<AssignmentDoc[]> {
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
   *              If no office hours or calendar day found, returns an empty array.
   */
  async _getOfficeHoursOnDay({ calendarId, date }: { calendarId: CalendarRef; date: Date }): Promise<OfficeHoursDoc[]> {
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
   * __effects__: Returns an assignment document by its ID, or null if not found.
   */
  async _getAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<AssignmentDoc | null> {
    return await this.assignments.findOne({ _id: assignmentId });
  }

  /**
   * __query__: _getOfficeHours
   * __effects__: Returns an office hours document by its ID, or null if not found.
   */
  async _getOfficeHours({ officeHoursId }: { officeHoursId: OfficeHoursRef }): Promise<OfficeHoursDoc | null> {
    return await this.officeHours.findOne({ _id: officeHoursId });
  }
}

// --- TypeScript Interfaces for MongoDB Documents ---

/**
 * Interface for documents in the `brontoCalendar.assignments` collection.
 * Corresponds to "a set of Assignments with a classId ID, a name string, a dueDate Date".
 */
interface AssignmentDoc {
  _id: AssignmentRef;
  classId: ID; // External reference to a class (e.g., "cs101")
  name: string;
  dueDate: Date; // Stored as ISODate in MongoDB
}

/**
 * Interface for documents in the `brontoCalendar.officeHours` collection.
 * Corresponds to "a set of Office Hours with a classId ID, a startTime Date, a duration number".
 */
interface OfficeHoursDoc {
  _id: OfficeHoursRef;
  classId: ID; // External reference to a class (e.g., "cs101")
  startTime: Date; // Stored as ISODate in MongoDB
  duration: number; // Duration in minutes
}

/**
 * Interface for documents in the `brontoCalendar.calendars` collection.
 * Corresponds to "a set of Calendars with an owner User".
 */
interface CalendarDoc {
  _id: CalendarRef;
  owner: User; // External reference to a user (e.g., "user:alice")
}

/**
 * Interface for documents in the `brontoCalendar.calendarDays` collection.
 * Each document represents a specific day on a specific calendar.
 * The `_id` is a composite of `calendarId` and normalized `date` (YYYY-MM-DD string).
 * Corresponds to "a set of Days with a set of Assignments, a set of Office Hours".
 */
interface CalendarDayDoc {
  _id: CalendarDayRef; // Format: `${CalendarRef}_YYYY-MM-DD`
  calendarId: CalendarRef;
  date: Date; // The conceptual date this day represents (e.g., midnight UTC for YYYY-MM-DD)
  assignments: AssignmentRef[]; // Array of IDs of assignments due on this day
  officeHours: OfficeHoursRef[]; // Array of IDs of office hours scheduled for this day
}
```
