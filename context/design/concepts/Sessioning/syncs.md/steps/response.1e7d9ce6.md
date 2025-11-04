---
timestamp: 'Mon Nov 03 2025 22:25:29 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_222529.56907477.md]]'
content_id: 1e7d9ce622c2296f71a68e0d60c806286c426e82575d930dedf1ad8eda2eafe8
---

# response:

Here are the synchronizations for the BrontoBoard concept's getter functions (`_getClassById`, `_getAssignmentById`, `_getOfficeHourById`, `_getClassesForBrontoBoard`), implemented according to your specifications in a single file. This includes the request handling, successful response, and error response for each.

The `where` clauses meticulously follow the authorization chain:

1. Get `user` from `session` using `Sessioning._getUser`.
2. Retrieve the target document (Class, Assignment, or OfficeHour) or BrontoBoard.
3. For nested resources (Class, Assignment, OfficeHour), progressively retrieve parent documents (Class from Assignment/OfficeHour, BrontoBoard from Class) by extracting their IDs into new frame variables using `frames.map`.
4. Finally, filter the frames to ensure the `user` (from session) is the `owner` of the ultimate `BrontoBoard` document.

Each step includes an `if (frames.length === 0) return frames;` check for early termination if any part of the query or authorization fails, preventing further processing or unexpected errors.

