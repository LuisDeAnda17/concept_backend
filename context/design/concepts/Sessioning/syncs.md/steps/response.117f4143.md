---
timestamp: 'Mon Nov 03 2025 21:06:21 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_210621.6ff80a97.md]]'
content_id: 117f41435ae9e11ea49db2b2158077d48d36a161ce5fa56527941224f44f3c8b
---

# response:

```typescript
// src/syncs/brontoboard_queries.sync.ts

// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
// Utility types and functions
import { ID } from "@utils/types.ts";

// --- Symbols for binding variables within frames ---
// These are not exported, as they are internal to this sync file's logic
const userVar = Symbol("user"); // Using userVar to avoid conflict if 'user' is an action parameter
const bbDoc = Symbol("bbDoc"); // For BrontoBoardDoc fetched by query
const cDoc = Symbol("cDoc"); // For ClassDoc fetched by query
const aDoc = Symbol("aDoc"); // For AssignmentDoc fetched by query
const ohDoc = Symbol("ohDoc"); // For OfficeHourDoc fetched by query

// --- Helper for handling authorization and non-found errors in `where` clauses ---
// This function helps adhere to the "zero matches" pattern for authorization failures,
// ensuring an error is always returned to the requestor rather than a silent timeout.
// It's defined here and used inline in the 'where' clause of each Request sync.
function createErrorFrame(originalFrame: Record<symbol, unknown>, errorMessage: string): Frames {
  return new Frames({ ...originalFrame, error: errorMessage });
}

// ========================================================================
// 1. GET ASSIGNMENTS FOR CLASS
// Path: /api/brontoboard/assignments-by-class
// Input: classId: ID, session: ID
// Output (query): assignment: AssignmentDoc[]
// Authorization: User must own the BrontoBoard that contains the `class`.
// ========================================================================

export const GetAssignmentsForClassRequest: Sync = ({
  request,
  session,
  class: inputClassId, // Alias 'class' to 'inputClassId' to avoid keyword conflict
  assignments, // Output variable from BrontoBoard._getAssignmentsForClass
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignments-by-class", session, class: inputClassId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original frame for potential error responses

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    // 2. Authorize: User must own the BrontoBoard that contains the 'class'
    // First, get the Class document to find its parent BrontoBoard ID
    frames = await frames.query(BrontoBoard._getClassById, { class: inputClassId as ID }, { classDoc: cDoc });

    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Class with ID ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Now, get the parent BrontoBoard document using the class's brontoBoardId
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames[0][cDoc].brontoBoardId as ID }, // Use the brontoBoardId from the fetched class
      { brontoBoardDoc: bbDoc },
    );

    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent BrontoBoard for class ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Filter frames to keep only those where the authenticated user is the owner of the BrontoBoard
    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);

    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access Class ${inputClassId}.`);
    }

    return frames; // If we reach here, user is authenticated and authorized
  },
  then: actions(
    // Trigger the BrontoBoard query for assignments for the authorized class
    [BrontoBoard._getAssignmentsForClass, { class: inputClassId as ID }, { assignments }],
  ),
});

export const GetAssignmentsForClassResponse: Sync = ({ request, assignments }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignments-by-class" }, { request }],
    [BrontoBoard._getAssignmentsForClass, {}, { assignments }], // Matches successful output
  ),
  then: actions(
    [Requesting.respond, { request, results: assignments }], // Respond with the query results
  ),
});

export const GetAssignmentsForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignments-by-class" }, { request }],
    [BrontoBoard._getAssignmentsForClass, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }], // Respond with the error
  ),
});

// ========================================================================
// 2. GET OFFICE HOURS FOR CLASS
// Path: /api/brontoboard/office-hours-by-class
// Input: classId: ID, session: ID
// Output (query): officeHour: OfficeHourDoc[]
// Authorization: User must own the BrontoBoard that contains the `class`.
// ========================================================================

export const GetOfficeHoursForClassRequest: Sync = ({
  request,
  session,
  class: inputClassId,
  officeHours, // Output variable from BrontoBoard._getOfficeHoursForClass
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hours-by-class", session, class: inputClassId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = await frames.query(BrontoBoard._getClassById, { class: inputClassId as ID }, { classDoc: cDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Class with ID ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames[0][cDoc].brontoBoardId as ID },
      { brontoBoardDoc: bbDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent BrontoBoard for class ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access Class ${inputClassId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getOfficeHoursForClass, { class: inputClassId as ID }, { officeHours }],
  ),
});

export const GetOfficeHoursForClassResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hours-by-class" }, { request }],
    [BrontoBoard._getOfficeHoursForClass, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, results: officeHours }],
  ),
});

