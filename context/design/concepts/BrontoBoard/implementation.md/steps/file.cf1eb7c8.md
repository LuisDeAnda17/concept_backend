---
timestamp: 'Wed Oct 15 2025 14:08:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_140843.c714def1.md]]'
content_id: cf1eb7c852cf1e1c99741be35c63465a268692bc828b7be43ca565dd395d36a4
---

# file: src/BrontoBoard/BrontoBoardConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as needed based on your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as needed based on your project structure

// Declare collection prefix, use concept name
const PREFIX = "BrontoBoard" + ".";

// Generic types of this concept (external IDs)
type User = ID;
type Calendar = ID; // Assuming Calendar is an external concept, here represented by its ID

// Internal IDs managed by this concept
type BrontoBoardId = ID;
type ClassId = ID;
type AssignmentId = ID;
type OfficeHoursId = ID;

/**
 * Concept: BrontoBoard
 * Purpose: Manages a structured academic board for a user, comprising classes, assignments,
 *          and office hours, enabling organization and tracking of educational content.
 *
 * Principle: A user initializes a BrontoBoard, then creates classes within it. For each class,
 *            they can add and manage assignments with due dates and schedule office hours.
 *            The system ensures each item (assignment, office hours, class) belongs to a
 *            single parent (class, class, BrontoBoard respectively) and maintains its properties.
 */
export default class BrontoBoardConcept {
  /**
   * State: A set of BrontoBoards, each with an owner (User) and a Calendar ID.
   *
   * `brontoBoards` collection schema:
   *  - `_id`: BrontoBoardId (ID of the board)
   *  - `owner`: User (ID of the user who owns the board)
   *  - `calendar`: Calendar (ID of the associated calendar)
   */
  brontoBoards: Collection<{
    _id: BrontoBoardId;
    owner: User;
    calendar: Calendar;
  }>;

  /**
   * State: A set of Classes, each with a name, overview, and a link to its parent BrontoBoard.
   *
   * `classes` collection schema:
   *  - `_id`: ClassId (ID of the class)
   *  - `brontoBoardId`: BrontoBoardId (ID of the BrontoBoard this class belongs to)
   *  - `name`: string (Name of the class)
   *  - `overview`: string (Overview text for the class)
   */
  classes: Collection<{
    _id: ClassId;
    brontoBoardId: BrontoBoardId;
    name: string;
    overview: string;
  }>;

  /**
   * State: A set of Assignments, each with a name, due date, and a link to its parent Class.
   *
   * `assignments` collection schema:
   *  - `_id`: AssignmentId (ID of the assignment)
   *  - `classId`: ClassId (ID of the class this assignment belongs to)
   *  - `name`: string (Name of the assignment)
   *  - `dueDate`: Date (Due date of the assignment)
   */
  assignments: Collection<{
    _id: AssignmentId;
    classId: ClassId;
    name: string;
    dueDate: Date;
  }>;

  /**
   * State: A set of Office Hours, each with a time, duration, and a link to its parent Class.
   *
   * `officeHours` collection schema:
   *  - `_id`: OfficeHoursId (ID of the office hours session)
   *  - `classId`: ClassId (ID of the class these office hours belong to)
   *  - `time`: Date (Scheduled start time for office hours)
   *  - `duration`: number (Duration of office hours in minutes, e.g., 30 for 30 minutes)
   */
  officeHours: Collection<{
    _id: OfficeHoursId;
    classId: ClassId;
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
   * @returns {{brontoBoard: BrontoBoardId} | {error: string}} The ID of the created BrontoBoard on success, or an error message.
   *
   * @requires A valid `user` and `calendar` ID must be provided (non-empty).
   *           No other BrontoBoard must already exist for the given `user`.
   * @effects Creates an empty BrontoBoard document for the user, associating it with the provided calendar.
   */
  async initializeBB({ user, calendar }: { user: User; calendar: Calendar }): Promise<{ brontoBoard: BrontoBoardId } | { error: string }> {
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
      return { error: `A BrontoBoard already exists for user ${user}.` };
    }

    const newBrontoBoardId = freshID();
    const result = await this.brontoBoards.insertOne({
      _id: newBrontoBoardId,
      owner: user,
      calendar: calendar,
    });

    if (!result.acknowledged) {
      return { error: "Failed to create BrontoBoard due to database error." };
    }

    return { brontoBoard: newBrontoBoardId };
  }

  /**
   * Action: createClass
   *
   * @param {Object} args - The action arguments.
   * @param {BrontoBoardId} args.brontoBoardId - The ID of the BrontoBoard to which this class will belong.
   * @param {string} args.name - The name of the new class.
   * @param {string} args.overview - An overview description for the new class.
   *
   * @returns {{class: ClassId} | {error: string}} The ID of the created Class on success, or an error message.
   *
   * @requires The `brontoBoardId` must correspond to an existing BrontoBoard.
   *           The `name` cannot be an empty or whitespace-only string.
   * @effects Creates a new class document, linking it to the specified BrontoBoard, with the given name and overview.
   */
  async createClass({ brontoBoardId, name, overview }: { brontoBoardId: BrontoBoardId; name: string; overview: string }): Promise<{ class: ClassId } | { error: string }> {
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
      return { error: "Failed to create class due to database error." };
    }

