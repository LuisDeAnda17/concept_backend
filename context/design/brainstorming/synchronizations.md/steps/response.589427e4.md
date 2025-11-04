---
timestamp: 'Mon Nov 03 2025 16:58:19 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_165819.96041637.md]]'
content_id: 589427e43742e0b68787d97e687a49bf047a9a6c030b9875eaf0998a767e021a
---

# response:

Okay, this is a comprehensive task involving updating concept implementations and creating numerous synchronization rules across these concepts, including cross-concept interactions.

First, let's make the necessary updates to the `BrontoBoardConcept.ts` and `BrontoCalendarConcept.ts` files as discussed to enable the desired synchronization patterns.

***

### **1. Updated `src/BrontoBoard/BrontoBoardConcept.ts`**

This update adds the `_getAssignment` and `_getOfficeHours` queries, and the `removeOH` action to `BrontoBoardConcept`.

```typescript
// file: src/BrontoBoard/BrontoBoardConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * __concept:__ BrontoBoard [User, Calendar]
 * __purpose:__ Associates set of Assignments, an overview, office hours, and a name to a class and that class to a BrontoBoard.
 * __principle:__ Each Assignment, overview, and Office Hours are associated with One Class.
 * (Does not mean that Assignments, overviews, and office hours must be unique in every class),
 * and each class can only belong to one BrontoBoard.
 */
const PREFIX = "BrontoBoard" + ".";

// Generic types for objects external to this concept, referenced by ID.
type User = ID;
type Calendar = ID; // Reference to a calendar from another concept (e.g., BrontoCalendar)

// --- State Interfaces ---

/**
 * Represents a BrontoBoard instance.
 * Part of the 'a set of BrontoBoards' state.
 */
interface BrontoBoardDoc {
  _id: ID;
  owner: User; // The ID of the user who owns this BrontoBoard
  calendar: Calendar; // The ID of the calendar associated with this BrontoBoard
}

/**
 * Represents a Class within a BrontoBoard.
 * Part of the 'a set of Classes' state within BrontoBoards.
 */
interface ClassDoc {
  _id: ID;
  brontoBoardId: ID; // Links this class to its parent BrontoBoard
  name: string;
  overview: string;
}

/**
 * Represents an Assignment for a Class.
 * Part of the 'a set of Assignments' state.
 */
interface AssignmentDoc {
  _id: ID;
  classId: ID; // Links this assignment to its parent Class
  name: string;
  dueDate: Date;
}

/**
 * Represents Office Hours for a Class.
 * Part of the 'a set of Office Hours' state.
 */
interface OfficeHourDoc {
  _id: ID;
  classId: ID; // Links these office hours to their parent Class
  startTime: Date;
  duration: number; // Duration in minutes
}

export default class BrontoBoardConcept {
  // MongoDB collections corresponding to the concept's state components
  private brontoBoards: Collection<BrontoBoardDoc>;
  private classes: Collection<ClassDoc>;
  private assignments: Collection<AssignmentDoc>;
  private officeHours: Collection<OfficeHourDoc>;

  constructor(private readonly db: Db) {
    this.brontoBoards = this.db.collection(PREFIX + "brontoBoards");
    this.classes = this.db.collection(PREFIX + "classes");
    this.assignments = this.db.collection(PREFIX + "assignments");
    this.officeHours = this.db.collection(PREFIX + "officeHours");
  }

  /**
   * Helper method to find a BrontoBoard and verify ownership.
   * @param brontoBoardId The ID of the BrontoBoard.
   * @param ownerId The ID of the user claiming ownership.
   * @returns The BrontoBoardDoc if found and owned, otherwise an error object.
   */
  private async _getBrontoBoardIfOwned(
    brontoBoardId: ID,
    ownerId: User,
  ): Promise<BrontoBoardDoc | { error: string }> {
    const brontoBoard = await this.brontoBoards.findOne({ _id: brontoBoardId });
    if (!brontoBoard) {
      return { error: `BrontoBoard with ID ${brontoBoardId} not found.` };
    }
    if (brontoBoard.owner !== ownerId) {
      return {
        error: `User ${ownerId} is not the owner of BrontoBoard ${brontoBoardId}.`,
      };
    }
    return brontoBoard;
  }

  /**
   * Helper method to find a Class and verify its parent BrontoBoard is owned by the user.
   * @param classId The ID of the Class.
   * @param ownerId The ID of the user claiming ownership of the parent BrontoBoard.
   * @returns An object containing the ClassDoc and BrontoBoardDoc if valid, otherwise an error object.
   */
  private async _getClassIfBrontoBoardOwned(
    classId: ID,
    ownerId: User,
  ): Promise<{ class: ClassDoc; brontoBoard: BrontoBoardDoc } | { error: string }> {
    const classDoc = await this.classes.findOne({ _id: classId });
    if (!classDoc) {
      return { error: `Class with ID ${classId} not found.` };
    }

    const brontoBoardCheck = await this._getBrontoBoardIfOwned(
      classDoc.brontoBoardId,
      ownerId,
    );
    if ("error" in brontoBoardCheck) {
      return brontoBoardCheck; // Propagate the error from _getBrontoBoardIfOwned
    }

    return { class: classDoc, brontoBoard: brontoBoardCheck };
  }

  /**
   * __action:__ initializeBB
   * __requires:__ A valid user and their calendar. A BrontoBoard must not already exist for this user.
   * __effects:__ Creates an empty BrontoBoard for the user.
   * @param input An object containing the user and calendar IDs.
   *   - `user`: The ID of the user creating the BrontoBoard.
   *   - `calendar`: The ID of the calendar associated with this BrontoBoard.
   * @returns An object containing the ID of the newly created BrontoBoard, or an error.
   */
  async initializeBB(input: {
    user: User;
    calendar: Calendar;
  }): Promise<{ brontoBoard: ID } | { error: string }> {
    const { user, calendar } = input;

    // Precondition: Check if a BrontoBoard already exists for this user
    const existingBrontoBoard = await this.brontoBoards.findOne({ owner: user });
    if (existingBrontoBoard) {
        return { error: `BrontoBoard already exists for user ${user}` };
    }

    const newBrontoBoardId = freshID();
    const result = await this.brontoBoards.insertOne({
      _id: newBrontoBoardId,
      owner: user,
      calendar: calendar,
    });

    if (!result.acknowledged) {
      return { error: "Failed to create BrontoBoard." };
    }

    return { brontoBoard: newBrontoBoardId };
  }

  /**
   * __action:__ createClass
   * __requires:__ User is the owner of the BrontoBoard and the Classname not be an empty String.
   *               No class with the same name should exist under this BrontoBoard.
   * __effects:__ Creates a class object assigned to the BrontoBoard with the given information.
   * @param input An object containing owner, brontoBoard ID, class name, and overview.
   *   - `owner`: The ID of the user attempting to create the class.
   *   - `brontoBoard`: The ID of the BrontoBoard to which the class will be added.
   *   - `className`: The name of the new class.
   *   - `overview`: An overview description for the class.
   * @returns An object containing the ID of the newly created Class, or an error.
   */
  async createClass(input: {
    owner: User;
    brontoBoard: ID;
    className: string;
    overview: string;
  }): Promise<{ class: ID } | { error: string }> {
    const { owner, brontoBoard, className, overview } = input;

    const brontoBoardCheck = await this._getBrontoBoardIfOwned(
      brontoBoard,
      owner,
    );
    if ("error" in brontoBoardCheck) {
      return brontoBoardCheck;
    }

    if (!className || className.trim() === "") {
      return { error: "Class name cannot be empty." };
    }

    // Precondition: Check for duplicate class name within this BrontoBoard
    const existingClass = await this.classes.findOne({ brontoBoardId: brontoBoard, name: className.trim() });
    if (existingClass) {
        return { error: `Class with name '${className}' already exists in BrontoBoard ${brontoBoard}.` };
    }

    const newClassId = freshID();
    const result = await this.classes.insertOne({
      _id: newClassId,
      brontoBoardId: brontoBoard,
      name: className.trim(),
      overview: overview,
    });

    if (!result.acknowledged) {
      return { error: "Failed to create class." };
    }

    return { class: newClassId };
  }

  /**
   * __action:__ addWork
   * __requires:__ User is the owner of the BrontoBoard, owner and class are valid.
   *              workName and dueDate be not empty and dueDate be not before the current date.
   * __effects:__ Create an Assignment under the Class of the owner with the given name and due date.
   * @param input An object containing owner, class ID, work name, and due date.
   *   - `owner`: The ID of the user attempting to add work.
   *   - `class`: The ID of the class to which the assignment will be added.
   *   - `workName`: The name of the assignment.
   *   - `dueDate`: The due date of the assignment.
   * @returns An object containing the ID of the newly created Assignment, or an error.
   */
  async addWork(input: {
    owner: User;
    class: ID;
    workName: string;
    dueDate: Date;
  }): Promise<{ assignment: ID } | { error: string }> {
    const { owner, class: classId, workName, dueDate } = input;

    const classCheck = await this._getClassIfBrontoBoardOwned(classId, owner);
    if ("error" in classCheck) {
      return classCheck;
    }

    if (!workName || workName.trim() === "") {
      return { error: "Work name cannot be empty." };
    }

    // Not strictly "future" date, but "not before current date" as per spec
    // Allow assignments for today, but not past dates.
    const today = new Date();
    today.setHours(0,0,0,0); // Normalize today's date for comparison
    const inputDueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (!dueDate || isNaN(dueDate.getTime()) || inputDueDateOnly < today) {
      return { error: "Due date must be a valid date today or in the future." };
    }

    const newAssignmentId = freshID();
    const result = await this.assignments.insertOne({
      _id: newAssignmentId,
      classId: classId,
      name: workName.trim(),
      dueDate: dueDate,
    });

    if (!result.acknowledged) {
      return { error: "Failed to add work/assignment." };
    }

    return { assignment: newAssignmentId };
  }

  /**
   * __action:__ changeWork
   * __requires:__ User is the owner of the BrontoBoard, A valid Assignment of a Class of the owner with a future date.
   * __effects:__ Modifies the Assignment to the new date.
   * @param input An object containing owner, assignment ID, and new due date.
   *   - `owner`: The ID of the user attempting to change work.
   *   - `work`: The ID of the assignment to modify.
   *   - `dueDate`: The new due date for the assignment.
   * @returns An empty object on success, or an error.
   */
  async changeWork(input: {
    owner: User;
    work: ID;
    dueDate: Date;
  }): Promise<Empty | { error: string }> {
    const { owner, work: assignmentId, dueDate } = input;

    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    const classCheck = await this._getClassIfBrontoBoardOwned(
      assignment.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const inputDueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (!dueDate || isNaN(dueDate.getTime()) || inputDueDateOnly < today) {
      return { error: "New due date must be a valid date today or in the future." };
    }

    const result = await this.assignments.updateOne(
      { _id: assignmentId },
      { $set: { dueDate: dueDate } },
    );

    if (result.matchedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} not found for update.` };
    }
    return {}; // Success, even if modifiedCount is 0 (date was identical)
  }

  /**
   * __action:__ removeWork
   * __requires:__ User is the owner of the BrontoBoard, A valid owner and existing Assignment.
   * __effects:__ Removes the Assignment from its class.
   * @param input An object containing owner and assignment ID.
   *   - `owner`: The ID of the user attempting to remove work.
   *   - `work`: The ID of the assignment to remove.
   * @returns An empty object on success, or an error.
   */
  async removeWork(input: {
    owner: User;
    work: ID;
  }): Promise<Empty | { error: string }> {
    const { owner, work: assignmentId } = input;

    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    const classCheck = await this._getClassIfBrontoBoardOwned(
      assignment.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    const result = await this.assignments.deleteOne({ _id: assignmentId });

    if (result.deletedCount === 0) {
      return { error: `Failed to remove assignment with ID ${assignmentId}.` };
    }

    return {};
  }

  /**
   * __action:__ addOH
   * __requires:__ User is the owner of the BrontoBoard associated with the class.
   *              A valid class of the owner with a future OHTime and non-negative OHDuration.
   * __effects__: Creates Office Hours under the Class of the owner with the given start time and duration.
   * @param input An object containing owner, class ID, office hour start time, and duration.
   *   - `owner`: The ID of the user attempting to add office hours.
   *   - `class`: The ID of the class to which the office hours will be added.
   *   - `OHTime`: The start time of the office hours.
   *   - `OHduration`: The duration of the office hours in minutes.
   * @returns An object containing the ID of the newly created OfficeHours, or an error.
   */
  async addOH(input: {
    owner: User;
    class: ID;
    OHTime: Date;
    OHduration: number;
  }): Promise<{ officeHours: ID } | { error: string }> {
    const { owner, class: classId, OHTime, OHduration } = input;

    const classCheck = await this._getClassIfBrontoBoardOwned(classId, owner);
    if ("error" in classCheck) {
      return classCheck;
    }

    // Precondition: OHTime must be a valid future date
    if (!OHTime || isNaN(OHTime.getTime()) || OHTime < new Date()) {
      return { error: "Office hours start time must be a valid future date." };
    }

    // Precondition: OHDuration must be a non-negative number
    if (OHduration == null || typeof OHduration !== "number" || OHduration < 0) {
      return { error: "Office hours duration must be a non-negative number." };
    }

    const newOfficeHoursId = freshID();
    const result = await this.officeHours.insertOne({
      _id: newOfficeHoursId,
      classId: classId,
      startTime: OHTime,
      duration: OHduration,
    });

    if (!result.acknowledged) {
      return { error: "Failed to add office hours." };
    }

    return { officeHours: newOfficeHoursId };
  }

  /**
   * __action:__ changeOH
   * __requires:__ User is the owner of the BrontoBoard, A valid office hour record, a future newDate and non-negative newduration.
   * __effects__: Modifies the office hours to the new date and duration.
   * @param input An object containing owner, office hour ID, new start date/time, and new duration.
   *   - `owner`: The ID of the user attempting to change office hours.
   *   - `oh`: The ID of the office hours to modify.
   *   - `newDate`: The new start date/time for the office hours.
   *   - `newduration`: The new duration for the office hours.
   * @returns An empty object on success, or an error.
   */
  async changeOH(input: {
    owner: User;
    oh: ID;
    newDate: Date;
    newduration: number;
  }): Promise<Empty | { error: string }> {
    const { owner, oh: officeHoursId, newDate, newduration } = input;

    const officeHours = await this.officeHours.findOne({ _id: officeHoursId });
    if (!officeHours) {
      return { error: `Office hours with ID ${officeHoursId} not found.` };
    }

    const classCheck = await this._getClassIfBrontoBoardOwned(
      officeHours.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    if (!newDate || isNaN(newDate.getTime()) || newDate < new Date()) {
      return { error: "New office hours start time must be a valid future date." };
    }

    if (newduration == null || typeof newduration !== "number" || newduration < 0) {
      return { error: "New office hours duration must be a non-negative number." };
    }

    const result = await this.officeHours.updateOne(
      { _id: officeHoursId },
      { $set: { startTime: newDate, duration: newduration } },
    );

    if (result.matchedCount === 0) {
      return { error: `Office hours with ID ${officeHoursId} not found for update.` };
    }
    return {};
  }

  /**
   * __action:__ removeOH
   * __requires:__ User is the owner of the BrontoBoard, A valid owner and existing OfficeHours.
   * __effects__: Removes the OfficeHours from its class.
   * @param input An object containing owner and office hour ID.
   *   - `owner`: The ID of the user attempting to remove office hours.
   *   - `oh`: The ID of the office hours to remove.
   * @returns An empty object on success, or an error.
   */
  async removeOH(input: {
    owner: User;
    oh: ID;
  }): Promise<Empty | { error: string }> {
    const { owner, oh: officeHoursId } = input;

    const officeHours = await this.officeHours.findOne({ _id: officeHoursId });
    if (!officeHours) {
      return { error: `Office hours with ID ${officeHoursId} not found.` };
    }

    const classCheck = await this._getClassIfBrontoBoardOwned(
      officeHours.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    const result = await this.officeHours.deleteOne({ _id: officeHoursId });

    if (result.deletedCount === 0) {
      return { error: `Failed to remove office hours with ID ${officeHoursId}.` };
    }

    return {};
  }

  // --- Concept Queries ---
  /**
   * __query__: _getAssignment
   * __effects__: Returns an assignment document by its ID.
   */
  async _getAssignment(input: { assignmentId: ID }): Promise<AssignmentDoc | null> {
    return await this.assignments.findOne({ _id: input.assignmentId });
  }

  /**
   * __query__: _getOfficeHours
   * __effects__: Returns an office hour document by its ID.
   */
  async _getOfficeHours(input: { officeHoursId: ID }): Promise<OfficeHourDoc | null> {
    return await this.officeHours.findOne({ _id: input.officeHoursId });
  }

  /**
   * __query__: _getAssignmentsForClass
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of assignments for the given class.
   */
  async _getAssignmentsForClass(input: { class: ID }): Promise<AssignmentDoc[]> {
    const { class: classId } = input;
    return await this.assignments.find({ classId: classId }).toArray();
  }

  /**
   * __query__: _getOfficeHoursForClass
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of office hours for the given class.
   */
  async _getOfficeHoursForClass(input: { class: ID }): Promise<OfficeHourDoc[]> {
    const { class: classId } = input;
    return await this.officeHours.find({ classId: classId }).toArray();
  }

  /**
   * __query__: _getClassesForBrontoBoard
   * @param input An object containing the BrontoBoard ID.
   *   - `brontoBoard`: The ID of the BrontoBoard.
   * @returns An array of classes for the given BrontoBoard.
   */
  async _getClassesForBrontoBoard(input: { brontoBoard: ID }): Promise<ClassDoc[]> {
    const { brontoBoard: brontoBoardId } = input;
    return await this.classes.find({ brontoBoardId: brontoBoardId }).toArray();
  }

  /**
   * __query__: _getBrontoBoardsForUser
   * @param input An object containing the user ID.
   *   - `user`: The ID of the user.
   * @returns An array of BrontoBoards owned by the given user.
   */
  async _getBrontoBoardsForUser(input: { user: User }): Promise<BrontoBoardDoc[]> {
    const { user: userId } = input;
    return await this.brontoBoards.find({ owner: userId }).toArray();
  }
}
```

***

### **2. Updated `src/BrontoCalendar/BrontoCalendarConcept.ts`**

This update modifies `createAssignment` and `createOfficeHours` to accept an optional `_id` parameter, enabling shared ID behavior and upsert logic. It also adds the `removeOH` action for symmetry with `removeWork`.

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

// Internal types for the actual documents stored in MongoDB collections.
// These are the concrete IDs of objects managed *by this concept*.
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
   * __action__: createAssignment (Modified to accept optional assignmentId for shared ID pattern)
   * __requires__:
   *   - `classId`: An ID identifying the class this assignment belongs to.
   *   - `name`: A non-empty string for the assignment's name.
   *   - `dueDate`: A valid Date object representing when the assignment is due.
   * __effects__:
   *   - Creates or updates an assignment object in the `assignments` collection.
   *   - Returns the ID of the newly created/updated assignment.
   * @param input An object containing assignment details and an optional `assignmentId` to use as `_id`.
   */
  async createAssignment({ assignmentId, classId, name, dueDate }: { assignmentId?: AssignmentRef; classId: ID; name: string; dueDate: Date }): Promise<{ assignmentId: AssignmentRef } | { error: string }> {
    // Preconditions: Validate input
    if (!classId || !name || name.trim() === "" || !dueDate || isNaN(dueDate.getTime())) {
      return { error: "Invalid assignment data: classId, name, and valid dueDate are required." };
    }

    const finalAssignmentId = assignmentId || (freshID() as AssignmentRef);
    const newAssignment: AssignmentDoc = {
      _id: finalAssignmentId,
      classId,
      name: name.trim(),
      dueDate,
    };

    const result = await this.assignments.updateOne(
      { _id: finalAssignmentId },
      { $set: newAssignment },
      { upsert: true } // Create if not exists, update if exists
    );

    if (!result.acknowledged) {
        return { error: `Failed to create/update assignment ${finalAssignmentId}.` };
    }

    return { assignmentId: finalAssignmentId };
  }

  /**
   * __action__: assignWork
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.
   * __effects__:
   *   - Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that day.
   *   - If the assignment was previously assigned to a different day, it's removed from that day first.
   * @param input An object containing the owner's ID and the assignment ID to assign.
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

    // First, remove the assignment from any other day it might be on (important for changeWork in BrontoBoard)
    // This ensures an assignment only appears on one day in the calendar.
    await this.calendarDays.updateMany(
      { calendarId: calendar._id, assignments: assignmentId },
      { $pull: { assignments: assignmentId } }
    );

    // Update or create the CalendarDay document for the correct due date
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id }, // Filter by _id and calendarId
      {
        $addToSet: { assignments: assignmentId }, // Add assignment ID if not already present
        $setOnInsert: { calendarId: calendar._id, date: assignment.dueDate, officeHours: [] }, // Set on insert if new doc
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
   * @param input An object containing the owner's ID and the assignment ID to remove.
   */
  async removeWork({ owner, assignmentId }: { owner: User; assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // We need the assignment's dueDate to find the correct calendar day to pull from.
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      // If the assignment isn't in BrontoCalendar's state, it can't be on a calendar day here.
      // Treat as successful removal of non-existent entry to avoid breaking syncs.
      return {};
    }

    const normalizedDueDate = this.normalizeDateToKey(assignment.dueDate);
    const calendarDayKey = `${calendar._id}_${normalizedDueDate}` as CalendarDayRef;

    // Remove the assignment ID from the CalendarDay document
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      { $pull: { assignments: assignmentId } }
    );

    // It's possible the assignment wasn't on this specific calendar day,
    // or the calendarDay document itself didn't exist. We still consider this
    // a successful "removal" from the calendar for idempotency.
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
   * @param input An object containing the ID of the assignment to delete.
   */
  async deleteAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<Empty | { error: string }> {
    const deleteResult = await this.assignments.deleteOne({ _id: assignmentId });
    if (deleteResult.deletedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    // Remove references to this assignment from all calendar days,
    // as it might be referenced on multiple user calendars if shared, or its date changed previously.
    await this.calendarDays.updateMany(
      { assignments: assignmentId },
      { $pull: { assignments: assignmentId } }
    );
    return {};
  }

  /**
   * __action__: createOfficeHours (Modified to accept optional officeHoursId for shared ID pattern)
   * __requires__:
   *   - `classId`: An ID identifying the class these office hours belong to.
   *   - `startTime`: A valid Date object for when office hours begin.
   *   - `duration`: A non-negative number (in minutes) for the duration.
   * __effects__:
   *   - Creates or updates an office hours object in the `officeHours` collection.
   *   - Returns the ID of the newly created/updated office hours.
   * @param input An object containing office hour details and an optional `officeHoursId` to use as `_id`.
   */
  async createOfficeHours({ officeHoursId, classId, startTime, duration }: { officeHoursId?: OfficeHoursRef; classId: ID; startTime: Date; duration: number }): Promise<{ officeHoursId: OfficeHoursRef } | { error: string }> {
    // Preconditions: Validate input
    if (!classId || !startTime || isNaN(startTime.getTime()) || duration == null || typeof duration !== "number" || duration < 0) {
      return { error: "Invalid office hours data: classId, valid startTime, and non-negative duration are required." };
    }

    const finalOHId = officeHoursId || (freshID() as OfficeHoursRef);
    const newOfficeHours: OfficeHoursDoc = {
      _id: finalOHId,
      classId,
      startTime,
      duration,
    };

    const result = await this.officeHours.updateOne(
      { _id: finalOHId },
      { $set: newOfficeHours },
      { upsert: true } // Create if not exists, update if exists
    );

    if (!result.acknowledged) {
        return { error: `Failed to create/update office hours ${finalOHId}.` };
    }

    return { officeHoursId: finalOHId };
  }

  /**
   * __action__: assignOH
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `officeHoursId`: The ID of an existing office hours object within the concept's `officeHours` state.
   * __effects__:
   *   - Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.
   *   - Creates a `CalendarDayDoc` if one doesn't exist for that day.
   *   - If the office hours were previously assigned to a different day, it's removed from that day first.
   * @param input An object containing the owner's ID and the office hours ID to assign.
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

    // First, remove the OH from any other day it might be on (important for changeOH in BrontoBoard)
    await this.calendarDays.updateMany(
      { calendarId: calendar._id, officeHours: officeHoursId },
      { $pull: { officeHours: officeHoursId } }
    );

    // Update or create the CalendarDay document for the correct start date
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      {
        $addToSet: { officeHours: officeHoursId }, // Add OH ID if not already present
        $setOnInsert: { calendarId: calendar._id, date: oh.startTime, assignments: [] }, // Set on insert if new doc
      },
      { upsert: true } // Create if not exists
    );

    return {};
  }

  /**
   * __action__: changeOH (This action is for BrontoCalendar to update its OWN OH details, not to be confused with BrontoBoard.changeOH)
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar associated with the office hours.
   *   - `officeHoursId`: The ID of an existing office hours object to modify.
   *   - `newDate`: A valid Date object for the new start time.
   *   - `newDuration`: A non-negative number for the new duration.
   * __effects__:
   *   - Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.
   *   - If the date component of `startTime` changes, the office hours entry is moved from its old calendar day to the new one.
   * @param input An object containing owner, office hour ID, new start date/time, and new duration.
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
    if (newDuration == null || typeof newDuration !== "number" || newDuration < 0) {
      return { error: "New duration must be a non-negative number" };
    }
    if (!newDate || isNaN(newDate.getTime())) {
      return { error: "Invalid newDate provided" };
    }

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

    // 2. Update CalendarDay documents if the date has changed (by pulling from old and adding to new)
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
    } else {
        // If date didn't change, but it's possible it was pulled due to previous `assignOH` (which pulls first).
        // Ensure it's re-added to the current day if it wasn't there for some reason.
        const currentDayKey = `${calendar._id}_${newNormalizedDate}` as CalendarDayRef;
        await this.calendarDays.updateOne(
          { _id: currentDayKey, calendarId: calendar._id },
          { $addToSet: { officeHours: officeHoursId } },
          { upsert: true }
        );
    }

    return {};
  }

  /**
   * __action__: removeOH
   * __requires__:
   *   - `owner`: The ID of the user who owns the calendar.
   *   - `officeHoursId`: The ID of an existing office hours within the concept's `officeHours` state.
   * __effects__:
   *   - Removes the `officeHoursId` from the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.
   * @param input An object containing the owner's ID and the office hours ID to remove.
   */
  async removeOH({ owner, officeHoursId }: { owner: User; officeHoursId: OfficeHoursRef }): Promise<Empty | { error: string }> {
    // Precondition 1: Find the calendar for the owner
    const calendar = await this.calendars.findOne({ owner });
    if (!calendar) {
      return { error: `No calendar found for user ${owner}` };
    }

    // We need the office hours' startTime to find the correct calendar day to pull from.
    const oh = await this.officeHours.findOne({ _id: officeHoursId });
    if (!oh) {
      // If the OH isn't in BrontoCalendar's state, it can't be on a calendar day here.
      return {}; // Treat as successful removal of non-existent entry
    }

    const normalizedStartTime = this.normalizeDateToKey(oh.startTime);
    const calendarDayKey = `${calendar._id}_${normalizedStartTime}` as CalendarDayRef;

    // Remove the office hour ID from the CalendarDay document
    await this.calendarDays.updateOne(
      { _id: calendarDayKey, calendarId: calendar._id },
      { $pull: { officeHours: officeHoursId } }
    );
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
   * @param input An object containing the ID of the office hours to delete.
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
  /**
   * __query__: _getCalendarForUser
   * __effects__: Returns the calendar document for a given user.
   * @param input An object containing the user ID.
   * @returns The CalendarDoc for the user, or null if not found.
   */
  async _getCalendarForUser({ user }: { user: User }): Promise<CalendarDoc | null> {
    return await this.calendars.findOne({ owner: user });
  }

  /**
   * __query__: _getAssignmentsOnDay
   * __effects__: Returns a list of assignment documents scheduled for a specific day on a specific calendar.
   * @param input An object containing the calendar ID and the date.
   * @returns An array of AssignmentDoc or an error object.
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
   * @param input An object containing the calendar ID and the date.
   * @returns An array of OfficeHoursDoc or an error object.
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
   * @param input An object containing the assignment ID.
   * @returns The AssignmentDoc or null if not found.
   */
  async _getAssignment({ assignmentId }: { assignmentId: AssignmentRef }): Promise<AssignmentDoc | null> {
    return await this.assignments.findOne({ _id: assignmentId });
  }

  /**
   * __query__: _getOfficeHours
   * __effects__: Returns an office hours document by its ID.
   * @param input An object containing the office hours ID.
   * @returns The OfficeHoursDoc or null if not found.
   */
  async _getOfficeHours({ officeHoursId }: { officeHoursId: OfficeHoursRef }): Promise<OfficeHoursDoc | null> {
    return await this.officeHours.findOne({ _id: officeHoursId });
  }
}

// --- TypeScript Interfaces for MongoDB Documents (remain the same) ---

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

***

### **3. Synchronization Files**

Create these files in `src/syncs/`.

#### **`src/syncs/user_auth.sync.ts`**

```typescript
// file: src/syncs/user_auth.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, UserAuthentication, Sessioning } from "@concepts";

/**
 * Sync: RegisterUserRequest
 * When a request for user registration comes in, attempt to register the user.
 */
export const RegisterUserRequest: Sync = ({ request, username, password }) => ({
  when: actions(
    [Requesting.request, { path: "/register", username, password }, { request }],
  ),
  then: actions(
    [UserAuthentication.register, { username, password }],
  ),
});

/**
 * Sync: RegisterUserSuccessResponse
 * When a user successfully registers, respond to the original request with the user ID.
 */
export const RegisterUserSuccessResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/register" }, { request }],
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Requesting.respond, { request, user: user, status: "registered" }], // Explicit success status
  ),
});

