---
timestamp: 'Mon Nov 03 2025 20:37:45 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_203745.3d4500e7.md]]'
content_id: e68f2d16392d71ee650d2d5e8d099416f819d17549df5c2bac40c9710b33bbde
---

# response:

```typescript
// file: src/syncs/brontoboard.sync.ts

import { actions, Sync, Frames } from "@engine";
// Import all necessary concepts from your @concepts alias
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is available from @utils/types.ts

// --- Helper for authorization in where clauses ---
// This function encapsulates the common logic for checking if a user owns a BrontoBoard
// or the BrontoBoard associated with a Class/Assignment/OfficeHour.
// It returns frames that are authorized, or frames with an error object if unauthorized or not found.
// If frames become empty for other reasons (e.g., session invalid), it's a silent failure (no response).
async function authorizeBrontoBoardAccess(
  frames: Frames,
  sessionId: symbol,
  userSymbol: symbol,
  brontoBoardIdSymbol?: symbol,
  classIdSymbol?: symbol,
  assignmentIdSymbol?: symbol,
  officeHourIdSymbol?: symbol,
): Promise<Frames> {
  const initialFrame = frames[0]; // Keep reference to original request data

  // 1. Get the user from the session
  const userFrames = await frames.query(Sessioning._getUser, { session: sessionId }, { user: userSymbol });
  if (userFrames.length === 0) {
    // Session invalid or not found, fail silently for now or add explicit error to initialFrame if needed.
    // For queries, often failing silently for invalid session is a security feature (no info leakage).
    return new Frames();
  }
  // If userFrames is not empty, it contains [{ [userSymbol]: userId }]
  const userId = userFrames[0][userSymbol] as User;

  let targetBrontoBoardId: ID | undefined;

  // Determine the BrontoBoard ID based on input symbols
  if (brontoBoardIdSymbol) {
    targetBrontoBoardId = initialFrame[brontoBoardIdSymbol] as ID;
  } else if (classIdSymbol) {
    const classId = initialFrame[classIdSymbol] as ID;
    const classDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getClassById, { class: classId }, { classDoc: Symbol("classDoc") });
    if (classDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Class not found." });
    }
    const classDoc = classDocsResult[0][Symbol("classDoc")];
    if (!classDoc || 'error' in classDoc) { // Check for internal error in concept query
        return new Frames({ ...initialFrame, error: classDoc?.error || "Class not found." });
    }
    targetBrontoBoardId = classDoc.brontoBoardId;
  } else if (assignmentIdSymbol) {
    const assignmentId = initialFrame[assignmentIdSymbol] as ID;
    const assignmentDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc: Symbol("assignmentDoc") });
    if (assignmentDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Assignment not found." });
    }
    const assignmentDoc = assignmentDocsResult[0][Symbol("assignmentDoc")];
     if (!assignmentDoc || 'error' in assignmentDoc) { // Check for internal error in concept query
        return new Frames({ ...initialFrame, error: assignmentDoc?.error || "Assignment not found." });
    }
    const classDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getClassById, { class: assignmentDoc.classId }, { classDoc: Symbol("classDoc") });
    if (classDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Class for assignment not found." });
    }
    const classDoc = classDocsResult[0][Symbol("classDoc")];
    if (!classDoc || 'error' in classDoc) { // Check for internal error in concept query
        return new Frames({ ...initialFrame, error: classDoc?.error || "Class for assignment not found." });
    }
    targetBrontoBoardId = classDoc.brontoBoardId;
  } else if (officeHourIdSymbol) {
    const officeHourId = initialFrame[officeHourIdSymbol] as ID;
    const officeHourDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc: Symbol("officeHourDoc") });
    if (officeHourDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Office Hour not found." });
    }
    const officeHourDoc = officeHourDocsResult[0][Symbol("officeHourDoc")];
    if (!officeHourDoc || 'error' in officeHourDoc) { // Check for internal error in concept query
        return new Frames({ ...initialFrame, error: officeHourDoc?.error || "Office Hour not found." });
    }
    const classDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getClassById, { class: officeHourDoc.classId }, { classDoc: Symbol("classDoc") });
    if (classDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Class for office hour not found." });
    }
    const classDoc = classDocsResult[0][Symbol("classDoc")];
    if (!classDoc || 'error' in classDoc) { // Check for internal error in concept query
        return new Frames({ ...initialFrame, error: classDoc?.error || "Class for office hour not found." });
    }
    targetBrontoBoardId = classDoc.brontoBoardId;
  }

  // If a specific BrontoBoard ID was identified, check ownership
  if (targetBrontoBoardId) {
    const brontoBoardDocsResult = await (new Frames([{ [userSymbol]: userId }])).query(BrontoBoard._getBrontoBoardById, { brontoBoard: targetBrontoBoardId }, { brontoBoardDoc: Symbol("brontoBoardDoc") });
    if (brontoBoardDocsResult.length === 0) {
      return new Frames({ ...initialFrame, error: "Unauthorized access or BrontoBoard not found." });
    }
    const brontoBoardDoc = brontoBoardDocsResult[0][Symbol("brontoBoardDoc")];
    if (!brontoBoardDoc || 'error' in brontoBoardDoc) {
        return new Frames({ ...initialFrame, error: brontoBoardDoc?.error || "Unauthorized access or BrontoBoard not found." });
    }
    if (brontoBoardDoc.owner !== userId) {
      return new Frames({ ...initialFrame, error: "Unauthorized: User does not own the BrontoBoard." });
    }
  }

  // If authorized, return the original frame augmented with user binding
  // This ensures subsequent queries have access to all initial request bindings.
  return new Frames([{ ...initialFrame, [userSymbol]: userId }]);
}


// --- 1. _getAssignmentsForClass ---

export const GetAssignmentsForClassRequest: Sync = (
  { request, session, class: classId, user, assignments, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/assignments", session, class: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      undefined, // brontoBoardIdSymbol
      classId,   // classIdSymbol
    );

    if (authorizedFrames.length === 0) {
        // This case handles invalid sessions (silent fail).
        return new Frames();
    }
    // Check if the authorization helper itself returned an error (e.g., "Class not found")
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    // Now call the actual BrontoBoard query
    const queryFrames = await authorizedFrames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignments: assignments });
    
    // Check if the query returned an error object
    const queryResult = queryFrames[0][assignments];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        // Augment original frame with this internal query error
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }

    // Ensure assignments is always an array (even if empty, which is valid)
    const finalAssignments = Array.isArray(queryResult) ? queryResult : [];

    // Combine results back to a single frame for the response
    return new Frames({ ...originalFrame, [assignments]: finalAssignments });
  },
  then: actions(
    [Requesting.respond, { request, assignments }],
  ),
});

// Error handling sync for GetAssignmentsForClassRequest
export const GetAssignmentsForClassError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/assignments" }, { request }],
  ),
  where: (frames) => {
      // Filter for frames that explicitly contain an authorization error or an internal query error
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      // Prefer authError if present, otherwise internalError
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 2. _getOfficeHoursForClass ---

export const GetOfficeHoursForClassRequest: Sync = (
  { request, session, class: classId, user, officeHours, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/officehours", session, class: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      undefined, // brontoBoardIdSymbol
      classId,   // classIdSymbol
    );

    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHours: officeHours });
    
    const queryResult = queryFrames[0][officeHours];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalOfficeHours = Array.isArray(queryResult) ? queryResult : [];
    return new Frames({ ...originalFrame, [officeHours]: finalOfficeHours });
  },
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const GetOfficeHoursForClassError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/officehours" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 3. _getClassesForBrontoBoard ---

export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, brontoBoard: brontoBoardId, user, classes, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/brontoboard/classes", session, brontoBoard: brontoBoardId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      brontoBoardId, // brontoBoardIdSymbol
    );

    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { classes: classes });

    const queryResult = queryFrames[0][classes];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalClasses = Array.isArray(queryResult) ? queryResult : [];
    return new Frames({ ...originalFrame, [classes]: finalClasses });
  },
  then: actions(
    [Requesting.respond, { request, classes }],
  ),
});

export const GetClassesForBrontoBoardError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/brontoboard/classes" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 4. _getBrontoBoardsForUser ---
// Note: This query implicitly filters by user, so the authorizeBrontoBoardAccess helper is
// slightly overkill, but the session check is still valuable.

export const GetBrontoBoardsForUserRequest: Sync = (
  { request, session, user, brontoBoards, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/my-brontoboards", session },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (userFrames.length === 0) {
        // Invalid session, respond with an error
        return new Frames({ ...originalFrame, [authError]: "Invalid session." });
    }

    // Since _getBrontoBoardsForUser already takes 'user' as input, no further ownership check needed here
    // The query itself will filter results for this user.
    const queryFrames = await userFrames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoards: brontoBoards });

    const queryResult = queryFrames[0][brontoBoards];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalBrontoBoards = Array.isArray(queryResult) ? queryResult : [];
    return new Frames({ ...originalFrame, [brontoBoards]: finalBrontoBoards });
  },
  then: actions(
    [Requesting.respond, { request, brontoBoards }],
  ),
});

export const GetBrontoBoardsForUserError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/my-brontoboards" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 5. _getBrontoBoardById ---

export const GetBrontoBoardByIdRequest: Sync = (
  { request, session, brontoBoard: brontoBoardId, user, brontoBoardDoc, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/get", session, brontoBoard: brontoBoardId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      brontoBoardId, // brontoBoardIdSymbol
    );
    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc: brontoBoardDoc });

    const queryResult = queryFrames[0][brontoBoardDoc];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    // _getBrontoBoardById returns an array, pick the first element if found
    const finalResult = Array.isArray(queryResult) && queryResult.length > 0 ? queryResult[0] : null; 
    return new Frames({ ...originalFrame, [brontoBoardDoc]: finalResult });
  },
  then: actions(
    [Requesting.respond, { request, brontoBoard: brontoBoardDoc }],
  ),
});

export const GetBrontoBoardByIdError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/get" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 6. _getClassById ---

export const GetClassByIdRequest: Sync = (
  { request, session, class: classId, user, classDoc, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/get", session, class: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      undefined, // brontoBoardIdSymbol
      classId,   // classIdSymbol
    );
    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: classDoc });

    const queryResult = queryFrames[0][classDoc];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalResult = Array.isArray(queryResult) && queryResult.length > 0 ? queryResult[0] : null;
    return new Frames({ ...originalFrame, [classDoc]: finalResult });
  },
  then: actions(
    [Requesting.respond, { request, class: classDoc }],
  ),
});

export const GetClassByIdError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/get" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 7. _getAssignmentById ---

export const GetAssignmentByIdRequest: Sync = (
  { request, session, assignment: assignmentId, user, assignmentDoc, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/assignment/get", session, assignment: assignmentId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      undefined, // brontoBoardIdSymbol
      undefined, // classIdSymbol
      assignmentId, // assignmentIdSymbol
    );
    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc: assignmentDoc });

    const queryResult = queryFrames[0][assignmentDoc];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalResult = Array.isArray(queryResult) && queryResult.length > 0 ? queryResult[0] : null;
    return new Frames({ ...originalFrame, [assignmentDoc]: finalResult });
  },
  then: actions(
    [Requesting.respond, { request, assignment: assignmentDoc }],
  ),
});

export const GetAssignmentByIdError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/get" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});


// --- 8. _getOfficeHourById ---

export const GetOfficeHourByIdRequest: Sync = (
  { request, session, officeHour: officeHourId, user, officeHourDoc, error: authError, internalError },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/officehours/get", session, officeHour: officeHourId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authorizedFrames = await authorizeBrontoBoardAccess(
      frames,
      session,
      user,
      undefined, // brontoBoardIdSymbol
      undefined, // classIdSymbol
      undefined, // assignmentIdSymbol
      officeHourId, // officeHourIdSymbol
    );
    if (authorizedFrames.length === 0) {
        return new Frames();
    }
    if (authorizedFrames[0].hasOwnProperty(Symbol("error"))) {
        return new Frames({ ...originalFrame, [authError]: authorizedFrames[0][Symbol("error")] });
    }

    const queryFrames = await authorizedFrames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc: officeHourDoc });

    const queryResult = queryFrames[0][officeHourDoc];
    if (queryResult && typeof queryResult === 'object' && 'error' in queryResult) {
        return new Frames({ ...originalFrame, [internalError]: queryResult.error });
    }
    const finalResult = Array.isArray(queryResult) && queryResult.length > 0 ? queryResult[0] : null;
    return new Frames({ ...originalFrame, [officeHourDoc]: finalResult });
  },
  then: actions(
    [Requesting.respond, { request, officeHour: officeHourDoc }],
  ),
});

export const GetOfficeHourByIdError: Sync = ({ request, authError, internalError }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/get" }, { request }],
  ),
  where: (frames) => {
      return frames.filter(($) => $[authError] || $[internalError]);
  },
  then: actions(
      [Requesting.respond, { request, error: authError || internalError }],
  ),
});
```
