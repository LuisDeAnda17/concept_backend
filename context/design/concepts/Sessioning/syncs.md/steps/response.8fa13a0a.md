---
timestamp: 'Mon Nov 03 2025 19:47:47 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_194747.dfce8ec9.md]]'
content_id: 8fa13a0a4320164b8e5661bdda39fc3c1324c22225259fb3ed664702e6c56bef
---

# response:

```typescript
// file: src/BrontoBoard/BrontoBoardConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID and Empty
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides freshID

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
   * _query: _getAssignmentsForClass
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of assignments for the given class.
   */
  async _getAssignmentsForClass(input: { class: ID }): Promise<AssignmentDoc[]> {
    const { class: classId } = input;
    return await this.assignments.find({ classId: classId }).toArray();
  }

  /**
   * _query: _getOfficeHoursForClass
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array of office hours for the given class.
   */
  async _getOfficeHoursForClass(input: { class: ID }): Promise<OfficeHourDoc[]> {
    const { class: classId } = input;
    return await this.officeHours.find({ classId: classId }).toArray();
  }

  /**
   * _query: _getClassesForBrontoBoard
   * @param input An object containing the BrontoBoard ID.
   *   - `brontoBoard`: The ID of the BrontoBoard.
   * @returns An array of classes for the given BrontoBoard.
   */
  async _getClassesForBrontoBoard(input: { brontoBoard: ID }): Promise<ClassDoc[]> {
    const { brontoBoard: brontoBoardId } = input;
    return await this.classes.find({ brontoBoardId: brontoBoardId }).toArray();
  }

  /**
   * _query: _getBrontoBoardsForUser
   * @param input An object containing the user ID.
   *   - `user`: The ID of the user.
   * @returns An array of BrontoBoards owned by the given user.
   */
  async _getBrontoBoardsForUser(input: { user: User }): Promise<BrontoBoardDoc[]> {
    const { user: userId } = input;
    return await this.brontoBoards.find({ owner: userId }).toArray();
  }
    /**
   * _query: _getBrontoBoardById
   * @param input An object containing the BrontoBoard ID.
   * @returns An array containing the BrontoBoardDoc if found, otherwise empty.
   */
  async _getBrontoBoardById(input: { brontoBoard: ID }): Promise<BrontoBoardDoc[]> {
    const { brontoBoard } = input;
    const doc = await this.brontoBoards.findOne({ _id: brontoBoard });
    return doc ? [doc] : [];
  }

  /**
   * _query: _getClassById
   * @param input An object containing the Class ID.
   * @returns An array containing the ClassDoc if found, otherwise empty.
   */
  async _getClassById(input: { class: ID }): Promise<ClassDoc[]> {
    const { class: classId } = input;
    const doc = await this.classes.findOne({ _id: classId });
    return doc ? [doc] : [];
  }

    async _getAssignmentById(input: { assignment: ID }): Promise<AssignmentDoc[]> {
    const { assignment } = input;
    const doc = await this.assignments.findOne({ _id: assignment });
    return doc ? [doc] : [];
  }

  /**
   * _query: _getOfficeHourById
   * @param input An object containing the OfficeHour ID.
   * @returns An array containing the OfficeHourDoc if found, otherwise empty.
   */
  async _getOfficeHourById(input: { officeHour: ID }): Promise<OfficeHourDoc[]> {
    const { officeHour } = input;
    const doc = await this.officeHours.findOne({ _id: officeHour });
    return doc ? [doc] : [];
  }
}
```
