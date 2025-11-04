---
timestamp: 'Mon Nov 03 2025 20:55:46 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_205546.224ce122.md]]'
content_id: 4410ede2ea34f6c6cb054b3ec98cf8e098abda3c1442b37847b169ee118984ac
---

# response:

```typescript
// src/syncs/brontoboard_queries.sync.ts

// These two help you declare synchronizations
import { actions, Frames, Sync } from "@engine";
// Choose whatever concepts you have
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
// Helper types
import { ID } from "@utils/types.ts";

// Alias types for clarity and consistency, assuming they are just branded `ID`s from @utils/types.ts
type User = ID;
type Session = ID;
type BrontoBoardID = ID;
type ClassID = ID;
type AssignmentID = ID;
type OfficeHourID = ID;

// --- Helper for creating consistent error responses ---
function createErrorFrame(originalRequest: ID, errorMessage: string): Frames {
  return new Frames([{ [request]: originalRequest, [error]: errorMessage }]);
}

// --- Syncs for BrontoBoard Queries ---

/**
 * Sync for fetching all BrontoBoards owned by the authenticated user.
 * Path: GET /brontoboard/mine
 * Authorization: Checks if the session is valid.
 */
export const GetMyBrontoBoards: Sync = (
  { request, session, user, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/mine", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request]; // Capture the original request ID

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Query for all BrontoBoards owned by this user
    // The `user` variable is now bound in `authFrames`.
    const userBrontoBoardsFrames = await authFrames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user },
      { brontoBoard },
    );

    if (userBrontoBoardsFrames.length === 0) {
      // If user has no BrontoBoards, construct a single frame with empty results
      return new Frames([{ [request]: originalRequest, [results]: [] }]);
    }

    // 3. Collect all found BrontoBoards as 'results'
    const collectedFrames = userBrontoBoardsFrames.collectAs([brontoBoard], results);

    // Ensure the output frame only has `request` and `results` (no `error`)
    return collectedFrames.map((frame) => ({
      [request]: originalRequest,
      [results]: frame[results],
    }));
  },
  then: actions(
    // If 'results' is in the frame, this fires.
    [Requesting.respond, { request, results }],
    // If 'error' is in the frame (from invalid session), this fires.
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching a specific BrontoBoard by its ID.
 * Path: GET /brontoboard/:brontoBoardId
 * Authorization: Checks if the session is valid and if the user is the owner of the BrontoBoard.
 */
export const GetBrontoBoardById: Sync = (
  { request, session, brontoBoardId, user, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/:brontoBoardId", session, brontoBoardId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific BrontoBoard
    // The `brontoBoardId` is from the path parameter.
    let bbFrames = await authFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: brontoBoardId },
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `BrontoBoard with ID ${brontoBoardId} not found.`);
    }

    // 3. Authorize: Check if the user is the owner of this BrontoBoard
    const authorizedBbFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedBbFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this BrontoBoard.");
    }

    // Return the single BrontoBoard object directly
    return new Frames([{
      [request]: originalRequest,
      [results]: authorizedBbFrames[0][brontoBoard], // Assuming _getBrontoBoardById returns at most one
    }]);
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching all Classes associated with a specific BrontoBoard.
 * Path: GET /brontoboard/:brontoBoardId/classes
 * Authorization: Checks if the session is valid and if the user is the owner of the BrontoBoard.
 */
export const GetClassesForBrontoBoard: Sync = (
  { request, session, brontoBoardId, user, brontoBoard, class: classVar, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/:brontoBoardId/classes", session, brontoBoardId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific BrontoBoard to check ownership
    let bbFrames = await authFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: brontoBoardId },
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `BrontoBoard with ID ${brontoBoardId} not found.`);
    }

    // 3. Authorize: Check if the user is the owner of this BrontoBoard
    const authorizedBbFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedBbFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this BrontoBoard.");
    }

    // 4. Query for classes within this authorized BrontoBoard
    // The `brontoBoardId` from the request is used to query.
    const classFrames = await authorizedBbFrames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: brontoBoardId },
      { class: classVar },
    );

    if (classFrames.length === 0) {
      return new Frames([{ [request]: originalRequest, [results]: [] }]);
    }

    // 5. Collect all found classes as 'results'
    const collectedFrames = classFrames.collectAs([classVar], results);

    return collectedFrames.map((frame) => ({
      [request]: originalRequest,
      [results]: frame[results],
    }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching a specific Class by its ID.
 * Path: GET /class/:classId
 * Authorization: Checks if the session is valid and if the user is the owner of the parent BrontoBoard.
 */
export const GetClassById: Sync = (
  { request, session, classId, user, class: classVar, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/class/:classId", session, classId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific Class
    let classObjFrames = await authFrames.query(
      BrontoBoard._getClassById,
      { class: classId },
      { class: classVar },
    );
    if (classObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Class with ID ${classId} not found.`);
    }

    // 3. Get the parent BrontoBoard using the class's `brontoBoardId`
    // Use the `classVar` bound in `classObjFrames` to get the `brontoBoardId`.
    let bbFrames = await classObjFrames.query(
      BrontoBoard._getBrontoBoardById,
      (frame) => ({ brontoBoard: frame[classVar].brontoBoardId }),
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      // This indicates a data inconsistency if the class exists but its parent BrontoBoard does not.
      return createErrorFrame(originalRequest, `Internal Error: Parent BrontoBoard for class ${classId} not found.`);
    }

    // 4. Authorize: Check if the user is the owner of the parent BrontoBoard
    const authorizedFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this class's BrontoBoard.");
    }

    // Return the single class object
    return new Frames([{
      [request]: originalRequest,
      [results]: authorizedFrames[0][classVar], // Assuming _getClassById returns at most one
    }]);
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching all Assignments for a specific Class.
 * Path: GET /class/:classId/assignments
 * Authorization: Checks if the session is valid and if the user is the owner of the parent BrontoBoard of the Class.
 */
