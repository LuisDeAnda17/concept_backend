---
timestamp: 'Mon Nov 03 2025 20:33:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_203352.0b29cad1.md]]'
content_id: 8aef364d5fcb38bb3cabc9cafac287d8eb9c61022ffe7e5b904c713ba9a8bee9
---

# response:

Here's the TypeScript file containing the synchronizations for the `BrontoBoard` concept's query methods (often referred to as "getter functions"). These syncs expose the queries via `Requesting` actions, perform authorization using the `Sessioning` concept, and handle both successful responses and error conditions.

This solution includes a reusable `authorizeUserAndBrontoBoard` helper function within the same sync file to encapsulate the common authorization logic.

**File:** `src/syncs/brontoboard_queries.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
// Import all necessary concepts from your @concepts alias
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is available from @utils/types.ts

// --- Helper for creating common authorization flow in where clause ---
// This function ensures the user associated with the session owns the BrontoBoard
// relevant to the requested entity (or the BrontoBoard itself).
// It returns a modified Frames object, potentially containing an error if authorization fails.
async function authorizeUserAndBrontoBoard(
  frames: Frames,
  session: ID,
  brontoBoardId: ID,
  userSymbol: symbol, // The symbol for the user variable
  brontoBoardSymbol: symbol, // The symbol for the brontoBoard document variable
): Promise<Frames> {
  // Capture the original frame's context for potential error responses
  const originalFrame = frames[0];

  // 1. Get the user from the session
  frames = await frames.query(Sessioning._getUser, { session }, { user: userSymbol });
  if (frames.length === 0) {
    // Session is invalid or user not found, return an error frame
    return new Frames({ ...originalFrame, error: "Invalid session or user not found." });
  }

  // 2. Get the BrontoBoard by ID
  frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardSymbol });
  if (frames.length === 0) {
    // BrontoBoard not found, return an error frame
    return new Frames({ ...originalFrame, error: `BrontoBoard with ID '${brontoBoardId}' not found.` });
  }

  // 3. Filter frames to ensure the user is the owner of this BrontoBoard
  // frames will now contain frames with both userSymbol and brontoBoardSymbol bound.
  frames = frames.filter(($) => {
    const brontoBoardDoc = $[brontoBoardSymbol];
    const currentUser = $[userSymbol];
    return brontoBoardDoc && brontoBoardDoc.owner === currentUser;
  });

  if (frames.length === 0) {
    // User is not the owner, return an authorization error frame
    return new Frames({ ...originalFrame, error: "Unauthorized: User does not own this BrontoBoard." });
  }

  return frames;
}

// --- Syncs for _getBrontoBoardsForUser (List User's BrontoBoards) ---

/**
 * Sync: Request to list all BrontoBoards for the logged-in user.
 * Catches an incoming HTTP request, resolves the user from the session,
 * then calls BrontoBoard._getBrontoBoardsForUser.
 */
export const ListBrontoBoardsRequest: Sync = (
  { request, session, tempUser, brontoBoardResults }, // brontoBoardResults will hold the collected list
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/list", session },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Preserve context for error/empty response

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Query BrontoBoard._getBrontoBoardsForUser using the obtained user
    frames = await frames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user: frames[0][tempUser] }, // Use the bound user symbol
      { brontoBoard: brontoBoardResults }, // Bind results to a temporary symbol
    );

    // If no brontoBoards found, ensure we still return an empty array for a successful but empty response
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [brontoBoardResults]: [] });
    }

    // Collect all individual BrontoBoard documents into a single array under brontoBoardResults
    return frames.collectAs([brontoBoardResults], brontoBoardResults);
  },
  then: actions(
    [Requesting.respond, { request, brontoBoards: brontoBoardResults }],
  ),
});

/**
 * Sync: Respond to an error during listing BrontoBoards.
 * Catches errors propagated from the 'where' clause.
 */
export const ListBrontoBoardsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/list" }, { request }],
    // Match a frame that contains an 'error' binding (typically from the where clause)
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getClassesForBrontoBoard (List Classes for a BrontoBoard) ---

/**
 * Sync: Request to list all Classes for a specific BrontoBoard.
 * Authorizes user ownership of the BrontoBoard, then queries for its classes.
 */
export const ListClassesRequest: Sync = (
  { request, session, brontoBoardId, tempUser, tempBrontoBoard, classResults },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/:brontoBoardId/classes", session },
      { request, brontoBoardId: brontoBoardId }, // Extract brontoBoardId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // Authorize the user as the owner of the specified BrontoBoard
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      originalRequestFrame[brontoBoardId],
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Now, with authorization confirmed, query for classes for that BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: originalRequestFrame[brontoBoardId] },
      { class: classResults }, // Bind multiple results
    );

    // If no classes found, return an empty array for a successful but empty response
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [classResults]: [] });
    }

    // Collect all individual Class documents into a single array
    return frames.collectAs([classResults], classResults);
  },
  then: actions(
    [Requesting.respond, { request, classes: classResults }],
  ),
});

/**
 * Sync: Respond to an error during listing Classes.
 */
export const ListClassesError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoardId/classes" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});


// --- Syncs for _getAssignmentsForClass (List Assignments for a Class) ---

/**
 * Sync: Request to list all Assignments for a specific Class.
 * Authorizes user ownership of the parent BrontoBoard, then queries for assignments.
 */
export const ListAssignmentsRequest: Sync = (
  { request, session, classId, tempUser, tempClass, tempBrontoBoard, assignmentResults },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/:classId/assignments", session },
      { request, classId: classId }, // Extract classId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: originalRequestFrame[session] }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Get the Class by ID to find its parent BrontoBoard
    frames = await frames.query(BrontoBoard._getClassById, { class: originalRequestFrame[classId] }, { class: tempClass });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Class with ID '${originalRequestFrame[classId]}' not found.` });
    }

    // 3. Authorize the user as owner of the BrontoBoard linked to this class
    const classDoc = frames[0][tempClass]; // Get the ClassDoc from the frame
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      classDoc.brontoBoardId, // Use BrontoBoardId from the fetched ClassDoc
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Now, with authorization confirmed, query for assignments for that Class
    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: originalRequestFrame[classId] },
      { assignment: assignmentResults },
    );

    // If no assignments found, return an empty array for a successful but empty response
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [assignmentResults]: [] });
    }

    return frames.collectAs([assignmentResults], assignmentResults);
  },
  then: actions(
    [Requesting.respond, { request, assignments: assignmentResults }],
  ),
});

