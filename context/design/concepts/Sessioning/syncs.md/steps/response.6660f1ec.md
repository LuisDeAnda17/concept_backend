---
timestamp: 'Mon Nov 03 2025 22:02:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_220226.c903fae2.md]]'
content_id: 6660f1ece5a2193eb1dc43a37f6252adf1f39cd0d2f0f7d226735d720ad36370
---

# response:

```typescript
// src/syncs/brontoboard_getters.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

// Re-declare types for clarity in this sync file, mirroring BrontoBoardConcept's internal types
type User = ID;
type Session = ID;
type BrontoBoardID = ID;
type ClassID = ID;
type AssignmentID = ID;
type OfficeHourID = ID;

// Note: The structure here consolidates the request, authorization, query execution,
// and response into a single synchronization for each getter.
// This pattern aligns with the "Zero Matches" example, where the `where` clause
// is responsible for enriching the frame with either successful `results` or an `error`
// binding, which the `then` clause then uses to respond via `Requesting.respond`.

// =====================================================================================================================
// 1. Sync for _getAssignmentsForClass
// GET /api/brontoboard/class/:classId/assignments
// =====================================================================================================================
export const GetAssignmentsForClassRequest: Sync = (
  { request, session, classId, user, classDoc, brontoBoardDoc, assignments, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      // The path parameter `:classId` is automatically bound to `classId` here.
      { path: `/api/brontoboard/class/${classId}/assignments`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    // Capture the initial request parameters for potential error responses and to ensure 'request' is propagated.
    const initialParams = frames[0];

    // --- Authorization Chain ---
    // Step 1: Verify session and get user.
    // Start with a new Frames instance to ensure the `request` and other initial bindings are always carried forward,
    // especially if subsequent queries yield no matches.
    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] }, // Pass the session from the initial request
      { user }, // Bind the output user to the `user` variable
    );

    if (currentFrames.length === 0) {
      // If session is invalid or user not found, return an unauthorized error frame
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user]; // The authenticated user ID

    // Step 2: Retrieve Class document based on the `classId` from the request
    currentFrames = await currentFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] }, // Use the classId from the initial request
      { classDoc }, // Bind the output class document to `classDoc`
    );

    if (currentFrames.length === 0) {
      // If class not found, return an error frame
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }
    const currentClassDoc = currentFrames[0][classDoc]; // The found Class document

    // Step 3: Trace up ownership chain (Class -> BrontoBoard) to find the parent BrontoBoard
    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId }, // Use brontoBoardId from the class document
      { brontoBoardDoc }, // Bind the output brontoBoard document to `brontoBoardDoc`
    );

    if (currentFrames.length === 0) {
      // This should ideally not happen if a class exists with a valid brontoBoardId
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc]; // The found BrontoBoard document

    // Step 4: Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this class's BrontoBoard." }]);
    }
    // --- End Authorization Chain ---

    // If authorization passed, proceed to query for assignments for the class
    currentFrames = await currentFrames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: initialParams[classId] }, // Use the classId from the initial request
      { assignments }, // Bind the output assignments to `assignments`
    );

    // `collectAs` ensures consistent output structure, even if `assignments` is empty.
    // It groups results by non-collected variables (which at this point should mainly be `request` and `initialParams`),
    // and puts the collected values into the `results` binding.
    const finalFrames = await currentFrames.collectAs([assignments], results);

    // The output for Requesting.respond needs to be a single frame containing `request` and either `results` or `error`.
    // If the `finalFrames` array is empty (e.g., if collectAs didn't find anything to group, though it should always produce at least one frame if input frames were not empty),
    // or if `results` is implicitly undefined due to no assignments, we ensure a valid structure.
    const resultFrame = finalFrames.length > 0 ? finalFrames[0] : { ...initialParams, [results]: [] };

    // Return a new frame combining initial parameters with the collected results
    // and explicitly remove any `error` binding if the operation was successful.
    return new Frames([{ ...initialParams, ...resultFrame, error: undefined }]);
  },
  then: actions(
    // Requesting.respond will use the `request`, `results`, or `error` bindings from the `where` clause.
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 2. Sync for _getOfficeHoursForClass
// GET /api/brontoboard/class/:classId/officehours
// =====================================================================================================================
export const GetOfficeHoursForClassRequest: Sync = (
  { request, session, classId, user, classDoc, brontoBoardDoc, officeHours, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/class/${classId}/officehours`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] },
      { classDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }
    const currentClassDoc = currentFrames[0][classDoc];

    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this class's BrontoBoard." }]);
    }

    currentFrames = await currentFrames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: initialParams[classId] },
      { officeHours },
    );

    const finalFrames = await currentFrames.collectAs([officeHours], results);
    const resultFrame = finalFrames.length > 0 ? finalFrames[0] : { ...initialParams, [results]: [] };

    return new Frames([{ ...initialParams, ...resultFrame, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 3. Sync for _getClassesForBrontoBoard
// GET /api/brontoboard/:brontoBoardId/classes
// =====================================================================================================================
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, brontoBoardId, user, brontoBoardDoc, classes, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/${brontoBoardId}/classes`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: initialParams[brontoBoardId] },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `BrontoBoard with ID ${initialParams[brontoBoardId]} not found.` }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this BrontoBoard." }]);
    }

    currentFrames = await currentFrames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: initialParams[brontoBoardId] },
      { classes },
    );

    const finalFrames = await currentFrames.collectAs([classes], results);
    const resultFrame = finalFrames.length > 0 ? finalFrames[0] : { ...initialParams, [results]: [] };

    return new Frames([{ ...initialParams, ...resultFrame, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 4. Sync for _getBrontoBoardsForUser
// GET /api/brontoboard/my
// =====================================================================================================================
export const GetMyBrontoBoardsRequest: Sync = (
  { request, session, user, brontoBoards, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/my`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    // For _getBrontoBoardsForUser, the query itself filters by the user.
    // No further ownership check is needed here beyond having an authenticated user.
    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user: currentUser },
      { brontoBoards },
    );

    const finalFrames = await currentFrames.collectAs([brontoBoards], results);
    const resultFrame = finalFrames.length > 0 ? finalFrames[0] : { ...initialParams, [results]: [] };

    return new Frames([{ ...initialParams, ...resultFrame, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 5. Sync for _getBrontoBoardById
// GET /api/brontoboard/:brontoBoardId
// =====================================================================================================================
export const GetBrontoBoardByIdRequest: Sync = (
  { request, session, brontoBoardId, user, brontoBoardDoc, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/${brontoBoardId}`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: initialParams[brontoBoardId] },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `BrontoBoard with ID ${initialParams[brontoBoardId]} not found.` }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this BrontoBoard." }]);
    }

    // _getBrontoBoardById returns an array, but we expect only one result.
    // Format it as an array for the `results` binding.
    const resultsArray = currentBrontoBoardDoc ? [currentBrontoBoardDoc] : [];
    // Direct assignment to results, no collectAs needed if it's already an array or single item.
    return new Frames([{ ...initialParams, results: resultsArray, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 6. Sync for _getClassById
// GET /api/brontoboard/class/:classId
// =====================================================================================================================
export const GetClassByIdRequest: Sync = (
  { request, session, classId, user, classDoc, brontoBoardDoc, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/class/${classId}`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] },
      { classDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }
    const currentClassDoc = currentFrames[0][classDoc];

    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this class's BrontoBoard." }]);
    }

    // _getClassById returns an array, but we expect only one result.
    // Format it as an array for the `results` binding.
    const resultsArray = currentClassDoc ? [currentClassDoc] : [];
    return new Frames([{ ...initialParams, results: resultsArray, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 7. Sync for _getAssignmentById
// GET /api/brontoboard/assignment/:assignmentId
// =====================================================================================================================
export const GetAssignmentByIdRequest: Sync = (
  { request, session, assignmentId, user, assignmentDoc, classDoc, brontoBoardDoc, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/assignment/${assignmentId}`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getAssignmentById,
      { assignment: initialParams[assignmentId] },
      { assignmentDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Assignment with ID ${initialParams[assignmentId]} not found.` }]);
    }
    const currentAssignmentDoc = currentFrames[0][assignmentDoc];

    // Get parent Class document for the assignment
    currentFrames = await currentFrames.query(
      BrontoBoard._getClassById,
      { class: currentAssignmentDoc.classId },
      { classDoc },
    );
    if (currentFrames.length === 0) {
      // This case should ideally be caught by _getClassById returning error,
      // but if the assignment's classId is invalid, it's good to have.
      return new Frames([{ ...initialParams, error: "Associated Class not found for assignment." }]);
    }
    const currentClassDoc = currentFrames[0][classDoc];

    // Get parent BrontoBoard document for the class
    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this assignment's BrontoBoard." }]);
    }

    // _getAssignmentById returns an array, but we expect only one result.
    // Format it as an array for the `results` binding.
    const resultsArray = currentAssignmentDoc ? [currentAssignmentDoc] : [];
    return new Frames([{ ...initialParams, results: resultsArray, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});

// =====================================================================================================================
// 8. Sync for _getOfficeHourById
// GET /api/brontoboard/officehour/:officeHourId
// =====================================================================================================================
export const GetOfficeHourByIdRequest: Sync = (
  { request, session, officeHourId, user, officeHourDoc, classDoc, brontoBoardDoc, results, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: `/api/brontoboard/officehour/${officeHourId}`, session },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let currentFrames = new Frames([initialParams]);
    currentFrames = await currentFrames.query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = currentFrames[0][user];

    currentFrames = await currentFrames.query(
      BrontoBoard._getOfficeHourById,
      { officeHour: initialParams[officeHourId] },
      { officeHourDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Office hour with ID ${initialParams[officeHourId]} not found.` }]);
    }
    const currentOfficeHourDoc = currentFrames[0][officeHourDoc];

    // Get parent Class document for the office hour
    currentFrames = await currentFrames.query(
      BrontoBoard._getClassById,
      { class: currentOfficeHourDoc.classId },
      { classDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated Class not found for office hour." }]);
    }
    const currentClassDoc = currentFrames[0][classDoc];

    // Get parent BrontoBoard document for the class
    currentFrames = await currentFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (currentFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = currentFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this office hour's BrontoBoard." }]);
    }

    // _getOfficeHourById returns an array, but we expect only one result.
    // Format it as an array for the `results` binding.
    const resultsArray = currentOfficeHourDoc ? [currentOfficeHourDoc] : [];
    return new Frames([{ ...initialParams, results: resultsArray, error: undefined }]);
  },
  then: actions(
    [Requesting.respond, { request, results, error }],
  ),
});
```
