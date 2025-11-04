---
timestamp: 'Mon Nov 03 2025 21:16:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_211657.4e6d95c9.md]]'
content_id: 0a0a14aa5b7bcd739c742b480d61da651a96e81f9db62b1cd6bb019e0fd44822
---

# response:

```typescript
// file: src/syncs/brontoboard_queries.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard as BrontoBoardConcept } from "@concepts"; // Alias BrontoBoard for clarity

// --------------------------------------------------------------------------------------------------------------------
// Generic Error Response Sync for Authorization/Precondition failures within `where` clauses
// This sync will catch any Requesting.request that has been explicitly populated with an `error` symbol
// by a `where` clause that short-circuited due to validation/auth failure.
// This is used for cases where the BrontoBoardConcept query action itself is not fired due to prior issues.
// --------------------------------------------------------------------------------------------------------------------
export const GenericAuthErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, {}, { request }], // Match any Requesting.request
    ),
    where: (frames) => {
        // Filter to only include frames that have an 'error' symbol bound.
        // This 'error' symbol is populated by `where` clauses when they create a new `Frames` object
        // to respond with an error.
        return frames.filter(f => f[error]);
    },
    then: actions(
        [Requesting.respond, { request, status: 403, error }], // Respond with 403 Forbidden and the error message
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getAssignmentsForClass
// Path: /api/brontoboard/assignmentsForClass
// Input: { class: ID }
// Output: AssignmentDoc[]
// Authorization Chain: session -> user -> classId -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetAssignmentsForClass: Sync = ({ request, session, class: classId, user, classDoc, brontoBoardDoc, assignments, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignmentsForClass", session, class: classId }, { request }],
    ),
    where: async (frames) => {
        // Store the original request frame details to construct error responses if authorization/preconditions fail
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user.
        // Sessioning._getUser returns { error: string } if session not found, or Array<{user: User}> if successful.
        // frames.query will bind 'sessionError' if the concept method returns an error object,
        // or bind 'user' if successful.
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });

        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]); // Filter out any frames that had session errors

        // 2. Retrieve the Class document.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassById, { class: classId }, { classDoc, error: queryError });
        if (processedFrames.some(f => f[queryError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[queryError])
                ? (processedFrames.find(f => f[queryError])![queryError] as string)
                : `Class with ID ${initialRequestFrame[classId]} not found.`;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Retrieve the BrontoBoard document that owns this class.
        // We assume `processedFrames[0][classDoc]` is safe here because previous filters ensure `processedFrames` is not empty.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: processedFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[queryError])
                ? (processedFrames.find(f => f[queryError])![queryError] as string)
                : `Associated BrontoBoard for Class ${initialRequestFrame[classId]} not found.`;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 4. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this class." });
        }

        // All authorization and existence checks pass. Now perform the actual query for assignments.
        // BrontoBoardConcept._getAssignmentsForClass returns AssignmentDoc[], so `assignments` will be bound to this array.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getAssignmentsForClass, { class: classId }, { assignments, error: queryError });

        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // If no assignments are found for the class (valid case for empty results), ensure an empty array is returned in the response.
        if (processedFrames.length === 0) {
             return new Frames({ [request]: initialRequestFrame[request], [assignments]: [] });
        }

        // Return the final frame(s) with results. For a single request, we expect one frame with the assignments array.
        return processedFrames;
    },
    then: actions(
        // Directly respond with the assignments array (or an error if bound in the `where` clause)
        [Requesting.respond, { request, results: assignments, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getOfficeHoursForClass
// Path: /api/brontoboard/officeHoursForClass
// Input: { class: ID }
// Output: OfficeHourDoc[]
// Authorization Chain: session -> user -> classId -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetOfficeHoursForClass: Sync = ({ request, session, class: classId, user, classDoc, brontoBoardDoc, officeHours, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officeHoursForClass", session, class: classId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the Class document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassById, { class: classId }, { classDoc, error: queryError });
        if (processedFrames.some(f => f[queryError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[queryError])
                ? (processedFrames.find(f => f[queryError])![queryError] as string)
                : `Class with ID ${initialRequestFrame[classId]} not found.` ;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Retrieve the BrontoBoard document that owns this class
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: processedFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[queryError])
                ? (processedFrames.find(f => f[queryError])![queryError] as string)
                : `Associated BrontoBoard for Class ${initialRequestFrame[classId]} not found.`;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 4. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this class." });
        }

        // Perform the actual query for office hours.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getOfficeHoursForClass, { class: classId }, { officeHours, error: queryError });

        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // If no office hours are found for the class (valid case for empty results), ensure an empty array is returned.
        if (processedFrames.length === 0) {
             return new Frames({ [request]: initialRequestFrame[request], [officeHours]: [] });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: officeHours, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getClassesForBrontoBoard
// Path: /api/brontoboard/classesForBrontoBoard
// Input: { brontoBoard: ID }
// Output: ClassDoc[]
// Authorization Chain: session -> user -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetClassesForBrontoBoard: Sync = ({ request, session, brontoBoard: brontoBoardId, user, brontoBoardDoc, classes, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/classesForBrontoBoard", session, brontoBoard: brontoBoardId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the BrontoBoard document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[queryError])
                ? (processedFrames.find(f => f[queryError])![queryError] as string)
                : `BrontoBoard with ID ${initialRequestFrame[brontoBoardId]} not found.`;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Filter to ensure the user obtained from the session is the owner of the BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this BrontoBoard." });
        }

        // Perform the actual query for classes.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { classes, error: queryError });

        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // If no classes are found (valid case for empty results), ensure an empty array is returned.
        if (processedFrames.length === 0) {
             return new Frames({ [request]: initialRequestFrame[request], [classes]: [] });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: classes, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getBrontoBoardsForUser
// Path: /api/brontoboard/myBrontoBoards
// Input: (Implicitly from session user)
// Output: BrontoBoardDoc[]
// Authorization: session -> user
// --------------------------------------------------------------------------------------------------------------------
export const GetBrontoBoardsForUser: Sync = ({ request, session, user, brontoBoards, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/myBrontoBoards", session }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // No further ownership chain required, as we are querying directly for boards owned by this user.
        // Perform the actual query.
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardsForUser, { user }, { brontoBoards, error: queryError });

        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // If no bronto boards are found (valid case for empty results), ensure an empty array is returned.
        if (processedFrames.length === 0) {
             return new Frames({ [request]: initialRequestFrame[request], [brontoBoards]: [] });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: brontoBoards, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getBrontoBoardById
// Path: /api/brontoboard/getBrontoBoard
// Input: { brontoBoard: ID }
// Output: BrontoBoardDoc[] (single item array or empty)
// Authorization Chain: session -> user -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetBrontoBoardById: Sync = ({ request, session, brontoBoard: brontoBoardId, user, brontoBoardDoc, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getBrontoBoard", session, brontoBoard: brontoBoardId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the BrontoBoard document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) { // Check for query errors explicitly
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) { // If no document found (valid empty result for ID lookup)
            return new Frames({ [request]: initialRequestFrame[request], [brontoBoardDoc]: [] });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Filter to ensure the user obtained from the session is the owner of the BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            // board is expected to be an array from _getBrontoBoardById, even if it's a single element.
            // So we need to access board[0] if we expect a single item.
            // Let's assume BrontoBoardConcept queries that return DocType[] (like _getBrontoBoardById)
            // will have their output variable (brontoBoardDoc) bound to the *array* of results.
            // So, $[brontoBoardDoc][0] is the actual document.
            return board && board.length > 0 && board[0].owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this BrontoBoard or BrontoBoard not found." });
        }

        // Return the single item in an array (it's already an array from the query, so just return it)
        return processedFrames;
    },
    then: actions(
        // The `brontoBoardDoc` symbol now contains an array `[BrontoBoardDoc]` or `[]`.
        [Requesting.respond, { request, results: brontoBoardDoc, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getClassById
// Path: /api/brontoboard/getClass
// Input: { class: ID }
// Output: ClassDoc[] (single item array or empty)
// Authorization Chain: session -> user -> classId -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetClassById: Sync = ({ request, session, class: classId, user, classDoc, brontoBoardDoc, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getClass", session, class: classId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the Class document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassById, { class: classId }, { classDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [classDoc]: [] });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Retrieve the BrontoBoard document that owns this class
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: processedFrames[0][classDoc][0].brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: `Associated BrontoBoard for Class ${initialRequestFrame[classId]} not found.` });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 4. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.length > 0 && board[0].owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this class or BrontoBoard not found." });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: classDoc, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getAssignmentById
// Path: /api/brontoboard/getAssignment
// Input: { assignment: ID }
// Output: AssignmentDoc[] (single item array or empty)
// Authorization Chain: session -> user -> assignmentId -> classId -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetAssignmentById: Sync = ({ request, session, assignment: assignmentId, user, assignmentDoc, classDoc, brontoBoardDoc, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getAssignment", session, assignment: assignmentId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the Assignment document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getAssignmentById, { assignment: assignmentId }, { assignmentDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [assignmentDoc]: [] });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Retrieve the Class document that owns this assignment
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassById, { class: processedFrames[0][assignmentDoc][0].classId }, { classDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: `Associated Class for Assignment ${initialRequestFrame[assignmentId]} not found.` });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 4. Retrieve the BrontoBoard document that owns this class
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: processedFrames[0][classDoc][0].brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: `Associated BrontoBoard for Class ${processedFrames[0][assignmentDoc][0].classId} not found.` });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 5. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.length > 0 && board[0].owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this assignment or BrontoBoard not found." });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: assignmentDoc, error }],
    ),
});


// --------------------------------------------------------------------------------------------------------------------
// Sync for BrontoBoard._getOfficeHourById
// Path: /api/brontoboard/getOfficeHour
// Input: { officeHour: ID }
// Output: OfficeHourDoc[] (single item array or empty)
// Authorization Chain: session -> user -> officeHourId -> classId -> brontoBoardId -> owner
// --------------------------------------------------------------------------------------------------------------------
export const GetOfficeHourById: Sync = ({ request, session, officeHour: officeHourId, user, officeHourDoc, classDoc, brontoBoardDoc, error, sessionError, queryError }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getOfficeHour", session, officeHour: officeHourId }, { request }],
    ),
    where: async (frames) => {
        const initialRequestFrame = frames[0];

        // 1. Verify session and get the associated user
        let processedFrames = await frames.query(Sessioning._getUser, { session }, { user, error: sessionError });
        if (processedFrames.some(f => f[sessionError]) || processedFrames.length === 0) {
            const errorMessage = processedFrames.some(f => f[sessionError])
                ? (processedFrames.find(f => f[sessionError])![sessionError] as string)
                : "Invalid session or user not found.";
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        processedFrames = processedFrames.filter(f => !f[sessionError]);

        // 2. Retrieve the OfficeHour document
        processedFrames = await processedFrames.query(BrontoBoardConcept._getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [officeHourDoc]: [] });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 3. Retrieve the Class document that owns this office hour
        processedFrames = await processedFrames.query(BrontoBoardConcept._getClassById, { class: processedFrames[0][officeHourDoc][0].classId }, { classDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: `Associated Class for Office Hour ${initialRequestFrame[officeHourId]} not found.` });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 4. Retrieve the BrontoBoard document that owns this class
        processedFrames = await processedFrames.query(BrontoBoardConcept._getBrontoBoardById, { brontoBoard: processedFrames[0][classDoc][0].brontoBoardId }, { brontoBoardDoc, error: queryError });
        if (processedFrames.some(f => f[queryError])) {
            const errorMessage = processedFrames.find(f => f[queryError])![queryError] as string;
            return new Frames({ [request]: initialRequestFrame[request], [error]: errorMessage });
        }
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: `Associated BrontoBoard for Class ${processedFrames[0][officeHourDoc][0].classId} not found.` });
        }
        processedFrames = processedFrames.filter(f => !f[queryError]);

        // 5. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
        processedFrames = processedFrames.filter(($) => {
            const board = $[brontoBoardDoc];
            return board && board.length > 0 && board[0].owner === $[user];
        });
        if (processedFrames.length === 0) {
            return new Frames({ [request]: initialRequestFrame[request], [error]: "Authorization failed: User is not the owner of this office hour or BrontoBoard not found." });
        }

        return processedFrames;
    },
    then: actions(
        [Requesting.respond, { request, results: officeHourDoc, error }],
    ),
});
```
