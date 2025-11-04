---
timestamp: 'Mon Nov 03 2025 20:49:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_204930.b7df1175.md]]'
content_id: 38794f4662a5c6a3750b6f4be786ecb3acc1d61dd0be3a9c0fadbab2869c1a26
---

# response:

Here are the synchronization implementations for the BrontoBoard concept's getter functions, including success and explicit error handling for session invalidity, entity not found, and unauthorized access, all within a single TypeScript file.

```typescript
// src/syncs/brontoboard_queries.sync.ts

import { actions, Frames, Sync } from "@engine";
// Import all necessary concepts
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
// Import utility types for ID management
import { ID } from "@utils/types.ts";

// ============================================================================
// Type Definitions for Clarity
// These match the internal structure of BrontoBoardConcept documents
// ============================================================================

type User = ID;
type BrontoBoardID = ID;
type ClassID = ID;
type AssignmentID = ID;
type OfficeHourID = ID;

interface BrontoBoardDocType {
  _id: BrontoBoardID;
  owner: User;
  calendar: ID;
}
interface ClassDocType {
  _id: ClassID;
  brontoBoardId: BrontoBoardID;
  name: string;
  overview: string;
}
interface AssignmentDocType {
  _id: AssignmentID;
  classId: ClassID;
  name: string;
  dueDate: Date;
}
interface OfficeHourDocType {
  _id: OfficeHourID;
  classId: ClassID;
  startTime: Date;
  duration: number;
}

// ============================================================================
// Syncs for BrontoBoard._getBrontoBoardsForUser (GET /BrontoBoard/myBrontoBoards)
// Purpose: Retrieve all BrontoBoards owned by the currently authenticated user.
// ============================================================================

export const GetMyBrontoBoardsSuccess: Sync = ({ request, session, user, brontoBoard, results }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/myBrontoBoards", session }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Capture initial request context

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Let GetMyBrontoBoardsSessionError handle invalid session

    // 2. Query for BrontoBoards owned by this user
    let brontoBoardFrames = await frames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard });

    // 3. Handle 'Zero Matches' for expected empty results: respond with an empty array if no boards found.
    if (brontoBoardFrames.length === 0) {
      return new Frames([{ [request]: originalRequestFrame[request], [results]: [] }]);
    }

    // 4. Collect all found BrontoBoards into a 'results' array for the response.
    return brontoBoardFrames.collectAs([brontoBoard], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetMyBrontoBoardsSessionError: Sync = ({ request, session, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/myBrontoBoards", session }, { request }],
    [Sessioning._getUser, { session }, { error }], // Catches if Sessioning._getUser explicitly returns an error
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getBrontoBoardById (GET /BrontoBoard/:brontoBoardId)
// Purpose: Retrieve a specific BrontoBoard if the authenticated user is its owner.
// ============================================================================

export const GetBrontoBoardByIdSuccess: Sync = ({ request, session, user, brontoBoardId, brontoBoardDoc, results }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetBrontoBoardByIdSessionError

    // 2. Get the specific BrontoBoard document by its ID
    let boardFrames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (boardFrames.length === 0) return []; // Handled by GetBrontoBoardByIdNotFoundError

    // 3. Authorize: Check if the authenticated user is the owner of this BrontoBoard
    const authorizedFrames = boardFrames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetBrontoBoardByIdUnauthorizedError

    // Success: Map the single found document to 'results' for the response.
    return authorizedFrames.map(($) => ({ ...$, results: $[brontoBoardDoc] }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetBrontoBoardByIdSessionError: Sync = ({ request, session, brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId", session, brontoBoardId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetBrontoBoardByIdNotFoundError: Sync = ({ request, session, user, brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    // Re-authenticate session to ensure this error fires only if session is valid
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetBrontoBoardByIdSessionError

    // Check if BrontoBoard exists. If not found, create an error frame.
    let boardFrames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc: "any" }); // "any" because we just need to check for existence
    if (boardFrames.length > 0) return []; // If found, this isn't a NotFound error

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `BrontoBoard with ID '${brontoBoardId}' not found.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetBrontoBoardByIdUnauthorizedError: Sync = ({ request, session, user, brontoBoardId, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    // Re-authenticate session and get BrontoBoard to check authorization
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetBrontoBoardByIdSessionError

    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Handled by GetBrontoBoardByIdNotFoundError

    // If user is not the owner, create an unauthorized error frame.
    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return []; // User is authorized, not an Unauthorized error

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to BrontoBoard with ID '${brontoBoardId}'. User is not the owner.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getClassesForBrontoBoard (GET /BrontoBoard/:brontoBoardId/classes)
// Purpose: Retrieve all classes belonging to a specific BrontoBoard, if the user owns it.
// ============================================================================

export const GetClassesForBrontoBoardSuccess: Sync = ({ request, session, user, brontoBoardId, brontoBoardDoc, _class, results }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetClassesForBrontoBoardSessionError

    // 2. Get the BrontoBoard to ensure it exists
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Handled by GetClassesForBrontoBoardBrontoBoardNotFoundError

    // 3. Authorize: Check if the authenticated user is the owner of this BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetClassesForBrontoBoardUnauthorizedError

    // 4. Query for classes belonging to the authorized BrontoBoard
    let classFrames = await authorizedFrames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { _class });
    if (classFrames.length === 0) {
      // No classes found, return empty array results
      return new Frames([{ [request]: originalRequestFrame[request], [results]: [] }]);
    }
    return classFrames.collectAs([_class], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetClassesForBrontoBoardSessionError: Sync = ({ request, session, brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetClassesForBrontoBoardBrontoBoardNotFoundError: Sync = ({ request, session, user, brontoBoardId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let boardFrames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc: "any" });
    if (boardFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `BrontoBoard with ID '${brontoBoardId}' not found for retrieving classes.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetClassesForBrontoBoardUnauthorizedError: Sync = ({ request, session, user, brontoBoardId, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return [];

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to BrontoBoard with ID '${brontoBoardId}' for retrieving classes. User is not the owner.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getClassById (GET /Class/:classId)
// Purpose: Retrieve a specific class if the authenticated user owns its parent BrontoBoard.
// ============================================================================

export const GetClassByIdSuccess: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, results }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetClassByIdSessionError

    // 2. Get the specific Class document by its ID
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return []; // Handled by GetClassByIdNotFoundError

    // 3. Get the parent BrontoBoard of this class
    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Internal inconsistency or BrontoBoard deleted unexpectedly

    // 4. Authorize: Check if the authenticated user is the owner of the parent BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetClassByIdUnauthorizedError

    // Success: Map the single found document to 'results' for the response.
    return authorizedFrames.map(($) => ({ ...$, results: $[classDoc] }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetClassByIdSessionError: Sync = ({ request, session, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId", session, classId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetClassByIdNotFoundError: Sync = ({ request, session, user, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let classFrames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: "any" });
    if (classFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Class with ID '${classId}' not found.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetClassByIdUnauthorizedError: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return [];

    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Class references a non-existent BrontoBoard

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to Class with ID '${classId}'. User is not the owner of its BrontoBoard.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getAssignmentsForClass (GET /Class/:classId/assignments)
// Purpose: Retrieve all assignments for a specific class, if the user owns its parent BrontoBoard.
// ============================================================================

export const GetAssignmentsForClassSuccess: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, assignment, results }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/assignments", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetAssignmentsForClassSessionError

    // 2. Get the Class to ensure it exists
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return []; // Handled by GetAssignmentsForClassClassNotFoundError

    // 3. Get the parent BrontoBoard of this class
    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 4. Authorize: Check if the authenticated user is the owner of the parent BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetAssignmentsForClassUnauthorizedError

    // 5. Query for assignments belonging to the authorized class
    let assignmentFrames = await authorizedFrames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment });
    if (assignmentFrames.length === 0) {
      // No assignments found, return empty array results
      return new Frames([{ [request]: originalRequestFrame[request], [results]: [] }]);
    }
    return assignmentFrames.collectAs([assignment], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetAssignmentsForClassSessionError: Sync = ({ request, session, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/assignments", session, classId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetAssignmentsForClassClassNotFoundError: Sync = ({ request, session, user, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/assignments", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let classFrames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: "any" });
    if (classFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Class with ID '${classId}' not found for retrieving assignments.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetAssignmentsForClassUnauthorizedError: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/assignments", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return [];

    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return [];

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to Class with ID '${classId}' for retrieving assignments. User is not the owner of its BrontoBoard.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getAssignmentById (GET /Assignment/:assignmentId)
// Purpose: Retrieve a specific assignment if the user owns its parent BrontoBoard.
// ============================================================================

export const GetAssignmentByIdSuccess: Sync = ({ request, session, user, assignmentId, assignmentDoc, classDoc, brontoBoardDoc, results }) => ({
  when: actions(
    [Requesting.request, { path: "/Assignment/:assignmentId", session, assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetAssignmentByIdSessionError

    // 2. Get the specific Assignment document by its ID
    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc });
    if (frames.length === 0) return []; // Handled by GetAssignmentByIdNotFoundError

    // 3. Get the parent Class of this assignment
    const currentAssignmentDoc = frames[0][assignmentDoc] as AssignmentDocType;
    frames = await frames.query(BrontoBoard._getClassById, { class: currentAssignmentDoc.classId }, { classDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 4. Get the parent BrontoBoard of this class
    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 5. Authorize: Check if the authenticated user is the owner of the parent BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetAssignmentByIdUnauthorizedError

    // Success: Map the single found document to 'results' for the response.
    return authorizedFrames.map(($) => ({ ...$, results: $[assignmentDoc] }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetAssignmentByIdSessionError: Sync = ({ request, session, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Assignment/:assignmentId", session, assignmentId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetAssignmentByIdNotFoundError: Sync = ({ request, session, user, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Assignment/:assignmentId", session, assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let assignmentFrames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc: "any" });
    if (assignmentFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Assignment with ID '${assignmentId}' not found.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetAssignmentByIdUnauthorizedError: Sync = ({ request, session, user, assignmentId, assignmentDoc, classDoc, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Assignment/:assignmentId", session, assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc });
    if (frames.length === 0) return [];

    const currentAssignmentDoc = frames[0][assignmentDoc] as AssignmentDocType;
    frames = await frames.query(BrontoBoard._getClassById, { class: currentAssignmentDoc.classId }, { classDoc });
    if (frames.length === 0) return [];

    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return [];

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to Assignment with ID '${assignmentId}'. User is not the owner of its BrontoBoard.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getOfficeHoursForClass (GET /Class/:classId/officeHours)
// Purpose: Retrieve all office hours for a specific class, if the user owns its parent BrontoBoard.
// ============================================================================

export const GetOfficeHoursForClassSuccess: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, officeHour, results }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/officeHours", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetOfficeHoursForClassSessionError

    // 2. Get the Class to ensure it exists
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return []; // Handled by GetOfficeHoursForClassClassNotFoundError

    // 3. Get the parent BrontoBoard of this class
    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 4. Authorize: Check if the authenticated user is the owner of the parent BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetOfficeHoursForClassUnauthorizedError

    // 5. Query for office hours belonging to the authorized class
    let officeHourFrames = await authorizedFrames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour });
    if (officeHourFrames.length === 0) {
      // No office hours found, return empty array results
      return new Frames([{ [request]: originalRequestFrame[request], [results]: [] }]);
    }
    return officeHourFrames.collectAs([officeHour], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetOfficeHoursForClassSessionError: Sync = ({ request, session, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/officeHours", session, classId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetOfficeHoursForClassClassNotFoundError: Sync = ({ request, session, user, classId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/officeHours", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let classFrames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: "any" });
    if (classFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Class with ID '${classId}' not found for retrieving office hours.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetOfficeHoursForClassUnauthorizedError: Sync = ({ request, session, user, classId, classDoc, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Class/:classId/officeHours", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return [];

    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return [];

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to Class with ID '${classId}' for retrieving office hours. User is not the owner of its BrontoBoard.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ============================================================================
// Syncs for BrontoBoard._getOfficeHourById (GET /OfficeHour/:officeHourId)
// Purpose: Retrieve a specific office hour record if the user owns its parent BrontoBoard.
// ============================================================================

export const GetOfficeHourByIdSuccess: Sync = ({ request, session, user, officeHourId, officeHourDoc, classDoc, brontoBoardDoc, results }) => ({
  when: actions(
    [Requesting.request, { path: "/OfficeHour/:officeHourId", session, officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return []; // Handled by GetOfficeHourByIdSessionError

    // 2. Get the specific OfficeHour document by its ID
    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc });
    if (frames.length === 0) return []; // Handled by GetOfficeHourByIdNotFoundError

    // 3. Get the parent Class of this office hour
    const currentOfficeHourDoc = frames[0][officeHourDoc] as OfficeHourDocType;
    frames = await frames.query(BrontoBoard._getClassById, { class: currentOfficeHourDoc.classId }, { classDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 4. Get the parent BrontoBoard of this class
    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return []; // Internal inconsistency

    // 5. Authorize: Check if the authenticated user is the owner of the parent BrontoBoard
    const authorizedFrames = frames.filter(($) => $[user] === ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (authorizedFrames.length === 0) return []; // Handled by GetOfficeHourByIdUnauthorizedError

    // Success: Map the single found document to 'results' for the response.
    return authorizedFrames.map(($) => ({ ...$, results: $[officeHourDoc] }));
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetOfficeHourByIdSessionError: Sync = ({ request, session, officeHourId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/OfficeHour/:officeHourId", session, officeHourId }, { request }],
    [Sessioning._getUser, { session }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetOfficeHourByIdNotFoundError: Sync = ({ request, session, user, officeHourId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/OfficeHour/:officeHourId", session, officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    let officeHourFrames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc: "any" });
    if (officeHourFrames.length > 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Office Hour with ID '${officeHourId}' not found.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

export const GetOfficeHourByIdUnauthorizedError: Sync = ({ request, session, user, officeHourId, officeHourDoc, classDoc, brontoBoardDoc, error }) => ({
  when: actions(
    [Requesting.request, { path: "/OfficeHour/:officeHourId", session, officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return [];

    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc });
    if (frames.length === 0) return [];

    const currentOfficeHourDoc = frames[0][officeHourDoc] as OfficeHourDocType;
    frames = await frames.query(BrontoBoard._getClassById, { class: currentOfficeHourDoc.classId }, { classDoc });
    if (frames.length === 0) return [];

    const currentClassDoc = frames[0][classDoc] as ClassDocType;
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentClassDoc.brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return [];

    const unauthorizedFrames = frames.filter(($) => $[user] !== ($[brontoBoardDoc] as BrontoBoardDocType).owner);
    if (unauthorizedFrames.length === 0) return [];

    return new Frames([{ [request]: originalRequestFrame[request], [error]: `Unauthorized access to Office Hour with ID '${officeHourId}'. User is not the owner of its BrontoBoard.` }]);
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
