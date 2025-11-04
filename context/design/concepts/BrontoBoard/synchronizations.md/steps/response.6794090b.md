---
timestamp: 'Mon Nov 03 2025 12:41:11 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_124111.6160d7ab.md]]'
content_id: 6794090bfff7d76d17dfe04e5be8d471e79dfe6a55c7e906fadc0e482be5b08d
---

# response:

Okay, let's implement the synchronizations for the `BrontoBoard` concept. These synchronizations will handle typical request-response flows using the `Requesting` and `Sessioning` concepts, along with various `BrontoBoard` actions and queries.

**Important Pre-requisite:** For the query-based synchronizations (like `GetClassDetails`), the `BrontoBoardConcept.ts` must include public queries (`_getOwnedBrontoBoard` and `_getOwnedClass`) to encapsulate the ownership verification logic that was previously in private helper methods.

Here's how `src/concepts/BrontoBoard/BrontoBoardConcept.ts` would need to be augmented with these public queries (this is a conceptual addition, not part of the final syncs output):

```typescript
// --- Additions to BrontoBoardConcept.ts for _getOwnedBrontoBoard and _getOwnedClass queries ---

// ... (existing imports and interfaces) ...

export default class BrontoBoardConcept {
  // ... (existing constructor and collections) ...

  // Public queries for use in synchronizations
  /**
   * _query: _getOwnedBrontoBoard
   * __requires:__ A valid BrontoBoard ID and owner ID.
   * __effects:__ Returns an array containing the BrontoBoardDoc if found and owned, otherwise an empty array.
   * @param input An object containing brontoBoard ID and owner ID.
   *   - `brontoBoard`: The ID of the BrontoBoard.
   *   - `owner`: The ID of the user claiming ownership.
   * @returns An array of BrontoBoardDoc objects.
   */
  async _getOwnedBrontoBoard(input: { brontoBoard: ID; owner: User }): Promise<BrontoBoardDoc[]> {
    const { brontoBoard: brontoBoardId, owner: ownerId } = input;
    const brontoBoard = await this.brontoBoards.findOne({ _id: brontoBoardId, owner: ownerId });
    return brontoBoard ? [brontoBoard] : [];
  }

  /**
   * _query: _getOwnedClass
   * __requires:__ A valid class ID and owner ID (for its parent BrontoBoard).
   * __effects:__ Returns an array containing ClassDoc and its parent BrontoBoardDoc if class found and owned, otherwise an empty array.
   * @param input An object containing class ID and owner ID.
   *   - `class`: The ID of the Class.
   *   - `owner`: The ID of the user claiming ownership of the parent BrontoBoard.
   * @returns An array of objects, each containing a ClassDoc and its BrontoBoardDoc.
   */
  async _getOwnedClass(
    input: { class: ID; owner: User },
  ): Promise<Array<{ class: ClassDoc; brontoBoard: BrontoBoardDoc }>> {
    const { class: classId, owner: ownerId } = input;
    const classDoc = await this.classes.findOne({ _id: classId });
    if (!classDoc) {
      return [];
    }

    const brontoBoardDoc = await this.brontoBoards.findOne({ _id: classDoc.brontoBoardId, owner: ownerId });
    if (!brontoBoardDoc) {
      return [];
    }
    return [{ class: classDoc, brontoBoard: brontoBoardDoc }];
  }

  // ... (existing actions and other queries) ...
}
```

Now, with those conceptual additions to the BrontoBoard concept, here are the synchronizations:

***

