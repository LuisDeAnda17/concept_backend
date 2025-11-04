---
timestamp: 'Mon Nov 03 2025 19:39:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_193900.3916a57e.md]]'
content_id: 30c45d51918eddfd0cc9efbc1f9e5783161812c7e5f69cf31188bedef9967fc7
---

# response:

Okay, here are the synchronizations for the `BrontoBoardConcept`, along with the necessary additions to the `BrontoBoardConcept.ts` file for the new queries needed by the syncs for robust access control.

First, let's update the `BrontoBoardConcept.ts` file with the new queries:

## file: src/BrontoBoard/BrontoBoardConcept.ts (Updated)

```typescript
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
type Calendar = ID;

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
   * __requires:__ A valid user and their calendar.
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

    // No explicit precondition check for user/calendar validity beyond them being IDs.
    // The system assumes that IDs passed are meaningful from other concepts.

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

    // Precondition 1: User is owner of the BrontoBoard
    const brontoBoardCheck = await this._getBrontoBoardIfOwned(
      brontoBoard,
      owner,
    );
    if ("error" in brontoBoardCheck) {
      return brontoBoardCheck;
    }

    // Precondition 2: Classname not be an empty String
    if (!className || className.trim() === "") {
      return { error: "Class name cannot be empty." };
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

    // Precondition 1: User is owner of the BrontoBoard associated with the class
    const classCheck = await this._getClassIfBrontoBoardOwned(classId, owner);
    if ("error" in classCheck) {
      return classCheck;
    }

    // Precondition 2: workName not empty
    if (!workName || workName.trim() === "") {
      return { error: "Work name cannot be empty." };
    }

    // Precondition 3: dueDate not empty and not before current date
    // Note: Assuming a valid Date object is provided.
    if (!dueDate || isNaN(dueDate.getTime()) || dueDate < new Date()) {
      return { error: "Due date must be a valid future date." };
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

    // Precondition 1: User is owner of the BrontoBoard associated with the class of the assignment
    const classCheck = await this._getClassIfBrontoBoardOwned(
      assignment.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    // Precondition 2: dueDate must be a future date
    if (!dueDate || isNaN(dueDate.getTime()) || dueDate < new Date()) {
      return { error: "New due date must be a valid future date." };
    }

    const result = await this.assignments.updateOne(
      { _id: assignmentId },
      { $set: { dueDate: dueDate } },
    );

    if (result.matchedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} not found for update.` };
    }
    // If matchedCount > 0 but modifiedCount is 0, it means the document existed
    // but the data being set was identical to the existing data.
    if (result.modifiedCount === 0) {
      return { error: `Assignment with ID ${assignmentId} due date was already ${dueDate.toISOString()}.` };
    }

    return {};
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

    // Precondition 1: User is owner of the BrontoBoard associated with the class of the assignment
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
   *              (Note: The original spec mentioned "Assignment of a Class of the owner",
   *              which was likely a typo and has been corrected to refer to the Class itself for Office Hours).
   * __effects:__ Creates Office Hours under the Class of the owner with the given start time and duration.
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

    // Precondition 1: User is owner of the BrontoBoard associated with the class
    const classCheck = await this._getClassIfBrontoBoardOwned(classId, owner);
    if ("error" in classCheck) {
      return classCheck;
    }

    // Precondition 2: OHTime must be a valid future date
    if (!OHTime || isNaN(OHTime.getTime()) || OHTime < new Date()) {
      return { error: "Office hours start time must be a valid future date." };
    }

    // Precondition 3: OHDuration must be a non-negative number
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
   * __effects:__ Modifies the office hours to the new date and duration.
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

    // Precondition 1: User is owner of the BrontoBoard associated with the class of the office hours
    const classCheck = await this._getClassIfBrontoBoardOwned(
      officeHours.classId,
      owner,
    );
    if ("error" in classCheck) {
      return classCheck;
    }

    // Precondition 2: newDate must be a valid future date
    if (!newDate || isNaN(newDate.getTime()) || newDate < new Date()) {
      return { error: "New office hours start time must be a valid future date." };
    }

    // Precondition 3: newduration must be a non-negative number
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
    // If matchedCount > 0 but modifiedCount is 0, it means the document existed
    // but the data being set was identical to the existing data.
    if (result.modifiedCount === 0) {
      return {
        error: `Office hours with ID ${officeHoursId} already had start time ${newDate.toISOString()} and duration ${newduration}.`,
      };
    }

    return {};
  }

  // --- Concept Queries ---
  // Queries are marked with a leading underscore and typically return collections or filtered data.

  /**
   * _query: _getAssignmentsForClass (class: ID): (assignment: AssignmentDoc)[]
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of assignments for the given class.
   */
  async _getAssignmentsForClass(input: { class: ID }): Promise<AssignmentDoc[]> {
    const { class: classId } = input;
    return await this.assignments.find({ classId: classId }).toArray();
  }

  /**
   * _query: _getOfficeHoursForClass (class: ID): (officeHours: OfficeHourDoc)[]
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of office hours for the given class.
   */
  async _getOfficeHoursForClass(input: { class: ID }): Promise<OfficeHourDoc[]> {
    const { class: classId } = input;
    return await this.officeHours.find({ classId: classId }).toArray();
  }

  /**
   * _query: _getClassesForBrontoBoard (brontoBoard: ID): (class: ClassDoc)[]
   * @param input An object containing the BrontoBoard ID.
   *   - `brontoBoard`: The ID of the BrontoBoard.
   * @returns An array of classes for the given BrontoBoard.
   */
  async _getClassesForBrontoBoard(input: { brontoBoard: ID }): Promise<ClassDoc[]> {
    const { brontoBoard: brontoBoardId } = input;
    return await this.classes.find({ brontoBoardId: brontoBoardId }).toArray();
  }

  /**
   * _query: _getBrontoBoardsForUser (user: User): (brontoBoard: BrontoBoardDoc)[]
   * @param input An object containing the user ID.
   *   - `user`: The ID of the user.
   * @returns An array of BrontoBoards owned by the given user.
   */
  async _getBrontoBoardsForUser(input: { user: User }): Promise<BrontoBoardDoc[]> {
    const { user: userId } = input;
    return await this.brontoBoards.find({ owner: userId }).toArray();
  }

  /**
   * _query: _getBrontoBoardOwner (brontoBoard: ID): (owner: User) | (error: string)
   *
   * **requires**: The BrontoBoard with the given ID exists.
   * **effects**: Returns the owner (User ID) of the BrontoBoard. Returns an error if the BrontoBoard is not found.
   * @param input An object containing the BrontoBoard ID.
   *   - `brontoBoard`: The ID of the BrontoBoard.
   * @returns An array of objects containing the owner ID, or an error object.
   */
  async _getBrontoBoardOwner(
    input: { brontoBoard: ID },
  ): Promise<Array<{ owner: User }> | { error: string }> {
    const { brontoBoard } = input;
    const bbDoc = await this.brontoBoards.findOne({ _id: brontoBoard });
    if (!bbDoc) {
      return { error: `BrontoBoard with ID ${brontoBoard} not found.` };
    }
    return [{ owner: bbDoc.owner }];
  }

  /**
   * _query: _getClassBrontoBoardOwner (class: ID): (brontoBoard: ID, owner: User) | (error: string)
   *
   * **requires**: The Class with the given ID exists.
   * **effects**: Returns the ID of the parent BrontoBoard and its owner. Returns an error if the Class is not found.
   * @param input An object containing the Class ID.
   *   - `class`: The ID of the Class.
   * @returns An array of objects containing the BrontoBoard ID and owner ID, or an error object.
   */
  async _getClassBrontoBoardOwner(
    input: { class: ID },
  ): Promise<Array<{ brontoBoard: ID, owner: User }> | { error: string }> {
    const { class: classId } = input;
    const classDoc = await this.classes.findOne({ _id: classId });
    if (!classDoc) {
      return { error: `Class with ID ${classId} not found.` };
    }
    const bbDoc = await this.brontoBoards.findOne({ _id: classDoc.brontoBoardId });
    if (!bbDoc) { // Should not happen if data integrity is maintained, but defensive.
      return { error: `Associated BrontoBoard ${classDoc.brontoBoardId} not found for Class ${classId}.` };
    }
    return [{ brontoBoard: bbDoc._id, owner: bbDoc.owner }];
  }
}
```

***

Now, here are the synchronizations in `src/syncs/brontoboard.sync.ts`:

## file: src/syncs/brontoboard.sync.ts

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";

// --- Helper for consistent error responses ---
// If a WHERE clause explicitly creates an error frame, it will have this structure.
// This allows the THEN clause to be unified to Requesting.respond({ request, error })
// Note: This relies on the engine allowing `Requesting.respond` to take either a `results` or `error` binding.
// The document shows examples where `then` clauses are distinct for `question` vs `error`,
// so for a strict interpretation, explicit error syncs for action/query outputs are preferred.
// However, for filter-based access denied, creating an explicit error frame in `where` is the shown pattern.

// --- BrontoBoard.initializeBB Syncs ---
// 1. Request to initialize a BrontoBoard
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, calendar, user },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init", session, calendar }, { request }],
  ),
  where: async (frames) => {
    // Authenticate user via session. If Sessioning._getUser returns an error,
    // frames.query will result in an empty `frames` set here, which will be caught by InitializeBrontoBoardAuthError.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    // Calls the BrontoBoard action. Output `brontoBoard` (on success) or `error` (on failure)
    // will be matched by separate response/error syncs.
    [BrontoBoard.initializeBB, { user, calendar }, {}],
  ),
});

// 2. Respond to successful BrontoBoard initialization
export const InitializeBrontoBoardResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }], // Matches success output
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

// 3. Respond to BrontoBoard.initializeBB action error
export const InitializeBrontoBoardActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 4. Respond to authentication error during BrontoBoard initialization
export const InitializeBrontoBoardAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init", session }, { request }],
    [Sessioning._getUser, { session }, { error }], // Matches error output from Sessioning._getUser
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.createClass Syncs ---
export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoard, className, overview },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create", session, brontoBoard, className, overview }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.createClass, { owner: user, brontoBoard, className, overview }, {}],
  ),
});

export const CreateClassResponse: Sync = (
  { request, class: createdClass },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: createdClass }],
  ),
  then: actions(
    [Requesting.respond, { request, class: createdClass }],
  ),
});

export const CreateClassActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const CreateClassAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.addWork Syncs ---
export const AddWorkRequest: Sync = (
  { request, session, user, class: classId, workName, dueDate },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/add", session, class: classId, workName, dueDate }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.addWork, { owner: user, class: classId, workName, dueDate }, {}],
  ),
});

export const AddWorkResponse: Sync = (
  { request, assignment },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

export const AddWorkActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const AddWorkAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/add", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.changeWork Syncs ---
export const ChangeWorkRequest: Sync = (
  { request, session, user, work, dueDate },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/change", session, work, dueDate }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work, dueDate }, {}],
  ),
});

export const ChangeWorkResponse: Sync = (
  { request },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches success (empty output)
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const ChangeWorkActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const ChangeWorkAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/change", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.removeWork Syncs ---
export const RemoveWorkRequest: Sync = (
  { request, session, user, work },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove", session, work }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work }, {}],
  ),
});

export const RemoveWorkResponse: Sync = (
  { request },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches success (empty output)
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const RemoveWorkActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const RemoveWorkAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/work/remove", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.addOH Syncs ---
export const AddOHRequest: Sync = (
  { request, session, user, class: classId, OHTime, OHduration },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add", session, class: classId, OHTime, OHduration }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.addOH, { owner: user, class: classId, OHTime, OHduration }, {}],
  ),
});

export const AddOHResponse: Sync = (
  { request, officeHours },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const AddOHActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const AddOHAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard.changeOH Syncs ---
export const ChangeOHRequest: Sync = (
  { request, session, user, oh, newDate, newduration },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change", session, oh, newDate, newduration }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.changeOH, { owner: user, oh, newDate, newduration }, {}],
  ),
});

export const ChangeOHResponse: Sync = (
  { request },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches success (empty output)
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const ChangeOHActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const ChangeOHAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- BrontoBoard Queries ---

// --- _getBrontoBoardsForUser Query Syncs ---
export const GetBrontoBoardsForUserRequest: Sync = (
  { request, session, user, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/list", session }, { request }],
  ),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Auth failed, handled by AuthError sync.

    // 2. Query BrontoBoards for the authenticated user
    return await frames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard: "item" })
      .collectAs(["item"], results); // Collect all found brontoBoards into `results` array
  },
  then: actions(
    [Requesting.respond, { request, results }], // Responds with results (could be empty array)
  ),
});

export const GetBrontoBoardsForUserAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/list", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- _getClassesForBrontoBoard Query Syncs ---
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, user, brontoBoard, bbOwner, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/list", session, brontoBoard }, { request }],
  ),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Auth failed, handled by AuthError sync.

    // 2. Get BrontoBoard owner for ownership verification
    frames = await frames.query(BrontoBoard._getBrontoBoardOwner, { brontoBoard }, { owner: bbOwner });
    if (frames.length === 0) return frames; // BrontoBoard not found, handled by NotFoundOrOwnershipError sync.

    // 3. Verify ownership: filter frames where session user matches BrontoBoard owner
    // If this filter empties frames, the 'then' clause won't fire. This specific
    // "Access Denied: User is not the owner" case would require a global timeout handler
    // or a more advanced engine feature to explicitly respond in this flow.
    frames = frames.filter(($) => $[user] === $[bbOwner]);
    if (frames.length === 0) {
      // User authenticated but not the owner. Return an empty Frames to prevent 'then' from firing.
      // This implicitly causes a timeout for the client unless a global mechanism handles unresponded requests.
      // For strict explicit responses, an additional sync or Requesting.deny would be needed here.
      return frames;
    }

    // 4. Query for classes within the owned BrontoBoard
    return await frames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard }, { class: "item" })
      .collectAs(["item"], results);
  },
  then: actions(
    [Requesting.respond, { request, results }], // Responds with results (could be empty array)
  ),
});

export const GetClassesForBrontoBoardAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/list", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetClassesForBrontoBoardNotFoundOrOwnershipError: Sync = (
  { request, session, brontoBoard, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/list", session, brontoBoard }, { request }],
    [BrontoBoard._getBrontoBoardOwner, { brontoBoard }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- _getAssignmentsForClass Query Syncs ---
export const GetAssignmentsForClassRequest: Sync = (
  { request, session, user, class: classId, bbOwner, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/list", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get BrontoBoard owner for class's parent BrontoBoard
    frames = await frames.query(BrontoBoard._getClassBrontoBoardOwner, { class: classId }, { owner: bbOwner });
    if (frames.length === 0) return frames;

    // 3. Verify ownership
    frames = frames.filter(($) => $[user] === $[bbOwner]);
    if (frames.length === 0) return frames; // User not owner.

    // 4. Query for assignments
    return await frames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment: "item" })
      .collectAs(["item"], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetAssignmentsForClassAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/list", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetAssignmentsForClassNotFoundError: Sync = (
  { request, session, class: classId, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/list", session, class: classId }, { request }],
    [BrontoBoard._getClassBrontoBoardOwner, { class: classId }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- _getOfficeHoursForClass Query Syncs ---
export const GetOHForClassRequest: Sync = (
  { request, session, user, class: classId, bbOwner, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/list", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get BrontoBoard owner for class's parent BrontoBoard
    frames = await frames.query(BrontoBoard._getClassBrontoBoardOwner, { class: classId }, { owner: bbOwner });
    if (frames.length === 0) return frames;

    // 3. Verify ownership
    frames = frames.filter(($) => $[user] === $[bbOwner]);
    if (frames.length === 0) return frames; // User not owner.

    // 4. Query for office hours
    return await frames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHours: "item" })
      .collectAs(["item"], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetOHForClassAuthError: Sync = (
  { request, session, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/list", session }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetOHForClassNotFoundError: Sync = (
  { request, session, class: classId, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/list", session, class: classId }, { request }],
    [BrontoBoard._getClassBrontoBoardOwner, { class: classId }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