/**
 * Sync: Respond to an error during listing Assignments.
 */
export const ListAssignmentsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:classId/assignments" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getOfficeHoursForClass (List Office Hours for a Class) ---

/**
 * Sync: Request to list all Office Hours for a specific Class.
 * Authorizes user ownership of the parent BrontoBoard, then queries for office hours.
 */
export const ListOfficeHoursRequest: Sync = (
  { request, session, classId, tempUser, tempClass, tempBrontoBoard, officeHourResults },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/:classId/officehours", session },
      { request, classId: classId }, // Extract classId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: originalRequestFrame[session] }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Get the Class by ID to find its parent BrontoBoard
    frames = await frames.query(BrontoBoard._getClassById, { class: originalRequestFrame[classId] }, { class: tempClass });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Class with ID '${originalRequestFrame[classId]}' not found.` });
    }

    // 3. Authorize the user as owner of the BrontoBoard linked to this class
    const classDoc = frames[0][tempClass]; // Get the ClassDoc from the frame
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      classDoc.brontoBoardId, // Use BrontoBoardId from the fetched ClassDoc
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Now, with authorization confirmed, query for office hours for that Class
    frames = await frames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: originalRequestFrame[classId] },
      { officeHour: officeHourResults },
    );

    // If no office hours found, return an empty array for a successful but empty response
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [officeHourResults]: [] });
    }

    return frames.collectAs([officeHourResults], officeHourResults);
  },
  then: actions(
    [Requesting.respond, { request, officeHours: officeHourResults }],
  ),
});

/**
 * Sync: Respond to an error during listing Office Hours.
 */
export const ListOfficeHoursError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:classId/officehours" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getBrontoBoardById (Get a Specific BrontoBoard) ---

/**
 * Sync: Request to get a specific BrontoBoard by its ID.
 * Authorizes user ownership of the BrontoBoard.
 */
export const GetBrontoBoardByIdRequest: Sync = (
  { request, session, brontoBoardId, tempUser, tempBrontoBoard, brontoBoardResult },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/:brontoBoardId", session },
      { request, brontoBoardId: brontoBoardId }, // Extract brontoBoardId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // Authorize the user as the owner of the specified BrontoBoard
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      originalRequestFrame[brontoBoardId],
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // The authorizeUserAndBrontoBoard function already fetched the BrontoBoard document
    // and bound it to `tempBrontoBoard`. We now bind it to `brontoBoardResult` for the response.
    const foundBrontoBoard = frames[0][tempBrontoBoard];
    return new Frames({ ...originalRequestFrame, [brontoBoardResult]: foundBrontoBoard });
  },
  then: actions(
    [Requesting.respond, { request, brontoBoard: brontoBoardResult }],
  ),
});

/**
 * Sync: Respond to an error during fetching a specific BrontoBoard.
 */
export const GetBrontoBoardByIdError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoardId" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getClassById (Get a Specific Class) ---

/**
 * Sync: Request to get a specific Class by its ID.
 * Authorizes user ownership of the parent BrontoBoard.
 */
export const GetClassByIdRequest: Sync = (
  { request, session, classId, tempUser, tempClass, tempBrontoBoard, classResult },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/:classId", session },
      { request, classId: classId }, // Extract classId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: originalRequestFrame[session] }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Get the Class by ID
    frames = await frames.query(BrontoBoard._getClassById, { class: originalRequestFrame[classId] }, { class: tempClass });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Class with ID '${originalRequestFrame[classId]}' not found.` });
    }

    // 3. Authorize the user as owner of the BrontoBoard linked to this class
    const classDoc = frames[0][tempClass];
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      classDoc.brontoBoardId,
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Bind the fetched Class document to classResult for the response
    const foundClass = frames[0][tempClass];
    return new Frames({ ...originalRequestFrame, [classResult]: foundClass });
  },
  then: actions(
    [Requesting.respond, { request, class: classResult }],
  ),
});