/**
 * Sync: RegisterUserErrorResponse
 * When user registration fails, respond to the original request with the error.
 */
export const RegisterUserErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/register" }, { request }],
    [UserAuthentication.register, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: error, status: "failed" }],
  ),
});

/**
 * Sync: AuthenticateUserRequest
 * When a request for user login comes in, attempt to authenticate the user.
 */
export const AuthenticateUserRequest: Sync = ({ request, username, password }) => ({
  when: actions(
    [Requesting.request, { path: "/login", username, password }, { request }],
  ),
  then: actions(
    [UserAuthentication.authenticate, { username, password }],
  ),
});

/**
 * Sync: AuthenticateUserSuccessCreateSession
 * When a user successfully authenticates, create a new session for them.
 */
export const AuthenticateUserSuccessCreateSession: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.authenticate, {}, { user }],
  ),
  then: actions(
    [Sessioning.createSession, { user }],
  ),
});

/**
 * Sync: AuthenticateUserSessionResponse
 * When a session is successfully created after authentication, respond with the session ID.
 */
export const AuthenticateUserSessionResponse: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [Sessioning.createSession, {}, { session }],
  ),
  then: actions(
    [Requesting.respond, { request, session: session, status: "logged_in" }],
  ),
});

/**
 * Sync: AuthenticateUserErrorResponse
 * When user authentication fails, respond to the original request with the error.
 */