```typescript
// file: src/syncs/brontoboard.sync.ts

// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
// Assumes Sessioning is available and BrontoBoard is correctly exported from @concepts/BrontoBoard/BrontoBoardConcept.ts
import { Requesting, Sessioning, BrontoBoard } from "@concepts";

// --- 1. Initialize BrontoBoard ---
// Request to initialize a new BrontoBoard for a user.
export const InitializeBrontoBoardRequest: Sync = ({ request, session, calendar, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/initialize", session, calendar }, { request }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    // Get the user associated with the session. If no user, frames will be empty.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // If session is invalid, create a new frame with an error to respond.
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames; // Pass along frames with 'user' binding
  },
  then: actions(
    // Call the BrontoBoard concept's initializeBB action
    [BrontoBoard.initializeBB, { user, calendar }],
  ),
});

// Response for a successful BrontoBoard initialization.
export const InitializeBrontoBoardResponse: Sync = ({ request, brontoBoard }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }], // Matches when initializeBB returns a brontoBoard ID
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

// Response for an errored BrontoBoard initialization.
export const InitializeBrontoBoardResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }], // Matches when initializeBB returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 2. Create Class ---
// Request to create a new Class within a BrontoBoard.
export const CreateClassRequest: Sync = ({ request, session, brontoBoard, className, overview, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class", session, brontoBoard, className, overview }, { request }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.createClass, { owner: user, brontoBoard, className, overview }],
  ),
});

// Response for a successful Class creation.
export const CreateClassResponse: Sync = ({ request, class: classResult }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class" }, { request }],
    [BrontoBoard.createClass, {}, { class: classResult }], // Matches when createClass returns a class ID
  ),
  then: actions(
    [Requesting.respond, { request, class: classResult }],
  ),
});

// Response for an errored Class creation.
export const CreateClassResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class" }, { request }],
    [BrontoBoard.createClass, {}, { error }], // Matches when createClass returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 3. Add Assignment (Work) ---
// Request to add a new Assignment to a Class.
export const AddWorkRequest: Sync = ({ request, session, class: classId, workName, dueDate, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment", session, class: classId, workName, dueDate }, { request }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.addWork, { owner: user, class: classId, workName, dueDate }],
  ),
});

// Response for a successful Assignment addition.
export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }], // Matches when addWork returns an assignment ID
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

// Response for an errored Assignment addition.
export const AddWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment" }, { request }],
    [BrontoBoard.addWork, {}, { error }], // Matches when addWork returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 4. Change Assignment (Work) ---
// Request to change the details of an existing Assignment.
export const ChangeWorkRequest: Sync = ({ request, session, work, dueDate, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work", session, dueDate }, { request, work }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work, dueDate }],
  ),
});

// Response for a successful Assignment change.
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches when changeWork returns an empty success object
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Explicit success message
  ),
});

// Response for an errored Assignment change.
export const ChangeWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work" }, { request }],
    [BrontoBoard.changeWork, {}, { error }], // Matches when changeWork returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 5. Remove Assignment (Work) ---
// Request to remove an Assignment.
export const RemoveWorkRequest: Sync = ({ request, session, work, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work", session }, { request, work }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work }],
  ),
});

// Response for a successful Assignment removal.
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches when removeWork returns an empty success object
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Explicit success message
  ),
});

// Response for an errored Assignment removal.
export const RemoveWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:work" }, { request }],
    [BrontoBoard.removeWork, {}, { error }], // Matches when removeWork returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 6. Add Office Hours ---
// Request to add new Office Hours to a Class.
export const AddOfficeHoursRequest: Sync = ({ request, session, class: classId, OHTime, OHduration, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours", session, class: classId, OHTime, OHduration }, { request }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.addOH, { owner: user, class: classId, OHTime, OHduration }],
  ),
});

// Response for a successful Office Hours addition.
export const AddOfficeHoursResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }], // Matches when addOH returns an officeHours ID
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

// Response for an errored Office Hours addition.
export const AddOfficeHoursResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours" }, { request }],
    [BrontoBoard.addOH, {}, { error }], // Matches when addOH returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 7. Change Office Hours ---
// Request to change existing Office Hours.
export const ChangeOfficeHoursRequest: Sync = ({ request, session, oh, newDate, newduration, user }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/:oh", session, newDate, newduration }, { request, oh }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, error: "Invalid session or not logged in." });
    }
    return frames;
  },
  then: actions(
    [BrontoBoard.changeOH, { owner: user, oh, newDate, newduration }],
  ),
});

// Response for a successful Office Hours change.
export const ChangeOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/:oh" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches when changeOH returns an empty success object
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Explicit success message
  ),
});

// Response for an errored Office Hours change.
export const ChangeOfficeHoursResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/:oh" }, { request }],
    [BrontoBoard.changeOH, {}, { error }], // Matches when changeOH returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 8. Get My BrontoBoards ---
// Request to retrieve all BrontoBoards owned by the current user.
export const GetMyBrontoBoards: Sync = ({ request, session, user, brontoBoard, results, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/myboards", session }, { request }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, [error]: "Invalid session or not logged in." });
    }
    const userFrame = frames[0];

    // 2. Query for BrontoBoards for this user
    const boardsFrames = await new Frames(userFrame) // Start with the frame that has 'user'
      .query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard });

    // Handle "Zero Matches" for BrontoBoards: if no boards, return an empty array.
    if (boardsFrames.length === 0) {
      return new Frames({ [request]: originalRequest, [results]: [] });
    }

    // If boards are found, collect them into a 'results' array.
    return boardsFrames.collectAs([brontoBoard], results);
  },
  then: actions(
    // These respond actions will fire based on whether the frames have 'results' or 'error' bindings.
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

// --- 9. Get Class Details (including assignments and office hours) ---
// Request to retrieve details for a specific class, including its assignments and office hours.
export const GetClassDetails: Sync = (
  { request, session, user, classId, classDoc, brontoBoard, assignment, officeHour, assignments, officeHours, error, classDetails },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:classId", session }, { request, classId }],
  ),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequest, [error]: "Invalid session or not logged in." });
    }
    const userFrame = frames[0]; // 'user' is now bound in this frame

    // 2. Get owned class details using the new _getOwnedClass query
    // This query returns an array where each element contains { class: ClassDoc, brontoBoard: BrontoBoardDoc }
    const ownedClassFrames = await new Frames(userFrame)
      .query(BrontoBoard._getOwnedClass, { class: classId, owner: user }, { class: classDoc, brontoBoard });

    // Handle case where class is not found or not owned by the user
    if (ownedClassFrames.length === 0) {
      return new Frames({ [request]: originalRequest, [error]: `Class with ID ${classId} not found or not owned by user.` });
    }

    const classBaseFrame = ownedClassFrames[0]; // We expect only one match for a specific classId if found

    // Now, classBaseFrame contains classDoc and brontoBoard bindings. Use it for subsequent queries.
    const currentContextFrame = new Frames(classBaseFrame);

    // 3. Get Assignments for this class
    const assignmentFrames = await currentContextFrame
      .query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment });

    // 4. Get Office Hours for this class
    const officeHourFrames = await currentContextFrame
      .query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour });

    // Consolidate assignments and office hours, handling cases where there are no results
    const collectedAssignments = assignmentFrames.length > 0
      ? assignmentFrames.collectAs([assignment], assignments)[0][assignments] // collectAs groups and returns new frames
      : [];
    const collectedOfficeHours = officeHourFrames.length > 0
      ? officeHourFrames.collectAs([officeHour], officeHours)[0][officeHours]
      : [];

    // Construct the final classDetails object that will be returned in the response
    const finalResult = {
      [request]: originalRequest,
      [classDetails]: {
        id: classBaseFrame[classDoc]._id, // Use the _id from the classDoc binding
        name: classBaseFrame[classDoc].name,
        overview: classBaseFrame[classDoc].overview,
        brontoBoardId: classBaseFrame[classDoc].brontoBoardId,
        assignments: collectedAssignments,
        officeHours: collectedOfficeHours,
      },
    };
    return new Frames(finalResult);
  },
  then: actions(
    // These respond actions will fire based on whether the frames have 'classDetails' or 'error' bindings.
    [Requesting.respond, { request, classDetails }],
    [Requesting.respond, { request, error }],
  ),
});
```
