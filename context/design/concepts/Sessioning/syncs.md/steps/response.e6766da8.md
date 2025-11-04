---
timestamp: 'Mon Nov 03 2025 20:45:03 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_204503.c45a4d77.md]]'
content_id: e6766da878690604bc04078c4b48b1816d3ddeb4bdb22f328ef3d23f200a9a28
---

# response:

```typescript
// src/syncs/brontoboard_queries.sync.ts

// These two help you declare synchronizations
import { actions, Frames, Sync } from "@engine";
// Choose whatever concepts you have
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
// Utility type for IDs
import { ID } from "@utils/types.ts";

/**
 * authorizeAndRetrieveData helper
 * This helper performs session authentication and authorization checks based on ownership
 * for BrontoBoard-related entities (BrontoBoard, Class, Assignment, OfficeHour).
 * It returns a Frames object.
 *   - If authorization fails or a related entity is not found: a single Frame with an 'error' binding.
 *   - If authorization succeeds: Frames enriched with `requesterUser` and potentially `brontoBoardDoc`, `classDoc`, `assignmentDoc`, `officeHourDoc`.
 *
 * @param frames The initial set of frames from the `when` clause.
 * @param sessionId The session ID from the request.
 * @param queryParams An object specifying which BrontoBoard entity is being queried (e.g., `{ class: classId }`).
 * @param bindings An object containing symbols for variables to bind the results to within the frames.
 *                 These symbols correspond to the variables destructured in the `Sync` function.
 * @returns A Promise resolving to a Frames object, which either contains the authorized data or an error frame.
 */
async function authorizeAndRetrieveData(
  frames: Frames,
  sessionId: ID,
  queryParams: {
    brontoBoard?: ID;
    class?: ID;
    assignment?: ID;
    officeHour?: ID;
    user?: ID; // For _getBrontoBoardsForUser, the user ID being queried
  },
  bindings: {
      requesterUser: symbol; // Symbol for the authenticated user ID
      brontoBoardDoc?: symbol; // Symbol for the BrontoBoard document
      classDoc?: symbol;     // Symbol for the Class document
      assignmentDoc?: symbol; // Symbol for the Assignment document
      officeHourDoc?: symbol; // Symbol for the OfficeHour document
      error: symbol;         // Symbol for the error message
  }
): Promise<Frames> {
  const originalFrame = frames[0] || {}; // Capture the initial frame for potential error response

  // 1. Get user from session
  let authFrames = await frames.query(Sessioning._getUser, { session: sessionId }, { user: bindings.requesterUser });
  if (authFrames.length === 0) { // Session not found or error in _getUser
    // Reconstruct frame with error, ensure original request context is kept
    const errorMsg = originalFrame[bindings.error] || (authFrames.length > 0 && 'error' in authFrames[0] ? (authFrames[0] as any)['error'] : "Session not found or invalid.");
    return new Frames({ ...originalFrame, [bindings.error]: errorMsg });
  }

  const requesterUserId = authFrames[0][bindings.requesterUser];
  // Ensure all frames carry the requesterUser and merge any original frame data
  frames = authFrames.map(f => ({ ...originalFrame, ...f, [bindings.requesterUser]: requesterUserId }));

  // 2. Perform authorization based on queryParams and enrich frames with relevant docs
  if (queryParams.assignment && bindings.assignmentDoc && bindings.classDoc && bindings.brontoBoardDoc) {
    let assignmentFrames = await frames.query(BrontoBoard._getAssignmentById, { assignment: queryParams.assignment }, { assignmentDoc: bindings.assignmentDoc });
    if (assignmentFrames.length === 0) return new Frames({ ...originalFrame, [bindings.error]: "Assignment not found." });
    
    let classFrames = await assignmentFrames.query(BrontoBoard._getClassById, { class: (assignmentFrames[0] as any)[bindings.assignmentDoc].classId }, { classDoc: bindings.classDoc });
    if (classFrames.length === 0) return new Frames({ ...originalFrame, [bindings.error]: "Class associated with assignment not found." });
    
    let brontoBoardFrames = await classFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: (classFrames[0] as any)[bindings.classDoc].brontoBoardId }, { brontoBoardDoc: bindings.brontoBoardDoc });
    if (brontoBoardFrames.length === 0 || (brontoBoardFrames[0] as any)[bindings.brontoBoardDoc].owner !== requesterUserId) {
      return new Frames({ ...originalFrame, [bindings.error]: "Unauthorized: User does not own the BrontoBoard for this assignment." });
    }
    frames = brontoBoardFrames.map(f => ({ 
        ...f, 
        [bindings.requesterUser]: requesterUserId,
        [bindings.assignmentDoc!]: (assignmentFrames[0] as any)[bindings.assignmentDoc], 
        [bindings.classDoc!]: (classFrames[0] as any)[bindings.classDoc] 
    }));
    
  } else if (queryParams.officeHour && bindings.officeHourDoc && bindings.classDoc && bindings.brontoBoardDoc) {
    let ohFrames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: queryParams.officeHour }, { officeHourDoc: bindings.officeHourDoc });
    if (ohFrames.length === 0) return new Frames({ ...originalFrame, [bindings.error]: "Office hours not found." });

    let classFrames = await ohFrames.query(BrontoBoard._getClassById, { class: (ohFrames[0] as any)[bindings.officeHourDoc].classId }, { classDoc: bindings.classDoc });
    if (classFrames.length === 0) return new Frames({ ...originalFrame, [bindings.error]: "Class associated with office hours not found." });

    let brontoBoardFrames = await classFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: (classFrames[0] as any)[bindings.classDoc].brontoBoardId }, { brontoBoardDoc: bindings.brontoBoardDoc });
    if (brontoBoardFrames.length === 0 || (brontoBoardFrames[0] as any)[bindings.brontoBoardDoc].owner !== requesterUserId) {
      return new Frames({ ...originalFrame, [bindings.error]: "Unauthorized: User does not own the BrontoBoard for these office hours." });
    }
    frames = brontoBoardFrames.map(f => ({ 
        ...f, 
        [bindings.requesterUser]: requesterUserId,
        [bindings.officeHourDoc!]: (ohFrames[0] as any)[bindings.officeHourDoc], 
        [bindings.classDoc!]: (classFrames[0] as any)[bindings.classDoc] 
    }));

  } else if (queryParams.class && bindings.classDoc && bindings.brontoBoardDoc) {
    let classFrames = await frames.query(BrontoBoard._getClassById, { class: queryParams.class }, { classDoc: bindings.classDoc });
    if (classFrames.length === 0) return new Frames({ ...originalFrame, [bindings.error]: "Class not found." });

    let brontoBoardFrames = await classFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: (classFrames[0] as any)[bindings.classDoc].brontoBoardId }, { brontoBoardDoc: bindings.brontoBoardDoc });
    if (brontoBoardFrames.length === 0 || (brontoBoardFrames[0] as any)[bindings.brontoBoardDoc].owner !== requesterUserId) {
      return new Frames({ ...originalFrame, [bindings.error]: "Unauthorized: User does not own the BrontoBoard for this class." });
    }
    frames = brontoBoardFrames.map(f => ({ ...f, [bindings.requesterUser]: requesterUserId, [bindings.classDoc!]: (classFrames[0] as any)[bindings.classDoc] }));

  } else if (queryParams.brontoBoard && bindings.brontoBoardDoc) {
    let brontoBoardFrames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: queryParams.brontoBoard }, { brontoBoardDoc: bindings.brontoBoardDoc });
    if (brontoBoardFrames.length === 0 || (brontoBoardFrames[0] as any)[bindings.brontoBoardDoc].owner !== requesterUserId) {
      return new Frames({ ...originalFrame, [bindings.error]: "Unauthorized: User does not own this BrontoBoard." });
    }
    frames = brontoBoardFrames.map(f => ({ ...f, [bindings.requesterUser]: requesterUserId })); // Ensure requesterUser is propagated

  } else if (queryParams.user) { // Specific for _getBrontoBoardsForUser
    if (requesterUserId !== queryParams.user) {
      return new Frames({ ...originalFrame, [bindings.error]: "Unauthorized: Cannot view BrontoBoards for another user." });
    }
  }

  // Ensure requesterUser is consistently propagated to all frames if not already there
  if (frames.length > 0 && !(frames[0] as any)[bindings.requesterUser]) {
    frames = frames.map(frame => ({ ...frame, [bindings.requesterUser]: requesterUserId }));
  }
  return frames;
}

// --- SYNC IMPLEMENTATIONS ---

// #region Get Assignments for Class
export const GetAssignmentsForClassRequest: Sync = ({ request, session, class: classId, assignments, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class/assignments", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    // 1. Authenticate session and authorize access to the class
    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      // Auth failed, propagate error to be caught by the error sync
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    // 2. Perform the actual data query
    let assignmentResultsFrames = await authorizedFrames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment: assignmentDocSym });
    
    // 3. If no assignments found, return an empty array for 'assignments'
    if (assignmentResultsFrames.length === 0) {
      return new Frames({ ...originalFrame, [assignments]: [] });
    }

    // 4. Collect and return successful results
    return assignmentResultsFrames.collectAs([assignmentDocSym], assignments);
  },
  then: actions(
    [Requesting.respond, { request, assignments }], // Success path
  ),
});

export const GetAssignmentsForClassError: Sync = ({ request, session, class: classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class/assignments", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    // Attempt authorization. If it returns an error, we catch it here.
    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      // Error detected, pass it through for the 'then' clause
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    // No error, so this sync should not fire. Return empty frames.
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }], // Error path
  ),
});
// #endregion

// #region Get Office Hours for Class
export const GetOfficeHoursForClassRequest: Sync = ({ request, session, class: classId, officeHours, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class/office-hours", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    let ohResultsFrames = await authorizedFrames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour: officeHourDocSym });
    
    if (ohResultsFrames.length === 0) {
      return new Frames({ ...originalFrame, [officeHours]: [] });
    }
    return ohResultsFrames.collectAs([officeHourDocSym], officeHours);
  },
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const GetOfficeHoursForClassError: Sync = ({ request, session, class: classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class/office-hours", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get Classes for BrontoBoard
export const GetClassesForBrontoBoardRequest: Sync = ({ request, session, brontoBoard: brontoBoardId, classes, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoard/classes", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { brontoBoard: brontoBoardId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    let classResultsFrames = await authorizedFrames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { class: classDocSym });
    
    if (classResultsFrames.length === 0) {
      return new Frames({ ...originalFrame, [classes]: [] });
    }
    return classResultsFrames.collectAs([classDocSym], classes);
  },
  then: actions(
    [Requesting.respond, { request, classes }],
  ),
});

export const GetClassesForBrontoBoardError: Sync = ({ request, session, brontoBoard: brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoard/classes", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { brontoBoard: brontoBoardId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get BrontoBoards for User
export const GetBrontoBoardsForUserRequest: Sync = ({ request, session, user, brontoBoards, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/user/:user/brontoboards", session, user }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    // Here, queryParams.user is the user whose brontoboards are requested, and it must match requesterUser
    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { user: user }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    let brontoBoardResultsFrames = await authorizedFrames.query(BrontoBoard._getBrontoBoardsForUser, { user: user }, { brontoBoard: brontoBoardDocSym });
    
    if (brontoBoardResultsFrames.length === 0) {
      return new Frames({ ...originalFrame, [brontoBoards]: [] });
    }
    return brontoBoardResultsFrames.collectAs([brontoBoardDocSym], brontoBoards);
  },
  then: actions(
    [Requesting.respond, { request, brontoBoards }],
  ),
});

export const GetBrontoBoardsForUserError: Sync = ({ request, session, user, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/user/:user/brontoboards", session, user }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { user: user }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get BrontoBoard by ID
export const GetBrontoBoardByIdRequest: Sync = ({ request, session, brontoBoard: brontoBoardId, brontoBoard, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoard", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { brontoBoard: brontoBoardId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    // The brontoBoardDoc is already bound in authorizedFrames[0] by the helper
    const brontoBoardDoc = (authorizedFrames[0] as any)[brontoBoardDocSym];
    
    // Return a single frame with the 'brontoBoard' variable bound to the retrieved document
    return new Frames({ ...originalFrame, [brontoBoard]: brontoBoardDoc });
  },
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

export const GetBrontoBoardByIdError: Sync = ({ request, session, brontoBoard: brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoard", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { brontoBoard: brontoBoardId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get Class by ID
export const GetClassByIdRequest: Sync = ({ request, session, class: classId, class: classOutput, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    const classDoc = (authorizedFrames[0] as any)[classDocSym];
    if (!classDoc) { // Should not happen if authFrames passed, but for type safety
        return new Frames({ ...originalFrame, [error]: "Class document not found after authorization." });
    }
    
    return new Frames({ ...originalFrame, [classOutput]: classDoc });
  },
  then: actions(
    [Requesting.respond, { request, class: classOutput }],
  ),
});

export const GetClassByIdError: Sync = ({ request, session, class: classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:class", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { class: classId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get Assignment by ID
export const GetAssignmentByIdRequest: Sync = ({ request, session, assignment: assignmentId, assignment, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:assignment", session, assignment: assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { assignment: assignmentId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    const assignmentDoc = (authorizedFrames[0] as any)[assignmentDocSym];
    if (!assignmentDoc) {
        return new Frames({ ...originalFrame, [error]: "Assignment document not found after authorization." });
    }
    
    return new Frames({ ...originalFrame, [assignment]: assignmentDoc });
  },
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

export const GetAssignmentByIdError: Sync = ({ request, session, assignment: assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:assignment", session, assignment: assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { assignment: assignmentId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion

// #region Get Office Hour by ID
export const GetOfficeHourByIdRequest: Sync = ({ request, session, officeHour: officeHourId, officeHour, error, requesterUser }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hour/:officeHour", session, officeHour: officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { officeHour: officeHourId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    
    const officeHourDoc = (authorizedFrames[0] as any)[officeHourDocSym];
    if (!officeHourDoc) {
        return new Frames({ ...originalFrame, [error]: "Office Hour document not found after authorization." });
    }
    
    return new Frames({ ...originalFrame, [officeHour]: officeHourDoc });
  },
  then: actions(
    [Requesting.respond, { request, officeHour }],
  ),
});

export const GetOfficeHourByIdError: Sync = ({ request, session, officeHour: officeHourId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hour/:officeHour", session, officeHour: officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const requesterUserSym = Symbol('requesterUser');
    const brontoBoardDocSym = Symbol('brontoBoardDoc');
    const classDocSym = Symbol('classDoc');
    const assignmentDocSym = Symbol('assignmentDoc');
    const officeHourDocSym = Symbol('officeHourDoc');

    let authorizedFrames = await authorizeAndRetrieveData(
      frames, session, { officeHour: officeHourId }, 
      { requesterUser: requesterUserSym, brontoBoardDoc: brontoBoardDocSym, classDoc: classDocSym, assignmentDoc: assignmentDocSym, officeHourDoc: officeHourDocSym, error: error }
    );

    if (authorizedFrames.length === 1 && (authorizedFrames[0] as any)[error]) {
      return new Frames({ ...originalFrame, [error]: (authorizedFrames[0] as any)[error] });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
// #endregion
```