```typescript
// src/syncs/brontoboard_getters.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Query for _getClassById ---

/**
 * Sync 1.1: Handles the request to get a specific Class by its ID.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the requested Class.
 */
export const GetClassByIdRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request payload
  classId,        // The ID of the class to retrieve
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  class: classOutput, // Output variable for the BrontoBoard query, aliased to avoid conflict with classId
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the Class document
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 3. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 5. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard._getClassById, { class: classId }, { class: classOutput }],
  ),
});

/**
 * Sync 1.2: Handles responding to the client with the successfully retrieved Class.
 */
export const GetClassByIdResponse: Sync = ({ request, class: classOutput }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass" }, { request }],
    [BrontoBoard._getClassById, {}, { class: classOutput }],
  ),
  then: actions(
    [Requesting.respond, { request, results: classOutput }],
  ),
});

/**
 * Sync 1.3: Handles responding to the client with an error if the _getClassById query failed.
 */
export const GetClassByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass" }, { request }],
    [BrontoBoard._getClassById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getAssignmentById ---

/**
 * Sync 2.1: Handles the request to get a specific Assignment by its ID.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the Assignment's Class.
 */
export const GetAssignmentByIdRequest: Sync = ({
  request,           // The ID of the incoming request
  session,           // The session ID from the request payload
  assignmentId,      // The ID of the assignment to retrieve
  user,              // Variable to bind the user ID from the session
  assignmentDoc,     // Variable to bind the Assignment document
  classId,           // Intermediate variable to bind the Class ID from assignmentDoc
  classDoc,          // Variable to bind the Class document
  brontoBoardId,     // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc,    // Variable to bind the BrontoBoard document
  assignment,        // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment", session, assignment: assignmentId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the Assignment document
    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignmentDoc });
    if (frames.length === 0) return frames; // Assignment not found

    // 3. Extract classId from assignmentDoc and bind it
    frames = frames.map(($) => ({ ...$, [classId]: ($[assignmentDoc] as { classId: ID }).classId }));

    // 4. Get the Class document
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 5. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 6. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 7. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignment }],
  ),
});

/**
 * Sync 2.2: Handles responding to the client with the successfully retrieved Assignment.
 */
export const GetAssignmentByIdResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment" }, { request }],
    [BrontoBoard._getAssignmentById, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, results: assignment }],
  ),
});

/**
 * Sync 2.3: Handles responding to the client with an error if the _getAssignmentById query failed.
 */
export const GetAssignmentByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment" }, { request }],
    [BrontoBoard._getAssignmentById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getOfficeHourById ---

/**
 * Sync 3.1: Handles the request to get specific Office Hours by ID.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the OfficeHour's Class.
 */
export const GetOfficeHourByIdRequest: Sync = ({
  request,           // The ID of the incoming request
  session,           // The session ID from the request payload
  officeHourId,      // The ID of the office hour to retrieve
  user,              // Variable to bind the user ID from the session
  officeHourDoc,     // Variable to bind the OfficeHour document
  classId,           // Intermediate variable to bind the Class ID from officeHourDoc
  classDoc,          // Variable to bind the Class document
  brontoBoardId,     // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc,    // Variable to bind the BrontoBoard document
  officeHour,        // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour", session, officeHour: officeHourId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the OfficeHour document
    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc });
    if (frames.length === 0) return frames; // OfficeHour not found

    // 3. Extract classId from officeHourDoc and bind it
    frames = frames.map(($) => ({ ...$, [classId]: ($[officeHourDoc] as { classId: ID }).classId }));

    // 4. Get the Class document
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 5. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 6. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 7. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHour }],
  ),
});

/**
 * Sync 3.2: Handles responding to the client with the successfully retrieved OfficeHour.
 */
export const GetOfficeHourByIdResponse: Sync = ({ request, officeHour }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour" }, { request }],
    [BrontoBoard._getOfficeHourById, {}, { officeHour }],
  ),
  then: actions(
    [Requesting.respond, { request, results: officeHour }],
  ),
});

/**
 * Sync 3.3: Handles responding to the client with an error if the _getOfficeHourById query failed.
 */
export const GetOfficeHourByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour" }, { request }],
    [BrontoBoard._getOfficeHourById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getClassesForBrontoBoard ---

/**
 * Sync 4.1: Handles the request to get all Classes for a specific BrontoBoard.
 * Performs authorization: verifies session, gets user, then ensures
 * user owns the requested BrontoBoard.
 */
export const GetClassesForBrontoBoardRequest: Sync = ({
  request,         // The ID of the incoming request
  session,         // The session ID from the request payload
  brontoBoardId,   // The ID of the BrontoBoard to retrieve classes from
  user,            // Variable to bind the user ID from the session
  brontoBoardDoc,  // Variable to bind the BrontoBoard document
  classes,         // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 3. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { classes }],
  ),
});

/**
 * Sync 4.2: Handles responding to the client with the successfully retrieved Classes.
 */
export const GetClassesForBrontoBoardResponse: Sync = ({ request, classes }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses" }, { request }],
    [BrontoBoard._getClassesForBrontoBoard, {}, { classes }],
  ),
  then: actions(
    // The `collectAs` helper would typically be used here if `classes` needed
    // to be wrapped in an object property for the response.
    // Assuming `classes` is already an array of the desired format.
    [Requesting.respond, { request, results: classes }],
  ),
});

/**
 * Sync 4.3: Handles responding to the client with an error if the _getClassesForBrontoBoard query failed.
 */
export const GetClassesForBrontoBoardErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses" }, { request }],
    [BrontoBoard._getClassesForBrontoBoard, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getAssignmentsForClass (already provided in the prompt, including for completeness) ---

/**
 * Sync 5.1: Handles the request to get all Assignments for a specific Class.
 * This sync was provided as an example and is included for completeness and context.
 */
export const GetAssignmentsForClassRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request
  classId,        // The ID of the class from the request
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  assignments,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // Each frame starts with bindings from Requesting.request (e.g., { [request]: 'req1', [session]: 's1', [classId]: 'c1' })

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Retrieve the Class document by its ID.
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames;

    // 3. Explicitly extract the 'brontoBoardId' from the 'classDoc' object and bind it as a top-level variable in each frame.
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Retrieve the BrontoBoard document by its ID.
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames;

    // 5. Final authorization step: Filter the frames to ensure the user (from session) is the owner of the BrontoBoard.
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard._getAssignmentsForClass, { class: classId }, { assignments }],
  ),
});

/**
 * Sync 5.2: Handles responding to the client with the successfully retrieved assignments.
 */
export const GetAssignmentsForClassResponse: Sync = ({ request, assignments }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass" }, { request }],
    [BrontoBoard._getAssignmentsForClass, {}, { assignments }],
  ),
  then: actions(
    [Requesting.respond, { request, results: assignments }],
  ),
});

/**
 * Sync 5.3: Handles responding to the client with an error if the BrontoBoard query failed.
 */
export const GetAssignmentsForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass" }, { request }],
    [BrontoBoard._getAssignmentsForClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getOfficeHoursForClass (adding this as well, similar to assignments) ---

/**
 * Sync 6.1: Handles the request to get all Office Hours for a specific Class.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the requested Class.
 */
export const GetOfficeHoursForClassRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request
  classId,        // The ID of the class from the request
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  officeHours,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Retrieve the Class document by its ID.
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames;

    // 3. Explicitly extract the 'brontoBoardId' from the 'classDoc' object and bind it as a top-level variable in each frame.
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Retrieve the BrontoBoard document by its ID.
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames;

    // 5. Final authorization step: Filter the frames to ensure the user (from session) is the owner of the BrontoBoard.
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHours }],
  ),
});

/**
 * Sync 6.2: Handles responding to the client with the successfully retrieved office hours.
 */
export const GetOfficeHoursForClassResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass" }, { request }],
    [BrontoBoard._getOfficeHoursForClass, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, results: officeHours }],
  ),
});

/**
 * Sync 6.3: Handles responding to the client with an error if the BrontoBoard query failed.
 */
export const GetOfficeHoursForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass" }, { request }],
    [BrontoBoard._getOfficeHoursForClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getBrontoBoardsForUser (this one is authorized differently) ---

/**
 * Sync 7.1: Handles the request to get all BrontoBoards for the authenticated user.
 * Authorization only needs to verify the session to get the user.
 */
export const GetBrontoBoardsForUserRequest: Sync = ({
  request,         // The ID of the incoming request
  session,         // The session ID from the request payload
  user,            // Variable to bind the user ID from the session
  brontoBoards,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser", session }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found
    return frames; // No further authorization needed for this specific query
  },
  then: actions(
    // If session is valid, call the BrontoBoard query
    [BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoards }],
  ),
});

/**
 * Sync 7.2: Handles responding to the client with the successfully retrieved BrontoBoards.
 */
export const GetBrontoBoardsForUserResponse: Sync = ({ request, brontoBoards }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser" }, { request }],
    [BrontoBoard._getBrontoBoardsForUser, {}, { brontoBoards }],
  ),
  then: actions(
    [Requesting.respond, { request, results: brontoBoards }],
  ),
});

/**
 * Sync 7.3: Handles responding to the client with an error if the _getBrontoBoardsForUser query failed.
 */
export const GetBrontoBoardsForUserErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser" }, { request }],
    [BrontoBoard._getBrontoBoardsForUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

```