/**
 * Sync: Respond to an error during fetching a specific Class.
 */
export const GetClassByIdError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/:classId" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getAssignmentById (Get a Specific Assignment) ---

/**
 * Sync: Request to get a specific Assignment by its ID.
 * Authorizes user ownership of the parent BrontoBoard.
 */
export const GetAssignmentByIdRequest: Sync = (
  { request, session, assignmentId, tempUser, tempAssignment, tempClass, tempBrontoBoard, assignmentResult },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/assignment/:assignmentId", session },
      { request, assignmentId: assignmentId }, // Extract assignmentId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: originalRequestFrame[session] }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Get the Assignment by ID
    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: originalRequestFrame[assignmentId] }, { assignment: tempAssignment });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Assignment with ID '${originalRequestFrame[assignmentId]}' not found.` });
    }

    // 3. Get the Class by ID from the assignment to find its parent BrontoBoard
    const assignmentDoc = frames[0][tempAssignment];
    frames = await frames.query(BrontoBoard._getClassById, { class: assignmentDoc.classId }, { class: tempClass });
    if (frames.length === 0) {
      // This indicates data inconsistency if an assignment points to a non-existent class.
      return new Frames({ ...originalRequestFrame, error: `Internal error: Class for assignment '${originalRequestFrame[assignmentId]}' not found.` });
    }

    // 4. Authorize the user as owner of the BrontoBoard linked to this class
    const classDoc = frames[0][tempClass];
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      classDoc.brontoBoardId,
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Bind the fetched Assignment document to assignmentResult for the response
    const foundAssignment = frames[0][tempAssignment];
    return new Frames({ ...originalRequestFrame, [assignmentResult]: foundAssignment });
  },
  then: actions(
    [Requesting.respond, { request, assignment: assignmentResult }],
  ),
});

/**
 * Sync: Respond to an error during fetching a specific Assignment.
 */
export const GetAssignmentByIdError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/:assignmentId" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Syncs for _getOfficeHourById (Get Specific Office Hour) ---

/**
 * Sync: Request to get specific Office Hours by ID.
 * Authorizes user ownership of the parent BrontoBoard.
 */
export const GetOfficeHourByIdRequest: Sync = (
  { request, session, officeHourId, tempUser, tempOfficeHour, tempClass, tempBrontoBoard, officeHourResult },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/officehours/:officeHourId", session },
      { request, officeHourId: officeHourId }, // Extract officeHourId from path
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: originalRequestFrame[session] }, { user: tempUser });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Get the Office Hour by ID
    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: originalRequestFrame[officeHourId] }, { officeHour: tempOfficeHour });
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Office Hour with ID '${originalRequestFrame[officeHourId]}' not found.` });
    }

    // 3. Get the Class by ID from the office hour to find its parent BrontoBoard
    const officeHourDoc = frames[0][tempOfficeHour];
    frames = await frames.query(BrontoBoard._getClassById, { class: officeHourDoc.classId }, { class: tempClass });
    if (frames.length === 0) {
      // This indicates data inconsistency if an office hour points to a non-existent class.
      return new Frames({ ...originalRequestFrame, error: `Internal error: Class for office hour '${originalRequestFrame[officeHourId]}' not found.` });
    }

    // 4. Authorize the user as owner of the BrontoBoard linked to this class
    const classDoc = frames[0][tempClass];
    frames = await authorizeUserAndBrontoBoard(
      frames,
      originalRequestFrame[session],
      classDoc.brontoBoardId,
      tempUser,
      tempBrontoBoard,
    );

    if ("error" in frames[0]) {
      return frames; // Propagate authorization error
    }

    // Bind the fetched Office Hour document to officeHourResult for the response
    const foundOfficeHour = frames[0][tempOfficeHour];
    return new Frames({ ...originalRequestFrame, [officeHourResult]: foundOfficeHour });
  },
  then: actions(
    [Requesting.respond, { request, officeHour: officeHourResult }],
  ),
});

/**
 * Sync: Respond to an error during fetching specific Office Hours.
 */
export const GetOfficeHourByIdError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/:officeHourId" }, { request }],
    [{ _type: "error" }, { error }, {}],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