export const GetOfficeHoursForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hours-by-class" }, { request }],
    [BrontoBoard._getOfficeHoursForClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 3. GET CLASSES FOR BRONTOBOARD
// Path: /api/brontoboard/classes-by-board
// Input: brontoBoardId: ID, session: ID
// Output (query): class: ClassDoc[]
// Authorization: User must own the `brontoBoard`.
// ========================================================================

export const GetClassesForBrontoBoardRequest: Sync = ({
  request,
  session,
  brontoBoard: inputBrontoBoardId, // Alias 'brontoBoard'
  classes, // Output variable from BrontoBoard._getClassesForBrontoBoard
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes-by-board", session, brontoBoard: inputBrontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Authorize: User must own the 'brontoBoard' directly
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: inputBrontoBoardId as ID }, { brontoBoardDoc: bbDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `BrontoBoard with ID ${inputBrontoBoardId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access BrontoBoard ${inputBrontoBoardId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getClassesForBrontoBoard, { brontoBoard: inputBrontoBoardId as ID }, { classes }],
  ),
});

export const GetClassesForBrontoBoardResponse: Sync = ({ request, classes }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes-by-board" }, { request }],
    [BrontoBoard._getClassesForBrontoBoard, {}, { classes }],
  ),
  then: actions(
    [Requesting.respond, { request, results: classes }],
  ),
});

export const GetClassesForBrontoBoardErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes-by-board" }, { request }],
    [BrontoBoard._getClassesForBrontoBoard, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 4. GET BRONTOBOARDS FOR USER (MY BOARDS)
// Path: /api/brontoboard/my-boards
// Input: session: ID
// Output (query): brontoBoard: BrontoBoardDoc[]
// Authorization: User is identified by the session.
// ========================================================================

export const GetMyBrontoBoardsRequest: Sync = ({
  request,
  session,
  brontoBoards, // Output variable from BrontoBoard._getBrontoBoardsForUser
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/my-boards", session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate user via session. No further ownership check needed for *their own* boards.
    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    return frames; // User is authenticated, and the query is for *their* boards, so authorized.
  },
  then: actions(
    [BrontoBoard._getBrontoBoardsForUser, { user: userVar as ID }, { brontoBoards }],
  ),
});

export const GetMyBrontoBoardsResponse: Sync = ({ request, brontoBoards }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/my-boards" }, { request }],
    [BrontoBoard._getBrontoBoardsForUser, {}, { brontoBoards }],
  ),
  then: actions(
    [Requesting.respond, { request, results: brontoBoards }],
  ),
});

export const GetMyBrontoBoardsErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/my-boards" }, { request }],
    [BrontoBoard._getBrontoBoardsForUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 5. GET BRONTOBOARD BY ID
// Path: /api/brontoboard/board-by-id
// Input: brontoBoardId: ID, session: ID
// Output (query): brontoBoard: BrontoBoardDoc[]
// Authorization: User must own the `brontoBoard`.
// ========================================================================

export const GetBrontoBoardByIdRequest: Sync = ({
  request,
  session,
  brontoBoard: inputBrontoBoardId,
  brontoBoard: outputBrontoBoard, // Output variable from BrontoBoard._getBrontoBoardById
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/board-by-id", session, brontoBoard: inputBrontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Authorize: User must own the 'brontoBoard'
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: inputBrontoBoardId as ID }, { brontoBoardDoc: bbDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `BrontoBoard with ID ${inputBrontoBoardId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access BrontoBoard ${inputBrontoBoardId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getBrontoBoardById, { brontoBoard: inputBrontoBoardId as ID }, { brontoBoard: outputBrontoBoard }],
  ),
});

export const GetBrontoBoardByIdResponse: Sync = ({ request, brontoBoard }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/board-by-id" }, { request }],
    [BrontoBoard._getBrontoBoardById, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, results: brontoBoard }],
  ),
});

export const GetBrontoBoardByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/board-by-id" }, { request }],
    [BrontoBoard._getBrontoBoardById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 6. GET CLASS BY ID
// Path: /api/brontoboard/class-by-id
// Input: classId: ID, session: ID
// Output (query): class: ClassDoc[]
// Authorization: User must own the BrontoBoard that contains the `class`.
// ========================================================================

export const GetClassByIdRequest: Sync = ({
  request,
  session,
  class: inputClassId,
  class: outputClass, // Output variable from BrontoBoard._getClassById
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class-by-id", session, class: inputClassId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = await frames.query(BrontoBoard._getClassById, { class: inputClassId as ID }, { classDoc: cDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Class with ID ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames[0][cDoc].brontoBoardId as ID },
      { brontoBoardDoc: bbDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent BrontoBoard for class ${inputClassId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access Class ${inputClassId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getClassById, { class: inputClassId as ID }, { class: outputClass }],
  ),
});

export const GetClassByIdResponse: Sync = ({ request, class: outputClass }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class-by-id" }, { request }],
    [BrontoBoard._getClassById, {}, { class: outputClass }],
  ),
  then: actions(
    [Requesting.respond, { request, results: outputClass }],
  ),
});