export const AuthenticateUserErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.authenticate, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: error, status: "failed" }],
  ),
});

/**
 * Sync: LogoutUserRequest
 * When a request for user logout comes in, delete the session.
 */
export const LogoutUserRequest: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/logout", session }, { request }],
  ),
  then: actions(
    [Sessioning.deleteSession, { session }],
  ),
});

/**
 * Sync: LogoutUserResponse
 * When a user session is deleted, respond to the original request.
 */
export const LogoutUserResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.deleteSession, {}, {}], // No output for successful delete
  ),
  then: actions(
    [Requesting.respond, { request, status: "logged_out" }],
  ),
});

/**
 * Sync: LogoutUserErrorResponse
 * When deleting a session fails, respond with the error.
 */
export const LogoutUserErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.deleteSession, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: error, status: "failed" }],
  ),
});
```

#### **`src/syncs/brontoboard_requests.sync.ts`**

```typescript
// file: src/syncs/brontoboard_requests.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard, BrontoCalendar } from "@concepts";

/**
 * Sync: InitializeBrontoBoardRequest
 * Handles a request to initialize a BrontoBoard for a user.
 * This sync orchestrates getting the user, creating/getting a calendar, and then initializing the BrontoBoard.
 */
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, user, calendarId, brontoBoard, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/initialize", session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }

    const currentUser = frames[0][user];
    let currentCalendarId: ID;

    // 2. Try to get existing calendar or create one
    // We run createCalendar; if it errors because one exists, we query for it.
    const createCalendarResult = await BrontoCalendar.createCalendar({ user: currentUser });
    if ("error" in createCalendarResult) {
        // Calendar likely already exists. Try to retrieve it.
        const existingCalendar = await BrontoCalendar._getCalendarForUser({ user: currentUser });
        if (existingCalendar) {
            currentCalendarId = existingCalendar._id;
        } else {
            // Unexpected error or calendar truly not found after failed creation
            return new Frames({ ...originalFrame, [error]: `Failed to get or create calendar: ${createCalendarResult.error}` });
        }
    } else {
        currentCalendarId = createCalendarResult.calendarId;
    }
    
    // Enrich the frame with the resolved calendarId
    const frameWithCalendar = { ...frames[0], [calendarId]: currentCalendarId };

    // 3. Initialize BrontoBoard using the user and calendar ID
    const initBBResult = await BrontoBoard.initializeBB({ user: currentUser, calendar: currentCalendarId });
    if ("error" in initBBResult) {
      return new Frames({ ...frameWithCalendar, [error]: `Failed to initialize BrontoBoard: ${initBBResult.error}` });
    }

    // 4. Return the frame with the newly created BrontoBoard ID for the 'then' clause
    return new Frames({ ...frameWithCalendar, [brontoBoard]: initBBResult.brontoBoard });
  },
  then: actions(
    [Requesting.respond, { request, brontoBoard, status: "success" }, {}], // Success path
    [Requesting.respond, { request, error, status: "failed" }, {}],       // Error path from where clause
  ),
});


