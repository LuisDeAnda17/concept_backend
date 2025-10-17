---
timestamp: 'Wed Oct 15 2025 03:03:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_030313.480afdba.md]]'
content_id: d3eacfc46149d4343ab8bbf68535873766947adc69a3c05e6794237e88ebb6a9
---

# file: src/BrontoBoard/BrontoBoardConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as needed
import { freshID } from "../../utils/database.ts"; // Adjust path as needed

// Declare collection prefix, use concept name
const PREFIX = "BrontoBoard" + ".";

// Generic types of this concept (external IDs)
type User = ID;
type Calendar = ID; // Assuming Calendar is an external concept, here represented by its ID

// Internal IDs managed by this concept
type BrontoBoard = ID;
type Class = ID;
type Assignment = ID;
type OfficeHours = ID;

/**
 * Concept: BrontoBoard
 * Purpose: Associates a set of Assignments, an overview, office hours, and a name to a class,
 *          and that class to a BrontoBoard.
 *
 * Principle: Each Assignment, overview, and Office Hours are associated with one Class.
 *            Each class can only belong to one BrontoBoard.
 */
export default class BrontoBoardConcept {
  /**
   * State: A set of BrontoBoards, each with an owner (User) and a Calendar ID.
   * `brontoBoards` collection schema:
   *  - `_id`: BrontoBoard (ID of the board)
   *  - `owner`: User (ID of the user who owns the board)
   *  - `calendar`: Calendar (ID of the associated calendar)
   */
  brontoBoards: Collection<{
    _id: BrontoBoard;
    owner: User;
    calendar: Calendar;
  }>;

  /**
   * State: A set of Classes, each with a name, overview, and a link to its parent BrontoBoard.
   * `classes` collection schema:
   *  - `_id`: Class (ID of the class)
   *  - `brontoBoardId`: BrontoBoard (ID of the BrontoBoard this class belongs to)
   *  - `name`: string (Name of the class)
   *  - `overview`: string (Overview text for the class)
   */
  classes: Collection<{
    _id: Class;
    brontoBoardId: BrontoBoard;
    name: string;
    overview: string;
  }>;

  /**
   * State: A set of Assignments, each with a name, due date, and a link to its parent Class.
   * `assignments` collection schema:
   *  - `_id`: Assignment (ID of the assignment)
   *  - `classId`: Class (ID of the class this assignment belongs to)
   *  - `name`: string (Name of the assignment)
   *  - `dueDate`: Date (Due date of the assignment)
   */
  assignments: Collection<{
    _id: Assignment;
    classId: Class;
    name: string;
    dueDate: Date;
  }>;

  /**
   * State: A set of Office Hours, each with a time, duration, and a link to its parent Class.
   * `officeHours` collection schema:
   *  - `_id`: OfficeHours (ID of the office hours session)
   *  - `classId`: Class (ID of the class these office hours belong to)
   *  - `time`: Date (Scheduled start time for office hours)
   *  - `duration`: number (Duration of office hours in minutes/hours, depending on convention)
   */
  officeHours: Collection<{
    _id: OfficeHours;
    classId: Class;
    time: Date;
    duration: number;
  }>;

  constructor(private readonly db: Db) {
    this.brontoBoards = this.db.collection(PREFIX + "brontoBoards");
    this.classes = this.db.collection(PREFIX + "classes");
    this.assignments = this.db.collection(PREFIX + "assignments");
    this.officeHours = this.db.collection(PREFIX + "officeHours");
  }

