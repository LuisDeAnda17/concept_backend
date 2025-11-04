---
timestamp: 'Mon Nov 03 2025 19:58:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_195849.0f153ef9.md]]'
content_id: 468be68567554594860e1b7445c6a8f67701ea11d6695768a38e6287c9cc181d
---

# response:

Here are the synchronizations for the `BrontoBoard` concept, contained in a single file `src/syncs/brontoboard.sync.ts`. These synchronizations handle common request flows for creating, modifying, and querying BrontoBoard data, integrating with `Requesting` for API calls and `Sessioning` for user authentication.

***

## file: src/syncs/brontoboard.sync.ts

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, Sessioning, BrontoBoard } from "@concepts"; // Assuming BrontoBoard concept is imported as 'BrontoBoard'

// --- BrontoBoard Initialization ---

/**
 * Sync: InitializeBrontoBoard
 * Description: Handles a request to create a new BrontoBoard for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.initializeBB -> Requesting.respond
 */
export const InitializeBrontoBoard: Sync = (
  { request, session, user, calendar, brontoBoard, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/initialize", session, calendar },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // If session is invalid, respond with an error.
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Initialize the BrontoBoard for the user
    [BrontoBoard.initializeBB, { user, calendar }, { brontoBoard, error }],
    // 3. Respond to the request
    [Requesting.respond, { request, brontoBoard, error }],
  ),
});

// --- Class Management ---

/**
 * Sync: CreateClass
 * Description: Handles a request to create a new class within a specified BrontoBoard for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.createClass -> Requesting.respond
 */
export const CreateClass: Sync = (
  { request, session, user, brontoBoardId, className, overview, class: classId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/classes/create", session, brontoBoard: brontoBoardId, className, overview },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Create the class for the BrontoBoard, checking ownership implicitly via BrontoBoard concept logic
    [
      BrontoBoard.createClass,
      { owner: user, brontoBoard: brontoBoardId, className, overview },
      { class: classId, error },
    ],
    // 3. Respond to the request
    [Requesting.respond, { request, class: classId, error }],
  ),
});

// --- Assignment Management ---

/**
 * Sync: AddAssignment
 * Description: Handles a request to add a new assignment to a specified class for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.addWork -> Requesting.respond
 */
export const AddAssignment: Sync = (
  { request, session, user, classId, workName, dueDate, assignment, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/assignments/add", session, class: classId, workName, dueDate },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Add work (assignment) to the class, checking ownership implicitly
    [
      BrontoBoard.addWork,
      { owner: user, class: classId, workName, dueDate },
      { assignment, error },
    ],
    // 3. Respond to the request
    [Requesting.respond, { request, assignment, error }],
  ),
});

/**
 * Sync: ChangeAssignmentDueDate
 * Description: Handles a request to change the due date of an existing assignment for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.changeWork -> Requesting.respond
 */
export const ChangeAssignmentDueDate: Sync = (
  { request, session, user, assignmentId, dueDate, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/assignments/change", session, work: assignmentId, dueDate },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Change work (assignment) due date, checking ownership implicitly
    [BrontoBoard.changeWork, { owner: user, work: assignmentId, dueDate }, { error }],
    // 3. Respond to the request
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: RemoveAssignment
 * Description: Handles a request to remove an existing assignment for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.removeWork -> Requesting.respond
 */
export const RemoveAssignment: Sync = (
  { request, session, user, assignmentId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/assignments/remove", session, work: assignmentId },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Remove work (assignment), checking ownership implicitly
    [BrontoBoard.removeWork, { owner: user, work: assignmentId }, { error }],
    // 3. Respond to the request
    [Requesting.respond, { request, error }],
  ),
});

// --- Office Hours Management ---

/**
 * Sync: AddOfficeHours
 * Description: Handles a request to add new office hours to a specified class for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.addOH -> Requesting.respond
 */
export const AddOfficeHours: Sync = (
  { request, session, user, classId, OHTime, OHduration, officeHours, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/officehours/add", session, class: classId, OHTime, OHduration },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Add office hours to the class, checking ownership implicitly
    [
      BrontoBoard.addOH,
      { owner: user, class: classId, OHTime, OHduration },
      { officeHours, error },
    ],
    // 3. Respond to the request
    [Requesting.respond, { request, officeHours, error }],
  ),
});

/**
 * Sync: ChangeOfficeHours
 * Description: Handles a request to change the details of existing office hours for an authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard.changeOH -> Requesting.respond
 */