export const GetAssignmentsForClass: Sync = (
  { request, session, classId, user, class: classVar, brontoBoard, assignment, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/class/:classId/assignments", session, classId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific Class to check its BrontoBoard ownership
    let classObjFrames = await authFrames.query(
      BrontoBoard._getClassById,
      { class: classId },
      { class: classVar },
    );
    if (classObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Class with ID ${classId} not found.`);
    }

    // 3. Get the parent BrontoBoard using the class's `brontoBoardId`
    let bbFrames = await classObjFrames.query(
      BrontoBoard._getBrontoBoardById,
      (frame) => ({ brontoBoard: frame[classVar].brontoBoardId }),
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent BrontoBoard for class ${classId} not found.`);
    }

    // 4. Authorize: Check if the user is the owner of the parent BrontoBoard
    const authorizedFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this class's BrontoBoard.");
    }

    // 5. Query for assignments within this authorized class
    const assignmentFrames = await authorizedFrames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: classId },
      { assignment },
    );

    if (assignmentFrames.length === 0) {
      return new Frames([{ [request]: originalRequest, [results]: [] }]);
    }

    // 6. Collect all found assignments as 'results'
    const collectedFrames = assignmentFrames.collectAs([assignment], results);

    return collectedFrames.map((frame) => ({
      [request]: originalRequest,
      [results]: frame[results],
    }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching all Office Hours for a specific Class.
 * Path: GET /class/:classId/officehours
 * Authorization: Checks if the session is valid and if the user is the owner of the parent BrontoBoard of the Class.
 */
export const GetOfficeHoursForClass: Sync = (
  { request, session, classId, user, class: classVar, brontoBoard, officeHour, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/class/:classId/officehours", session, classId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific Class to check its BrontoBoard ownership
    let classObjFrames = await authFrames.query(
      BrontoBoard._getClassById,
      { class: classId },
      { class: classVar },
    );
    if (classObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Class with ID ${classId} not found.`);
    }

    // 3. Get the parent BrontoBoard using the class's `brontoBoardId`
    let bbFrames = await classObjFrames.query(
      BrontoBoard._getBrontoBoardById,
      (frame) => ({ brontoBoard: frame[classVar].brontoBoardId }),
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent BrontoBoard for class ${classId} not found.`);
    }

    // 4. Authorize: Check if the user is the owner of the parent BrontoBoard
    const authorizedFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this class's BrontoBoard.");
    }

    // 5. Query for office hours within this authorized class
    const officeHourFrames = await authorizedFrames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: classId },
      { officeHour },
    );

    if (officeHourFrames.length === 0) {
      return new Frames([{ [request]: originalRequest, [results]: [] }]);
    }

    // 6. Collect all found office hours as 'results'
    const collectedFrames = officeHourFrames.collectAs([officeHour], results);

    return collectedFrames.map((frame) => ({
      [request]: originalRequest,
      [results]: frame[results],
    }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching a specific Assignment by its ID.
 * Path: GET /assignment/:assignmentId
 * Authorization: Checks if the session is valid and if the user is the owner of the parent BrontoBoard of the Assignment.
 */
export const GetAssignmentById: Sync = (
  { request, session, assignmentId, user, assignment, class: classVar, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/assignment/:assignmentId", session, assignmentId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific Assignment
    let assignmentObjFrames = await authFrames.query(
      BrontoBoard._getAssignmentById,
      { assignment: assignmentId },
      { assignment },
    );
    if (assignmentObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Assignment with ID ${assignmentId} not found.`);
    }

    // 3. Get the parent Class using the assignment's `classId`
    let classObjFrames = await assignmentObjFrames.query(
      BrontoBoard._getClassById,
      (frame) => ({ class: frame[assignment].classId }),
      { class: classVar },
    );
    if (classObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent Class for assignment ${assignmentId} not found.`);
    }

    // 4. Get the parent BrontoBoard using the class's `brontoBoardId`
    let bbFrames = await classObjFrames.query(
      BrontoBoard._getBrontoBoardById,
      (frame) => ({ brontoBoard: frame[classVar].brontoBoardId }),
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent BrontoBoard for class of assignment ${assignmentId} not found.`);
    }

    // 5. Authorize: Check if the user is the owner of the parent BrontoBoard
    const authorizedFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this assignment's BrontoBoard.");
    }

    // Return the single assignment object
    return new Frames([{
      [request]: originalRequest,
      [results]: authorizedFrames[0][assignment], // Assuming _getAssignmentById returns at most one
    }]);
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync for fetching a specific Office Hour by its ID.
 * Path: GET /officehour/:officeHourId
 * Authorization: Checks if the session is valid and if the user is the owner of the parent BrontoBoard of the Office Hour.
 */
export const GetOfficeHourById: Sync = (
  { request, session, officeHourId, user, officeHour, class: classVar, brontoBoard, results, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/officehour/:officeHourId", session, officeHourId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequest = frames[0][request];

    // 1. Authorize: Get user from session
    let authFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authFrames.length === 0) {
      return createErrorFrame(originalRequest, "Unauthorized: Invalid session.");
    }

    // 2. Get the specific OfficeHour
    let officeHourObjFrames = await authFrames.query(
      BrontoBoard._getOfficeHourById,
      { officeHour: officeHourId },
      { officeHour },
    );
    if (officeHourObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Office Hour with ID ${officeHourId} not found.`);
    }

    // 3. Get the parent Class using the office hour's `classId`
    let classObjFrames = await officeHourObjFrames.query(
      BrontoBoard._getClassById,
      (frame) => ({ class: frame[officeHour].classId }),
      { class: classVar },
    );
    if (classObjFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent Class for office hour ${officeHourId} not found.`);
    }

    // 4. Get the parent BrontoBoard using the class's `brontoBoardId`
    let bbFrames = await classObjFrames.query(
      BrontoBoard._getBrontoBoardById,
      (frame) => ({ brontoBoard: frame[classVar].brontoBoardId }),
      { brontoBoard },
    );
    if (bbFrames.length === 0) {
      return createErrorFrame(originalRequest, `Internal Error: Parent BrontoBoard for class of office hour ${officeHourId} not found.`);
    }

    // 5. Authorize: Check if the user is the owner of the parent BrontoBoard
    const authorizedFrames = bbFrames.filter((frame) => frame[brontoBoard].owner === frame[user]);
    if (authorizedFrames.length === 0) {
      return createErrorFrame(originalRequest, "Forbidden: Not the owner of this office hour's BrontoBoard.");
    }

    // Return the single office hour object
    return new Frames([{
      [request]: originalRequest,
      [results]: authorizedFrames[0][officeHour], // Assuming _getOfficeHourById returns at most one
    }]);
  },
  then: actions(
    [Requesting.respond, { request, results }],
    [Requesting.respond, { request, error }],
  ),
});
```