  /**
   * Action: initializeBB
   *
   * @param {Object} args - The action arguments.
   * @param {User} args.user - The ID of the user who will own this BrontoBoard.
   * @param {Calendar} args.calendar - The ID of the calendar associated with this BrontoBoard.
   *
   * @returns {{brontoBoard: BrontoBoard} | {error: string}} The ID of the created BrontoBoard on success, or an error message.
   *
   * @requires A valid user and their calendar (IDs must be provided and not empty).
   *           A BrontoBoard must not already exist for the given user.
   * @effects Creates an empty BrontoBoard for the user, associating it with the provided calendar.
   */
  async initializeBB({ user, calendar }: { user: User; calendar: Calendar }): Promise<{ brontoBoard: BrontoBoard } | { error: string }> {
    // Precondition: user and calendar IDs must be provided
    if (!user) {
      return { error: "User ID must be provided." };
    }
    if (!calendar) {
      return { error: "Calendar ID must be provided." };
    }

    // Precondition: Check if a BrontoBoard already exists for this user
    const existingBoard = await this.brontoBoards.findOne({ owner: user });
    if (existingBoard) {
      return { error: "A BrontoBoard already exists for this user." };
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
   * Action: createClass
   *
   * @param {Object} args - The action arguments.
   * @param {BrontoBoard} args.brontoBoardId - The ID of the BrontoBoard to which this class will belong.
   * @param {string} args.name - The name of the new class.
   * @param {string} args.overview - An overview description for the new class.
   *
   * @returns {{class: Class} | {error: string}} The ID of the created Class on success, or an error message.
   *
   * @requires The `brontoBoardId` must exist.
   *           The `name` cannot be an empty string.
   *           (Implicit: caller must be authorized to create classes on this BrontoBoard, typically handled by a sync).
   * @effects Creates a new class document, linking it to the specified BrontoBoard.
   */
  async createClass({ brontoBoardId, name, overview }: { brontoBoardId: BrontoBoard; name: string; overview: string }): Promise<{ class: Class } | { error: string }> {
    // Precondition: brontoBoardId must exist
    const board = await this.brontoBoards.findOne({ _id: brontoBoardId });
    if (!board) {
      return { error: `BrontoBoard with ID ${brontoBoardId} not found.` };
    }

    // Precondition: className not be an empty String
    if (!name || name.trim() === "") {
      return { error: "Class name cannot be empty." };
    }

    const newClassId = freshID();
    const result = await this.classes.insertOne({
      _id: newClassId,
      brontoBoardId: brontoBoardId,
      name: name,
      overview: overview,
    });

    if (!result.acknowledged) {
      return { error: "Failed to create class." };
    }

    return { class: newClassId };
  }

  /**
   * Action: addWork
   *
   * @param {Object} args - The action arguments.
   * @param {Class} args.classId - The ID of the class to which this assignment will be added.
   * @param {string} args.workName - The name of the assignment.
   * @param {Date} args.dueDate - The due date of the assignment.
   *
   * @returns {{assignment: Assignment} | {error: string}} The ID of the created Assignment on success, or an error message.
   *
   * @requires The `classId` must exist.
   *           `workName` must not be an empty string.
   *           `dueDate` must not be before the current date (allowing today).
   *           (Implicit: caller must be authorized for this class, typically handled by a sync).
   * @effects Creates a new assignment document, linking it to the specified Class.
   */
  async addWork({ classId, workName, dueDate }: { classId: Class; workName: string; dueDate: Date }): Promise<{ assignment: Assignment } | { error: string }> {
    // Precondition: classId must exist
    const _class = await this.classes.findOne({ _id: classId });
    if (!_class) {
      return { error: `Class with ID ${classId} not found.` };
    }

    // Precondition: workName not be empty
    if (!workName || workName.trim() === "") {
      return { error: "Assignment name cannot be empty." };
    }

    // Precondition: dueDate be not before the current date
    const now = new Date();
    // Normalize dates to just compare day, month, year for "not before current date"
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (inputDateMidnight < todayMidnight) {
      return { error: "Due date cannot be before the current date." };
    }

    const newAssignmentId = freshID();
    const result = await this.assignments.insertOne({
      _id: newAssignmentId,
      classId: classId,
      name: workName,
      dueDate: dueDate,
    });

    if (!result.acknowledged) {
      return { error: "Failed to add assignment." };
    }

    return { assignment: newAssignmentId };
  }

  /**
   * Action: changeWork
   *
   * @param {Object} args - The action arguments.
   * @param {Assignment} args.assignmentId - The ID of the assignment to modify.
   * @param {Date} args.newDueDate - The new due date for the assignment.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `assignmentId` must exist.
   *           `newDueDate` must be a future date (strictly after the current moment).
   *           (Implicit: caller must be authorized for this assignment/class, typically handled by a sync).
   * @effects Modifies the specified Assignment's due date.
   */
  async changeWork({ assignmentId, newDueDate }: { assignmentId: Assignment; newDueDate: Date }): Promise<Empty | { error: string }> {
    // Precondition: assignmentId must exist
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    // Precondition: newDueDate be a future date (strictly greater than now)
    const now = new Date();
    if (newDueDate <= now) {
      return { error: "New due date must be in the future." };
    }

    const result = await this.assignments.updateOne(
      { _id: assignmentId },
      { $set: { dueDate: newDueDate } },
    );

    if (!result.acknowledged || result.matchedCount === 0) {
      return { error: "Failed to change assignment due date." };
    }

    return {};
  }

  /**
   * Action: removeWork
   *
   * @param {Object} args - The action arguments.
   * @param {Assignment} args.assignmentId - The ID of the assignment to remove.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `assignmentId` must exist.
   *           (Implicit: caller must be authorized for this assignment/class, typically handled by a sync).
   * @effects Removes the specified Assignment from its class.
   */
  async removeWork({ assignmentId }: { assignmentId: Assignment }): Promise<Empty | { error: string }> {
    // Precondition: assignmentId must exist
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    const result = await this.assignments.deleteOne({ _id: assignmentId });

    if (!result.acknowledged || result.deletedCount === 0) {
      return { error: "Failed to remove assignment." };
    }

    return {};
  }

  /**
   * Action: addOH
   *
   * @param {Object} args - The action arguments.
   * @param {Class} args.classId - The ID of the class to which these office hours will be added.
   * @param {Date} args.OHTime - The start time of the office hours.
   * @param {number} args.OHduration - The duration of the office hours (e.g., in minutes).
   *
   * @returns {{officeHours: OfficeHours} | {error: string}} The ID of the created OfficeHours on success, or an error message.
   *
   * @requires A valid `classId` must exist.
   *           `OHTime` must be a future date (strictly after the current moment).
   *           `OHduration` must be non-negative.
   *           (Implicit: caller must be authorized for this class, typically handled by a sync).
   * @effects Creates new OfficeHours for the specified Class.
   */
  async addOH({ classId, OHTime, OHduration }: { classId: Class; OHTime: Date; OHduration: number }): Promise<{ officeHours: OfficeHours } | { error: string }> {
    // Precondition: classId must exist
    const _class = await this.classes.findOne({ _id: classId });
    if (!_class) {
      return { error: `Class with ID ${classId} not found.` };
    }

    // Precondition: OHTime be a future date (strictly after current moment)
    const now = new Date();
    if (OHTime <= now) {
      return { error: "Office hours time must be in the future." };
    }

    // Precondition: OHDuration be non-negative
    if (OHduration < 0) {
      return { error: "Office hours duration cannot be negative." };
    }

    const newOfficeHoursId = freshID();
    const result = await this.officeHours.insertOne({
      _id: newOfficeHoursId,
      classId: classId,
      time: OHTime,
      duration: OHduration,
    });

    if (!result.acknowledged) {
      return { error: "Failed to add office hours." };
    }

    return { officeHours: newOfficeHoursId };
  }

  /**
   * Action: changeOH
   *
   * @param {Object} args - The action arguments.
   * @param {OfficeHours} args.officeHoursId - The ID of the office hours session to modify.
   * @param {Date} args.newTime - The new start time for the office hours.
   * @param {number} args.newDuration - The new duration for the office hours.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `officeHoursId` must exist.
   *           `newTime` must be a future date (strictly after the current moment).
   *           `newDuration` must be non-negative.
   *           (Implicit: caller must be authorized for this office hours/class, typically handled by a sync).
   * @effects Modifies the specified OfficeHours' time and duration.
   */
  async changeOH({ officeHoursId, newTime, newDuration }: { officeHoursId: OfficeHours; newTime: Date; newDuration: number }): Promise<Empty | { error: string }> {
    // Precondition: officeHoursId must exist
    const officeHours = await this.officeHours.findOne({ _id: officeHoursId });
    if (!officeHours) {
      return { error: `Office Hours with ID ${officeHoursId} not found.` };
    }

    // Precondition: newTime be a future date (strictly after current moment)
    const now = new Date();
    if (newTime <= now) {
      return { error: "New office hours time must be in the future." };
    }

    // Precondition: newDuration be non-negative
    if (newDuration < 0) {
      return { error: "New office hours duration cannot be negative." };
    }

    const result = await this.officeHours.updateOne(
      { _id: officeHoursId },
      { $set: { time: newTime, duration: newDuration } },
    );

    if (!result.acknowledged || result.matchedCount === 0) {
      return { error: "Failed to change office hours." };
    }

    return {};
  }

  // --- Queries ---
  /**
   * Query: _getBrontoBoardByUser
   * Effects: Returns the BrontoBoard associated with a given user.
   */
  async _getBrontoBoardByUser({ user }: { user: User }): Promise<{ brontoBoard?: BrontoBoard; error?: string }> {
    if (!user) {
      return { error: "User ID must be provided." };
    }
    const board = await this.brontoBoards.findOne({ owner: user });
    if (!board) {
      return { error: `No BrontoBoard found for user ${user}.` };
    }
    return { brontoBoard: board._id };
  }

  /**
   * Query: _getClassesByBrontoBoard
   * Effects: Returns all classes belonging to a specific BrontoBoard.
   */
  async _getClassesByBrontoBoard({ brontoBoardId }: { brontoBoardId: BrontoBoard }): Promise<{ classes: Class[] } | { error: string }> {
    if (!brontoBoardId) {
      return { error: "BrontoBoard ID must be provided." };
    }
    const classes = await this.classes.find({ brontoBoardId: brontoBoardId }).toArray();
    return { classes: classes.map(c => c._id) };
  }

  /**
   * Query: _getAssignmentsByClass
   * Effects: Returns all assignments belonging to a specific Class.
   */
  async _getAssignmentsByClass({ classId }: { classId: Class }): Promise<{ assignments: Assignment[] } | { error: string }> {
    if (!classId) {
      return { error: "Class ID must be provided." };
    }
    const assignments = await this.assignments.find({ classId: classId }).toArray();
    return { assignments: assignments.map(a => a._id) };
  }

  /**
   * Query: _getOfficeHoursByClass
   * Effects: Returns all office hours belonging to a specific Class.
   */
  async _getOfficeHoursByClass({ classId }: { classId: Class }): Promise<{ officeHours: OfficeHours[] } | { error: string }> {
    if (!classId) {
      return { error: "Class ID must be provided." };
    }
    const officeHours = await this.officeHours.find({ classId: classId }).toArray();
    return { officeHours: officeHours.map(oh => oh._id) };
  }
}
```