    return { class: newClassId };
  }

  /**
   * Action: addWork
   *
   * @param {Object} args - The action arguments.
   * @param {ClassId} args.classId - The ID of the class to which this assignment will be added.
   * @param {string} args.workName - The name of the assignment.
   * @param {Date} args.dueDate - The due date of the assignment.
   *
   * @returns {{assignment: AssignmentId} | {error: string}} The ID of the created Assignment on success, or an error message.
   *
   * @requires The `classId` must correspond to an existing Class.
   *           `workName` must not be an empty or whitespace-only string.
   *           `dueDate` must be a valid Date object and not before the current date (allowing today).
   * @effects Creates a new assignment document, linking it to the specified Class, with the given name and due date.
   */
  async addWork({ classId, workName, dueDate }: { classId: ClassId; workName: string; dueDate: Date }): Promise<{ assignment: AssignmentId } | { error: string }> {
    // Precondition: classId must exist
    const _class = await this.classes.findOne({ _id: classId });
    if (!_class) {
      return { error: `Class with ID ${classId} not found.` };
    }

    // Precondition: workName not be empty
    if (!workName || workName.trim() === "") {
      return { error: "Assignment name cannot be empty." };
    }

    // Precondition: dueDate be a valid Date and not before the current date
    if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      return { error: "Provided due date is not a valid date." };
    }
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
      return { error: "Failed to add assignment due to database error." };
    }

    return { assignment: newAssignmentId };
  }

  /**
   * Action: changeWork
   *
   * @param {Object} args - The action arguments.
   * @param {AssignmentId} args.assignmentId - The ID of the assignment to modify.
   * @param {Date} args.newDueDate - The new due date for the assignment.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `assignmentId` must correspond to an existing Assignment.
   *           `newDueDate` must be a valid Date object and strictly in the future (after the current moment).
   * @effects Modifies the `dueDate` of the specified Assignment.
   */
  async changeWork({ assignmentId, newDueDate }: { assignmentId: AssignmentId; newDueDate: Date }): Promise<Empty | { error: string }> {
    // Precondition: assignmentId must exist
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    // Precondition: newDueDate be a valid Date and strictly in the future
    if (!(newDueDate instanceof Date) || isNaN(newDueDate.getTime())) {
      return { error: "Provided new due date is not a valid date." };
    }
    const now = new Date();
    if (newDueDate <= now) {
      return { error: "New due date must be strictly in the future." };
    }

    const result = await this.assignments.updateOne(
      { _id: assignmentId },
      { $set: { dueDate: newDueDate } },
    );

    if (!result.acknowledged || result.matchedCount === 0) {
      return { error: "Failed to change assignment due date, or assignment not found for update." };
    }

    return {};
  }

  /**
   * Action: removeWork
   *
   * @param {Object} args - The action arguments.
   * @param {AssignmentId} args.assignmentId - The ID of the assignment to remove.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `assignmentId` must correspond to an existing Assignment.
   * @effects Removes the specified Assignment document from its class.
   */
  async removeWork({ assignmentId }: { assignmentId: AssignmentId }): Promise<Empty | { error: string }> {
    // Precondition: assignmentId must exist
    const assignment = await this.assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return { error: `Assignment with ID ${assignmentId} not found.` };
    }

    const result = await this.assignments.deleteOne({ _id: assignmentId });

    if (!result.acknowledged || result.deletedCount === 0) {
      return { error: "Failed to remove assignment, or assignment not found for deletion." };
    }

    return {};
  }

  /**
   * Action: addOH
   *
   * @param {Object} args - The action arguments.
   * @param {ClassId} args.classId - The ID of the class to which these office hours will be added.
   * @param {Date} args.OHTime - The start time of the office hours.
   * @param {number} args.OHduration - The duration of the office hours (e.g., in minutes).
   *
   * @returns {{officeHours: OfficeHoursId} | {error: string}} The ID of the created OfficeHours on success, or an error message.
   *
   * @requires A valid `classId` must correspond to an existing Class.
   *           `OHTime` must be a valid Date object and strictly in the future (after the current moment).
   *           `OHduration` must be a non-negative number.
   * @effects Creates new OfficeHours for the specified Class with the given time and duration.
   */
  async addOH({ classId, OHTime, OHduration }: { classId: ClassId; OHTime: Date; OHduration: number }): Promise<{ officeHours: OfficeHoursId } | { error: string }> {
    // Precondition: classId must exist
    const _class = await this.classes.findOne({ _id: classId });
    if (!_class) {
      return { error: `Class with ID ${classId} not found.` };
    }

    // Precondition: OHTime be a valid Date and strictly in the future
    if (!(OHTime instanceof Date) || isNaN(OHTime.getTime())) {
      return { error: "Provided office hours time is not a valid date." };
    }
    const now = new Date();
    if (OHTime <= now) {
      return { error: "Office hours time must be strictly in the future." };
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
      return { error: "Failed to add office hours due to database error." };
    }

    return { officeHours: newOfficeHoursId };
  }

  /**
   * Action: changeOH
   *
   * @param {Object} args - The action arguments.
   * @param {OfficeHoursId} args.officeHoursId - The ID of the office hours session to modify.
   * @param {Date} args.newTime - The new start time for the office hours.
   * @param {number} args.newDuration - The new duration for the office hours.
   *
   * @returns {Empty | {error: string}} An empty object on success, or an error message.
   *
   * @requires A valid `officeHoursId` must correspond to an existing OfficeHours entry.
   *           `newTime` must be a valid Date object and strictly in the future (after the current moment).
   *           `newDuration` must be a non-negative number.
   * @effects Modifies the `time` and `duration` of the specified OfficeHours entry.
   */
  async changeOH({ officeHoursId, newTime, newDuration }: { officeHoursId: OfficeHoursId; newTime: Date; newDuration: number }): Promise<Empty | { error: string }> {
    // Precondition: officeHoursId must exist
    const officeHours = await this.officeHours.findOne({ _id: officeHoursId });
    if (!officeHours) {
      return { error: `Office Hours with ID ${officeHoursId} not found.` };
    }

    // Precondition: newTime be a valid Date and strictly in the future
    if (!(newTime instanceof Date) || isNaN(newTime.getTime())) {
      return { error: "Provided new office hours time is not a valid date." };
    }
    const now = new Date();
    if (newTime <= now) {
      return { error: "New office hours time must be strictly in the future." };
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
      return { error: "Failed to change office hours, or office hours not found for update." };
    }

    return {};
  }

  // --- Queries ---
  /**
   * Query: _getBrontoBoardByUser
   *
   * @param {Object} args - The query arguments.
   * @param {User} args.user - The ID of the user whose BrontoBoard is being queried.
   *
   * @returns {{brontoBoard?: BrontoBoardId; error?: string}} The ID of the BrontoBoard if found, or an error.
   * @effects Returns the BrontoBoard associated with a given user.
   */
  async _getBrontoBoardByUser({ user }: { user: User }): Promise<{ brontoBoard?: BrontoBoardId; error?: string }> {
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
   *
   * @param {Object} args - The query arguments.
   * @param {BrontoBoardId} args.brontoBoardId - The ID of the BrontoBoard for which to retrieve classes.
   *
   * @returns {{classes: ClassId[]} | {error: string}} An array of class IDs belonging to the BrontoBoard, or an error.
   * @effects Returns all classes belonging to a specific BrontoBoard.
   */
  async _getClassesByBrontoBoard({ brontoBoardId }: { brontoBoardId: BrontoBoardId }): Promise<{ classes: ClassId[] } | { error: string }> {
    if (!brontoBoardId) {
      return { error: "BrontoBoard ID must be provided." };
    }
    const classes = await this.classes.find({ brontoBoardId: brontoBoardId }).toArray();
    return { classes: classes.map(c => c._id) };
  }

  /**
   * Query: _getAssignmentsByClass
   *
   * @param {Object} args - The query arguments.
   * @param {ClassId} args.classId - The ID of the Class for which to retrieve assignments.
   *
   * @returns {{assignments: AssignmentId[]} | {error: string}} An array of assignment IDs belonging to the Class, or an error.
   * @effects Returns all assignments belonging to a specific Class.
   */
  async _getAssignmentsByClass({ classId }: { classId: ClassId }): Promise<{ assignments: AssignmentId[] } | { error: string }> {
    if (!classId) {
      return { error: "Class ID must be provided." };
    }
    const assignments = await this.assignments.find({ classId: classId }).toArray();
    return { assignments: assignments.map(a => a._id) };
  }

  /**
   * Query: _getOfficeHoursByClass
   *
   * @param {Object} args - The query arguments.
   * @param {ClassId} args.classId - The ID of the Class for which to retrieve office hours.
   *
   * @returns {{officeHours: OfficeHoursId[]} | {error: string}} An array of office hours IDs belonging to the Class, or an error.
   * @effects Returns all office hours belonging to a specific Class.
   */
  async _getOfficeHoursByClass({ classId }: { classId: ClassId }): Promise<{ officeHours: OfficeHoursId[] } | { error: string }> {
    if (!classId) {
      return { error: "Class ID must be provided." };
    }
    const officeHours = await this.officeHours.find({ classId: classId }).toArray();
    return { officeHours: officeHours.map(oh => oh._id) };
  }
}
```