export const ChangeOfficeHours: Sync = (
  { request, session, user, ohId, newDate, newduration, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/officehours/change", session, oh: ohId, newDate, newduration },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Invalid session." });
    }
    return frames;
  },
  then: actions(
    // 2. Change office hours, checking ownership implicitly
    [BrontoBoard.changeOH, { owner: user, oh: ohId, newDate, newduration }, { error }],
    // 3. Respond to the request
    [Requesting.respond, { request, error }],
  ),
});

// --- Querying BrontoBoard Data ---

/**
 * Sync: GetMyBrontoBoards
 * Description: Handles a request to retrieve all BrontoBoards owned by the authenticated user.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard._getBrontoBoardsForUser -> Requesting.respond
 */
export const GetMyBrontoBoards: Sync = (
  { request, session, user, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/my", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original request frame for error/default response

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Invalid session." });
    }

    // 2. Query for BrontoBoards owned by this user
    frames = await frames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard });

    // Handle zero matches: If no BrontoBoards are found, return an empty array for results.
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 3. Collect BrontoBoards as results
    return frames.collectAs([brontoBoard], results);
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});

/**
 * Sync: GetClassesForBrontoBoard
 * Description: Handles a request to retrieve all classes for a specific BrontoBoard, verifying user ownership.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard._getBrontoBoardById (for ownership check) -> BrontoBoard._getClassesForBrontoBoard -> Requesting.respond
 */
export const GetClassesForBrontoBoard: Sync = (
  { request, session, user, brontoBoardId, brontoBoard, class: classDoc, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/:brontoBoard/classes", session, brontoBoard: brontoBoardId }, // Note: brontoBoardId is aliased to `brontoBoard` in path params
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Invalid session." });
    }

    // 2. Verify BrontoBoard exists and is owned by the user (by querying for it and then filtering)
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: `BrontoBoard with ID ${brontoBoardId} not found.` });
    }
    frames = frames.filter(($) => $[brontoBoard].owner === $[user]);
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized access to BrontoBoard." });
    }

    // 3. Query for classes within this BrontoBoard
    frames = await frames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { class: classDoc });

    // Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 4. Collect classes as results
    return frames.collectAs([classDoc], results);
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});

/**
 * Sync: GetAssignmentsForClass
 * Description: Handles a request to retrieve all assignments for a specific class, verifying user ownership of the parent BrontoBoard.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard._getClassById (for ownership check) -> BrontoBoard._getAssignmentsForClass -> Requesting.respond
 */
export const GetAssignmentsForClass: Sync = (
  { request, session, user, classId, class: classDoc, assignment, results, error, brontoBoardId, brontoBoard },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/classes/:class/assignments", session, class: classId }, // Note: classId is aliased to `class` in path params
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Invalid session." });
    }

    // 2. Verify class exists and get its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classDoc });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: `Class with ID ${classId} not found.` });
    }
    // Extract brontoBoardId from classDoc and add it to the frame for subsequent query/filter
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: $[classDoc].brontoBoardId }));

    // 3. Verify BrontoBoard exists and is owned by the user
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard });
    if (frames.length === 0) {
      // This should ideally not happen if classDoc was found, but defensive.
      return new Frames({ ...originalFrame, [error]: `Associated BrontoBoard for class ${classId} not found.` });
    }
    frames = frames.filter(($) => $[brontoBoard].owner === $[user]);
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized access to class assignments." });
    }

    // 4. Query for assignments within this class
    frames = await frames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment });

    // Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 5. Collect assignments as results
    return frames.collectAs([assignment], results);
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});

/**
 * Sync: GetOfficeHoursForClass
 * Description: Handles a request to retrieve all office hours for a specific class, verifying user ownership of the parent BrontoBoard.
 * Maps Requesting.request -> Sessioning._getUser -> BrontoBoard._getClassById (for ownership check) -> BrontoBoard._getOfficeHoursForClass -> Requesting.respond
 */
export const GetOfficeHoursForClass: Sync = (
  { request, session, user, classId, class: classDoc, officeHour, results, error, brontoBoardId, brontoBoard },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/classes/:class/officehours", session, class: classId }, // Note: classId is aliased to `class` in path params
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Invalid session." });
    }

    // 2. Verify class exists and get its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classDoc });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: `Class with ID ${classId} not found.` });
    }
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: $[classDoc].brontoBoardId }));

    // 3. Verify BrontoBoard exists and is owned by the user
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: `Associated BrontoBoard for class ${classId} not found.` });
    }
    frames = frames.filter(($) => $[brontoBoard].owner === $[user]);
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized access to class office hours." });
    }

    // 4. Query for office hours within this class
    frames = await frames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour });

    // Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 5. Collect office hours as results
    return frames.collectAs([officeHour], results);
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});
```