export const GetClassByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class-by-id" }, { request }],
    [BrontoBoard._getClassById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 7. GET ASSIGNMENT BY ID
// Path: /api/brontoboard/assignment-by-id
// Input: assignmentId: ID, session: ID
// Output (query): assignment: AssignmentDoc[]
// Authorization: User must own the BrontoBoard that contains the `assignment`'s class.
// ========================================================================

export const GetAssignmentByIdRequest: Sync = ({
  request,
  session,
  assignment: inputAssignmentId,
  assignment: outputAssignment, // Output variable from BrontoBoard._getAssignmentById
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment-by-id", session, assignment: inputAssignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    // First, get the Assignment document to find its parent Class ID
    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: inputAssignmentId as ID }, { assignmentDoc: aDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Assignment with ID ${inputAssignmentId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Now, get the parent Class document to find its parent BrontoBoard ID
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: frames[0][aDoc].classId as ID },
      { classDoc: cDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent Class for assignment ${inputAssignmentId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Finally, get the parent BrontoBoard document for authorization
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames[0][cDoc].brontoBoardId as ID },
      { brontoBoardDoc: bbDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent BrontoBoard for assignment ${inputAssignmentId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access Assignment ${inputAssignmentId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getAssignmentById, { assignment: inputAssignmentId as ID }, { assignment: outputAssignment }],
  ),
});

export const GetAssignmentByIdResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment-by-id" }, { request }],
    [BrontoBoard._getAssignmentById, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, results: assignment }],
  ),
});

export const GetAssignmentByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment-by-id" }, { request }],
    [BrontoBoard._getAssignmentById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ========================================================================
// 8. GET OFFICE HOUR BY ID
// Path: /api/brontoboard/office-hour-by-id
// Input: officeHourId: ID, session: ID
// Output (query): officeHour: OfficeHourDoc[]
// Authorization: User must own the BrontoBoard that contains the `officeHour`'s class.
// ========================================================================

export const GetOfficeHourByIdRequest: Sync = ({
  request,
  session,
  officeHour: inputOfficeHourId,
  officeHour: outputOfficeHour, // Output variable from BrontoBoard._getOfficeHourById
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hour-by-id", session, officeHour: inputOfficeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: userVar });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || "Invalid session or user not found.";
      return createErrorFrame(originalFrame, errorMsg);
    }

    // First, get the OfficeHour document to find its parent Class ID
    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: inputOfficeHourId as ID }, { officeHourDoc: ohDoc });
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Office Hour with ID ${inputOfficeHourId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Now, get the parent Class document to find its parent BrontoBoard ID
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: frames[0][ohDoc].classId as ID },
      { classDoc: cDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent Class for office hour ${inputOfficeHourId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    // Finally, get the parent BrontoBoard document for authorization
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames[0][cDoc].brontoBoardId as ID },
      { brontoBoardDoc: bbDoc },
    );
    if (frames.length === 0 || frames[0].error) {
      const errorMsg = frames[0]?.error || `Parent BrontoBoard for office hour ${inputOfficeHourId} not found.`;
      return createErrorFrame(originalFrame, errorMsg);
    }

    frames = frames.filter(($) => $[bbDoc].owner === $[userVar]);
    if (frames.length === 0) {
      return createErrorFrame(originalFrame, `User is not authorized to access Office Hour ${inputOfficeHourId}.`);
    }

    return frames;
  },
  then: actions(
    [BrontoBoard._getOfficeHourById, { officeHour: inputOfficeHourId as ID }, { officeHour: outputOfficeHour }],
  ),
});

export const GetOfficeHourByIdResponse: Sync = ({ request, officeHour }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hour-by-id" }, { request }],
    [BrontoBoard._getOfficeHourById, {}, { officeHour }],
  ),
  then: actions(
    [Requesting.respond, { request, results: officeHour }],
  ),
});

export const GetOfficeHourByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hour-by-id" }, { request }],
    [BrontoBoard._getOfficeHourById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