/**
 * Sync: CreateClassRequest
 * Handles a request to create a new class within a user's BrontoBoard.
 */
export const CreateClassRequest: Sync = (
  { request, session, brontoBoard, className, overview, owner, class: classId, error },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/class/create",
        session,
        brontoBoard,
        className,
        overview,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.createClass, { owner, brontoBoard, className, overview }],
    [Requesting.respond, { request, error, status: "failed" }, {}], // Respond if Sessioning._getUser failed
  ),
});

/**
 * Sync: CreateClassResponse
 * Responds to the client after a class creation attempt.
 */
export const CreateClassResponse: Sync = ({ request, class: classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId, error }], // Match on either success or error output
  ),
  then: actions(
    [Requesting.respond, { request, class: classId, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: AddWorkRequest
 * Handles a request to add a new assignment (work) to a class in a BrontoBoard.
 */
export const AddWorkRequest: Sync = (
  { request, session, class: classId, workName, dueDate, owner, assignment, error },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/work/add",
        session,
        class: classId,
        workName,
        dueDate,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    // Ensure dueDate is a Date object if coming from string in request
    frames = frames.map((f) => ({ ...f, [dueDate]: new Date(f[dueDate] as string) }));
    if (frames[0] && isNaN((frames[0][dueDate] as Date).getTime())) {
        return new Frames({ ...originalFrame, [error]: "Invalid date format for dueDate." });
    }
    return frames;
  },
  then: actions(
    [
      BrontoBoard.addWork,
      {
        owner,
        class: classId,
        workName,
        dueDate,
      },
    ],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: AddWorkResponse
 * Responds to the client after an assignment addition attempt.
 */
export const AddWorkResponse: Sync = ({ request, assignment, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment, error }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment: assignment, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: ChangeWorkRequest
 * Handles a request to change an existing assignment's due date in a BrontoBoard.
 */
export const ChangeWorkRequest: Sync = (
  { request, session, work, dueDate, owner, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/work/change", session, work, dueDate },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    frames = frames.map((f) => ({ ...f, [dueDate]: new Date(f[dueDate] as string) }));
    if (frames[0] && isNaN((frames[0][dueDate] as Date).getTime())) {
        return new Frames({ ...originalFrame, [error]: "Invalid date format for dueDate." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.changeWork, { owner, work, dueDate }],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: ChangeWorkResponse
 * Responds to the client after an assignment change attempt.
 */
export const ChangeWorkResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }], // BrontoBoard.changeWork returns Empty or {error}
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }, {}], // Success if no error
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: RemoveWorkRequest
 * Handles a request to remove an assignment from a class in a BrontoBoard.
 */
export const RemoveWorkRequest: Sync = ({ request, session, work, owner, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove", session, work }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner, work }],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: RemoveWorkResponse
 * Responds to the client after an assignment removal attempt.
 */
export const RemoveWorkResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: AddOfficeHoursRequest
 * Handles a request to add new office hours to a class in a BrontoBoard.
 */
export const AddOfficeHoursRequest: Sync = (
  { request, session, class: classId, OHTime, OHduration, owner, officeHours, error },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/officehours/add",
        session,
        class: classId,
        OHTime,
        OHduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    frames = frames.map((f) => ({ ...f, [OHTime]: new Date(f[OHTime] as string) }));
    if (frames[0] && isNaN((frames[0][OHTime] as Date).getTime())) {
        return new Frames({ ...originalFrame, [error]: "Invalid date format for OHTime." });
    }
    return frames;
  },
  then: actions(
    [
      BrontoBoard.addOH,
      {
        owner,
        class: classId,
        OHTime,
        OHduration,
      },
    ],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: AddOfficeHoursResponse
 * Responds to the client after an office hours addition attempt.
 */
export const AddOfficeHoursResponse: Sync = ({ request, officeHours, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours, error }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours: officeHours, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: ChangeOfficeHoursRequest
 * Handles a request to change existing office hours in a BrontoBoard.
 */
export const ChangeOfficeHoursRequest: Sync = (
  { request, session, oh, newDate, newduration, owner, error },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/officehours/change",
        session,
        oh,
        newDate,
        newduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    frames = frames.map((f) => ({ ...f, [newDate]: new Date(f[newDate] as string) }));
    if (frames[0] && isNaN((frames[0][newDate] as Date).getTime())) {
        return new Frames({ ...originalFrame, [error]: "Invalid date format for newDate." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.changeOH, { owner, oh, newDate, newduration }],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: ChangeOfficeHoursResponse
 * Responds to the client after an office hours change attempt.
 */
export const ChangeOfficeHoursResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: RemoveOfficeHoursRequest
 * Handles a request to remove office hours from a class in a BrontoBoard.
 */
export const RemoveOfficeHoursRequest: Sync = (
  { request, session, oh, owner, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/remove", session, oh }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { owner });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.removeOH, { owner, oh }],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});

/**
 * Sync: RemoveOfficeHoursResponse
 * Responds to the client after an office hours removal attempt.
 */
export const RemoveOfficeHoursResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/remove" }, { request }],
    [BrontoBoard.removeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});
```

#### **`src/syncs/brontoboard_calendar_integration.sync.ts`**

```typescript
// file: src/syncs/brontoboard_calendar_integration.sync.ts
import { actions, Sync, Frames } from "@engine";
import { BrontoBoard, BrontoCalendar } from "@concepts";

/**
 * Sync: IntegrateBrontoBoardAddWork
 * When BrontoBoard.addWork creates an assignment,
 * also ensure a corresponding assignment is created/updated in BrontoCalendar's state
 * and then assigned to the user's calendar.
 */
export const IntegrateBrontoBoardAddWork: Sync = (
  { owner, class: classId, workName, dueDate, assignment: assignmentId_BB },
) => ({
  when: actions(
    [
      BrontoBoard.addWork,
      { owner, class: classId, workName, dueDate },
      { assignment: assignmentId_BB },
    ],
  ),
  then: actions(
    // Create/update the assignment in BrontoCalendar's state (using shared ID)
    [
      BrontoCalendar.createAssignment,
      {
        assignmentId: assignmentId_BB, // Use the same ID as BrontoBoard
        classId,
        name: workName,
        dueDate,
      },
    ],
    // Then assign it to the user's calendar
    [BrontoCalendar.assignWork, { owner, assignmentId: assignmentId_BB }],
  ),
});

/**
 * Sync: IntegrateBrontoBoardChangeWork
 * When BrontoBoard.changeWork modifies an assignment's due date,
 * update the corresponding assignment in BrontoCalendar's state and re-assign it to the calendar.
 */
export const IntegrateBrontoBoardChangeWork: Sync = (
  { owner, work: assignmentId_BB, dueDate: newDueDate, classId, name },
) => ({
  when: actions(
    [
      BrontoBoard.changeWork,
      { owner, work: assignmentId_BB, dueDate: newDueDate },
      {}, // BrontoBoard.changeWork returns Empty on success, so no output pattern needed
    ],
  ),
  where: async (frames) => {
    // Need to query BrontoBoard for the other assignment details (classId, name)
    // as changeWork only provides owner, work, dueDate
    frames = await frames.query(
      BrontoBoard._getAssignment,
      { assignmentId: assignmentId_BB },
      { classId, name },
    );
    if (frames.length === 0) {
      // This should ideally not happen if changeWork succeeded.
      return new Frames(); // Propagate empty frames to prevent further actions
    }
    // Add the newDueDate to the frames for the then clause
    return frames.map(f => ({ ...f, [newDueDate]: newDueDate }));
  },
  then: actions(
    // Update the assignment in BrontoCalendar's state (using shared ID)
    [
      BrontoCalendar.createAssignment, // createAssignment acts as upsert
      {
        assignmentId: assignmentId_BB,
        classId,
        name,
        dueDate: newDueDate,
      },
    ],
    // Re-assign it to the user's calendar (this will remove from old date and add to new if date changed)
    [BrontoCalendar.assignWork, { owner, assignmentId: assignmentId_BB }],
  ),
});

/**
 * Sync: IntegrateBrontoBoardRemoveWork
 * When BrontoBoard.removeWork deletes an assignment,
 * remove it from the user's calendar and delete its entry from BrontoCalendar's state.
 */
export const IntegrateBrontoBoardRemoveWork: Sync = (
  { owner, work: assignmentId_BB },
) => ({
  when: actions(
    [BrontoBoard.removeWork, { owner, work: assignmentId_BB }, {}],
  ),
  then: actions(
    // Remove from calendar day (if it was assigned)
    [BrontoCalendar.removeWork, { owner, assignmentId: assignmentId_BB }],
    // Delete the assignment document from BrontoCalendar's state
    [BrontoCalendar.deleteAssignment, { assignmentId: assignmentId_BB }],
  ),
});

/**
 * Sync: IntegrateBrontoBoardAddOfficeHours
 * When BrontoBoard.addOH creates office hours,
 * also ensure corresponding office hours are created/updated in BrontoCalendar's state
 * and then assigned to the user's calendar.
 */
export const IntegrateBrontoBoardAddOfficeHours: Sync = (
  { owner, class: classId, OHTime, OHduration, officeHours: officeHoursId_BB },
) => ({
  when: actions(
    [
      BrontoBoard.addOH,
      { owner, class: classId, OHTime, OHduration },
      { officeHours: officeHoursId_BB },
    ],
  ),
  then: actions(
    // Create/update the office hours in BrontoCalendar's state (using shared ID)
    [
      BrontoCalendar.createOfficeHours,
      {
        officeHoursId: officeHoursId_BB, // Use the same ID as BrontoBoard
        classId,
        startTime: OHTime,
        duration: OHduration,
      },
    ],
    // Then assign it to the user's calendar
    [BrontoCalendar.assignOH, { owner, officeHoursId: officeHoursId_BB }],
  ),
});

/**
 * Sync: IntegrateBrontoBoardChangeOfficeHours
 * When BrontoBoard.changeOH modifies office hours,
 * update the corresponding office hours in BrontoCalendar's state and re-assign it to the calendar.
 */
export const IntegrateBrontoBoardChangeOfficeHours: Sync = (
  { owner, oh: officeHoursId_BB, newDate: newOHDate, newduration: newOHDuration, classId },
) => ({
  when: actions(
    [
      BrontoBoard.changeOH,
      { owner, oh: officeHoursId_BB, newDate: newOHDate, newduration: newOHDuration },
      {}, // BrontoBoard.changeOH returns Empty on success
    ],
  ),
  where: async (frames) => {
    // Need to query BrontoBoard for the other office hours details (classId)
    // as changeOH only provides owner, oh, newDate, newduration
    frames = await frames.query(
      BrontoBoard._getOfficeHours,
      { officeHoursId: officeHoursId_BB },
      { classId },
    );
    if (frames.length === 0) {
      // This should ideally not happen if changeOH succeeded.
      return new Frames();
    }
    // Add the newOHDate and newOHDuration to the frames for the then clause
    return frames.map(f => ({ ...f, [newOHDate]: newOHDate, [newOHDuration]: newOHDuration }));
  },
  then: actions(
    // Update the office hours in BrontoCalendar's state (using shared ID)
    [
      BrontoCalendar.createOfficeHours, // createOfficeHours acts as upsert
      {
        officeHoursId: officeHoursId_BB,
        classId,
        startTime: newOHDate,
        duration: newOHDuration,
      },
    ],
    // Re-assign it to the user's calendar (this will remove from old date and add to new if date changed)
    [BrontoCalendar.assignOH, { owner, officeHoursId: officeHoursId_BB }],
  ),
});

/**
 * Sync: IntegrateBrontoBoardRemoveOfficeHours
 * When BrontoBoard.removeOH deletes office hours,
 * remove it from the user's calendar and delete its entry from BrontoCalendar's state.
 */
export const IntegrateBrontoBoardRemoveOfficeHours: Sync = (
  { owner, oh: officeHoursId_BB },
) => ({
  when: actions(
    [BrontoBoard.removeOH, { owner, oh: officeHoursId_BB }, {}],
  ),
  then: actions(
    // Remove from calendar day (if it was assigned)
    [BrontoCalendar.removeOH, { owner, officeHoursId: officeHoursId_BB }],
    // Delete the office hours document from BrontoCalendar's state
    [BrontoCalendar.deleteOfficeHours, { officeHoursId: officeHoursId_BB }],
  ),
});
```

#### **`src/syncs/brontocalendar_requests.sync.ts`**

```typescript
// file: src/syncs/brontocalendar_requests.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoCalendar } from "@concepts";

/**
 * Sync: GetAssignmentsForDayRequest
 * Handles a request to retrieve all assignments for a specific day on the user's calendar.
 */
export const GetAssignmentsForDayRequest: Sync = (
  { request, session, user, calendarId, date: dateString, assignments, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/calendar/day/assignments", session, date: dateString },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original request context for potential error/empty response

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }

    const currentUser = frames[0][user];

    // 2. Get the user's calendar
    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: currentUser }, { calendarId });
    if (frames.length === 0) {
      // If no calendar found, return an empty assignments array as a valid response
      return new Frames({ ...originalFrame, [assignments]: [], status: "success" });
    }

    const currentCalendarId = frames[0][calendarId];
    const requestedDate = new Date(originalFrame[dateString] as string); // Use original date from request
    if (isNaN(requestedDate.getTime())) {
      return new Frames({ ...originalFrame, [error]: "Invalid date format for 'date'." });
    }

    // 3. Get assignments for the specified day on that calendar
    const assignmentsQueryResult = await BrontoCalendar._getAssignmentsOnDay({ calendarId: currentCalendarId, date: requestedDate });
    
    // Check if query returned an error or an empty array
    if ("error" in assignmentsQueryResult) {
        return new Frames({ ...originalFrame, [error]: assignmentsQueryResult.error, status: "failed" });
    }
    
    // Return the assignments array, potentially empty
    return new Frames({ ...originalFrame, [assignments]: assignmentsQueryResult });
  },
  then: actions(
    [Requesting.respond, { request, assignments, status: "success" }, {}], // Success path
    [Requesting.respond, { request, error, status: "failed" }, {}],       // Error path
  ),
});


/**
 * Sync: GetOfficeHoursForDayRequest
 * Handles a request to retrieve all office hours for a specific day on the user's calendar.
 */
export const GetOfficeHoursForDayRequest: Sync = (
  { request, session, user, calendarId, date: dateString, officeHours, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/calendar/day/officehours", session, date: dateString },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Authentication required or invalid session." });
    }

    const currentUser = frames[0][user];

    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: currentUser }, { calendarId });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [officeHours]: [], status: "success" });
    }

    const currentCalendarId = frames[0][calendarId];
    const requestedDate = new Date(originalFrame[dateString] as string);
    if (isNaN(requestedDate.getTime())) {
      return new Frames({ ...originalFrame, [error]: "Invalid date format for 'date'." });
    }

    const officeHoursQueryResult = await BrontoCalendar._getOfficeHoursOnDay({ calendarId: currentCalendarId, date: requestedDate });

    if ("error" in officeHoursQueryResult) {
        return new Frames({ ...originalFrame, [error]: officeHoursQueryResult.error, status: "failed" });
    }

    return new Frames({ ...originalFrame, [officeHours]: officeHoursQueryResult });
  },
  then: actions(
    [Requesting.respond, { request, officeHours, status: "success" }, {}],
    [Requesting.respond, { request, error, status: "failed" }, {}],
  ),
});
```
