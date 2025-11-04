---
timestamp: 'Mon Nov 03 2025 15:01:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_150143.22086662.md]]'
content_id: 0e683737c3a0dbbcfcfa2675cf8487a03201413f1727d4d5648e6a4ba908f3fa
---

# response:

Here are the TypeScript synchronizations for the `BrontoBoard` concept, designed to interact with `Requesting` for handling HTTP requests and `Sessioning` for user authentication. These synchronizations are intended to be placed in a file like `src/syncs/brontoboard.sync.ts`.

Each synchronization follows a pattern:

1. **`when` clause**: Captures an incoming HTTP request via `Requesting.request`. Path parameters (like `:brontoBoard`) are automatically destructured into variables.
2. **`where` clause**:
   * Retrieves the authenticated `user` from the `session` using `Sessioning._getUser`. If no user is found, an authentication error is generated.
   * Calls the appropriate `BrontoBoard` action, passing the `user` as `owner`.
   * Handles the potential `error` return from `BrontoBoard` actions by adding an `error` property to the frame.
   * For listing operations, it performs explicit ownership checks and handles the "zero matches" pitfall by returning an empty array if no items are found.
3. **`then` clause**: Specifies two `Requesting.respond` actions: one for successful outcomes (with the expected return value) and one for error outcomes (with an `error` string). The Concept Engine will automatically match the correct one based on the bindings in the processed frame.

```typescript
// file: src/syncs/brontoboard.sync.ts

// These two help you declare synchronizations
import { actions, Frames, Sync } from "@engine";
// Choose whatever concepts you have
// Assumes BrontoBoard and Sessioning are exposed via @concepts/concepts.ts
import { Requesting, Sessioning, BrontoBoard } from "@concepts";

// Helper type references for BrontoBoard's generic types and action/query outputs.
// These are used for better type inference in the 'then' clause patterns.
type User = BrontoBoard["_generic_types"]["User"];
type Calendar = BrontoBoard["_generic_types"]["Calendar"];
type BrontoBoardId = BrontoBoard["_output_types"]["initializeBB"]["brontoBoard"];
type ClassId = BrontoBoard["_output_types"]["createClass"]["class"];
type AssignmentId = BrontoBoard["_output_types"]["addWork"]["assignment"];
type OfficeHoursId = BrontoBoard["_output_types"]["addOH"]["officeHours"];
type Session = Sessioning["_output_types"]["createSession"]["session"]; // Assuming Sessioning has a createSession action


// ------------------------------------------------------------------------------------------------
// 1. Initialize BrontoBoard
//    Endpoint: POST /brontoboards/initialize
//    Body: { "session": "sessionId", "calendar": "calendarId" }
// ------------------------------------------------------------------------------------------------
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, user, calendar, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/initialize",
      session,
      calendar,
    }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.initializeBB action
    frames = await frames.map(async ($) => {
      const result = await BrontoBoard.initializeBB({
        user: $[user],
        calendar: $[calendar],
      });
      return { ...$, ...result }; // result will contain { brontoBoard: ID } or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, brontoBoard: brontoBoard as BrontoBoardId }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 2. Create Class
//    Endpoint: POST /brontoboards/:brontoBoard/classes/create
//    Body: { "session": "sessionId", "className": "My Class", "overview": "..." }
// ------------------------------------------------------------------------------------------------
export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoard, className, overview, class: classId },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/create",
      session,
      className,
      overview,
    }, { request, brontoBoard }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.createClass action, user is the owner
    frames = await frames.map(async ($) => {
      const result = await BrontoBoard.createClass({
        owner: $[user],
        brontoBoard: $[brontoBoard],
        className: $[className],
        overview: $[overview],
      });
      return { ...$, ...result }; // result will contain { class: ID } or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, class: classId as ClassId }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 3. Add Assignment (Work)
//    Endpoint: POST /brontoboards/:brontoBoard/classes/:class/assignments/add
//    Body: { "session": "sessionId", "workName": "Homework 1", "dueDate": "2023-12-31T23:59:59Z" }
// ------------------------------------------------------------------------------------------------
export const AddAssignmentRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, workName, dueDate, assignment },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/assignments/add",
      session,
      workName,
      dueDate,
    }, { request, brontoBoard, class: classId }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.addWork action
    frames = await frames.map(async ($) => {
      const date = new Date($[dueDate]); // Convert dueDate string from request to Date object
      const result = await BrontoBoard.addWork({
        owner: $[user],
        class: $[classId],
        workName: $[workName],
        dueDate: date,
      });
      return { ...$, ...result }; // result will contain { assignment: ID } or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, assignment: assignment as AssignmentId }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 4. Change Assignment (Work)
//    Endpoint: PUT /brontoboards/:brontoBoard/classes/:class/assignments/:work/change
//    Body: { "session": "sessionId", "dueDate": "2024-01-15T23:59:59Z" }
// ------------------------------------------------------------------------------------------------
export const ChangeAssignmentRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, work, dueDate },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/assignments/:work/change",
      session,
      dueDate,
    }, { request, brontoBoard, class: classId, work }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.changeWork action
    frames = await frames.map(async ($) => {
      const date = new Date($[dueDate]); // Convert dueDate string from request to Date object
      const result = await BrontoBoard.changeWork({
        owner: $[user],
        work: $[work],
        dueDate: date,
      });
      return { ...$, ...result }; // result will contain {} or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response (empty object often implies success with no specific data)
    [Requesting.respond, { request, status: "success" }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 5. Remove Assignment (Work)
//    Endpoint: DELETE /brontoboards/:brontoBoard/classes/:class/assignments/:work/remove
//    Body: { "session": "sessionId" }
// ------------------------------------------------------------------------------------------------
export const RemoveAssignmentRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, work },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/assignments/:work/remove",
      session,
    }, { request, brontoBoard, class: classId, work }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.removeWork action
    frames = await frames.map(async ($) => {
      const result = await BrontoBoard.removeWork({
        owner: $[user],
        work: $[work],
      });
      return { ...$, ...result }; // result will contain {} or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, status: "success" }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 6. Add Office Hours
//    Endpoint: POST /brontoboards/:brontoBoard/classes/:class/office-hours/add
//    Body: { "session": "sessionId", "OHTime": "2023-12-25T10:00:00Z", "OHduration": 60 }
// ------------------------------------------------------------------------------------------------
export const AddOfficeHoursRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, OHTime, OHduration, officeHours },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/office-hours/add",
      session,
      OHTime,
      OHduration,
    }, { request, brontoBoard, class: classId }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.addOH action
    frames = await frames.map(async ($) => {
      const time = new Date($[OHTime]); // Convert OHTime string to Date object
      const result = await BrontoBoard.addOH({
        owner: $[user],
        class: $[classId],
        OHTime: time,
        OHduration: $[OHduration],
      });
      return { ...$, ...result }; // result will contain { officeHours: ID } or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, officeHours: officeHours as OfficeHoursId }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 7. Change Office Hours
//    Endpoint: PUT /brontoboards/:brontoBoard/classes/:class/office-hours/:oh/change
//    Body: { "session": "sessionId", "newDate": "2024-01-01T11:00:00Z", "newduration": 90 }
// ------------------------------------------------------------------------------------------------
export const ChangeOfficeHoursRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, oh, newDate, newduration },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/office-hours/:oh/change",
      session,
      newDate,
      newduration,
    }, { request, brontoBoard, class: classId, oh }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...frames[0], error: "Authentication required." }]);
    }

    // 2. Call the BrontoBoard.changeOH action
    frames = await frames.map(async ($) => {
      const date = new Date($[newDate]); // Convert newDate string to Date object
      const result = await BrontoBoard.changeOH({
        owner: $[user],
        oh: $[oh],
        newDate: date,
        newduration: $[newduration],
      });
      return { ...$, ...result }; // result will contain {} or { error: string }
    });
    return frames;
  },
  then: actions(
    // Success response
    [Requesting.respond, { request, status: "success" }],
    // Error response
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 8. List BrontoBoards for User
//    Endpoint: GET /brontoboards/my
//    Query Params: ?session=sessionId
// ------------------------------------------------------------------------------------------------
export const ListMyBrontoBoardsRequest: Sync = (
  { request, session, user, brontoBoards, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/my", session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original frame for potential error/empty response

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...originalFrame, error: "Authentication required." }]);
    }

    // 2. Query BrontoBoard._getBrontoBoardsForUser
    // Note: The variable 'brontoBoards' in the output pattern will contain an array of BrontoBoardDocs
    frames = await frames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user },
      { brontoBoards: brontoBoards },
    );

    // 3. Handle zero matches: return an empty array for results
    if (frames.length === 0) {
      return new Frames([{ ...originalFrame, [results]: [] }]);
    }

    // 4. Collect all BrontoBoards into a 'results' array for the response
    return frames.collectAs([brontoBoards], results);
  },
  then: actions(
    // Respond with the list of BrontoBoards
    [Requesting.respond, { request, results: "any[]" }],
    // Respond with error if authentication failed or other errors
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 9. List Classes for BrontoBoard
//    Endpoint: GET /brontoboards/:brontoBoard/classes
//    Query Params: ?session=sessionId
// ------------------------------------------------------------------------------------------------
export const ListClassesForBrontoBoardRequest: Sync = (
  { request, session, user, brontoBoard, classes, results },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes",
      session,
    }, { request, brontoBoard }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...originalFrame, error: "Authentication required." }]);
    }

    // 2. Verify user owns the BrontoBoard
    const brontoBoardDocCheck = await BrontoBoard._getBrontoBoardsForUser({
      user: originalFrame[user],
    });
    const ownedBrontoBoard = brontoBoardDocCheck.find((b) =>
      b._id === originalFrame[brontoBoard]
    );

    if (!ownedBrontoBoard) {
      return new Frames([{
        ...originalFrame,
        error: "BrontoBoard not found or not owned by user.",
      }]);
    }

    // 3. Query BrontoBoard._getClassesForBrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: ownedBrontoBoard._id },
      { classes: classes },
    );

    // 4. Handle zero matches
    if (frames.length === 0) {
      return new Frames([{ ...originalFrame, [results]: [] }]);
    }

    // 5. Collect classes into 'results' array
    return frames.collectAs([classes], results);
  },
  then: actions(
    [Requesting.respond, { request, results: "any[]" }],
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 10. List Assignments for Class
//     Endpoint: GET /brontoboards/:brontoBoard/classes/:class/assignments
//     Query Params: ?session=sessionId
// ------------------------------------------------------------------------------------------------
export const ListAssignmentsForClassRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, assignments, results },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/assignments",
      session,
    }, { request, brontoBoard, class: classId }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...originalFrame, error: "Authentication required." }]);
    }

    // 2. Verify user owns the BrontoBoard and the class belongs to it
    const brontoBoardDocCheck = await BrontoBoard._getBrontoBoardsForUser({
      user: originalFrame[user],
    });
    const ownedBrontoBoard = brontoBoardDocCheck.find((b) =>
      b._id === originalFrame[brontoBoard]
    );
    if (!ownedBrontoBoard) {
      return new Frames([{
        ...originalFrame,
        error: "BrontoBoard not found or not owned by user.",
      }]);
    }

    const classesInBoard = await BrontoBoard._getClassesForBrontoBoard({
      brontoBoard: ownedBrontoBoard._id,
    });
    const ownedClass = classesInBoard.find((c) => c._id === originalFrame[classId]);
    if (!ownedClass) {
      return new Frames([{
        ...originalFrame,
        error: "Class not found or does not belong to the BrontoBoard.",
      }]);
    }

    // 3. Query BrontoBoard._getAssignmentsForClass
    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: ownedClass._id },
      { assignments: assignments },
    );

    // 4. Handle zero matches
    if (frames.length === 0) {
      return new Frames([{ ...originalFrame, [results]: [] }]);
    }

    // 5. Collect assignments into 'results' array
    return frames.collectAs([assignments], results);
  },
  then: actions(
    [Requesting.respond, { request, results: "any[]" }],
    [Requesting.respond, { request, error: "string" }],
  ),
});

// ------------------------------------------------------------------------------------------------
// 11. List Office Hours for Class
//     Endpoint: GET /brontoboards/:brontoBoard/classes/:class/office-hours
//     Query Params: ?session=sessionId
// ------------------------------------------------------------------------------------------------
export const ListOfficeHoursForClassRequest: Sync = (
  { request, session, user, brontoBoard, class: classId, officeHours, results },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/brontoboards/:brontoBoard/classes/:class/office-hours",
      session,
    }, { request, brontoBoard, class: classId }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) { // Authentication required
      return new Frames([{ ...originalFrame, error: "Authentication required." }]);
    }

    // 2. Verify user owns the BrontoBoard and the class belongs to it
    const brontoBoardDocCheck = await BrontoBoard._getBrontoBoardsForUser({
      user: originalFrame[user],
    });
    const ownedBrontoBoard = brontoBoardDocCheck.find((b) =>
      b._id === originalFrame[brontoBoard]
    );
    if (!ownedBrontoBoard) {
      return new Frames([{
        ...originalFrame,
        error: "BrontoBoard not found or not owned by user.",
      }]);
    }

    const classesInBoard = await BrontoBoard._getClassesForBrontoBoard({
      brontoBoard: ownedBrontoBoard._id,
    });
    const ownedClass = classesInBoard.find((c) => c._id === originalFrame[classId]);
    if (!ownedClass) {
      return new Frames([{
        ...originalFrame,
        error: "Class not found or does not belong to the BrontoBoard.",
      }]);
    }

    // 3. Query BrontoBoard._getOfficeHoursForClass
    frames = await frames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: ownedClass._id },
      { officeHours: officeHours },
    );

    // 4. Handle zero matches
    if (frames.length === 0) {
      return new Frames([{ ...originalFrame, [results]: [] }]);
    }

    // 5. Collect office hours into 'results' array
    return frames.collectAs([officeHours], results);
  },
  then: actions(
    [Requesting.respond, { request, results: "any[]" }],
    [Requesting.respond, { request, error: "string" }],
  ),
});
```
