---
timestamp: 'Mon Nov 03 2025 21:48:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_214801.49dc98d9.md]]'
content_id: 9471f1f5de0dab31941d6e659cc6921dfc223f26aafe0d1442b9b261071b1905
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
      // The path and parameter extraction will be handled by the engine.
      // We list `classId` as an input parameter for pattern matching.
      { path: `/api/brontoboard/class/${classId}/assignments`, session, classId: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    // Capture the initial request parameters for potential error responses
    const initialParams = frames[0];

    // Step 1: Verify session and get user. Create a new Frames instance for auth to ensure `request` is preserved.
    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );

    if (processedFrames.length === 0) {
      // If session is invalid or user not found, return an unauthorized error frame
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }

    const currentUser = processedFrames[0][user]; // The authenticated user ID

    // Step 2: Retrieve Class document based on the `classId` from the request
    processedFrames = await processedFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] },
      { classDoc },
    );

    if (processedFrames.length === 0) {
      // If class not found, return an error frame
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }

    const currentClassDoc = processedFrames[0][classDoc]; // The found Class document

    // Step 3: Trace up ownership chain (Class -> BrontoBoard) to find the parent BrontoBoard
    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );

    if (processedFrames.length === 0) {
      // This should ideally not happen if a class exists with a valid brontoBoardId
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }

    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc]; // The found BrontoBoard document

    // Step 4: Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this class's BrontoBoard." }]);
    }

    // If authorization passed, proceed to query for assignments for the class
    processedFrames = await processedFrames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: initialParams[classId] },
      { assignments },
    );

    // Collect the 'assignments' from `processedFrames` into a `results` array binding.
    // `collectAs` ensures consistent output structure, even if `assignments` is empty.
    const collectedResultFrame = (await new Frames(processedFrames).collectAs([assignments], results))[0];

    // Return a new frame combining initial parameters with the collected results (or empty array)
    // and explicitly remove any `error` binding if the operation was successful.
    return new Frames([{ ...initialParams, ...collectedResultFrame, error: undefined }]);
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
      { path: `/api/brontoboard/class/${classId}/officehours`, session, classId: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] },
      { classDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }
    const currentClassDoc = processedFrames[0][classDoc];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this class's BrontoBoard." }]);
    }

    processedFrames = await processedFrames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: initialParams[classId] },
      { officeHours },
    );

    const collectedResultFrame = (await new Frames(processedFrames).collectAs([officeHours], results))[0];

    return new Frames([{ ...initialParams, ...collectedResultFrame, error: undefined }]);
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
      { path: `/api/brontoboard/${brontoBoardId}/classes`, session, brontoBoardId: brontoBoardId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: initialParams[brontoBoardId] },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `BrontoBoard with ID ${initialParams[brontoBoardId]} not found.` }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this BrontoBoard." }]);
    }

    processedFrames = await processedFrames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: initialParams[brontoBoardId] },
      { classes },
    );

    const collectedResultFrame = (await new Frames(processedFrames).collectAs([classes], results))[0];

    return new Frames([{ ...initialParams, ...collectedResultFrame, error: undefined }]);
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

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    // For _getBrontoBoardsForUser, the query itself filters by the user.
    // No further ownership check is needed here beyond having an authenticated user.
    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user: currentUser },
      { brontoBoards },
    );

    const collectedResultFrame = (await new Frames(processedFrames).collectAs([brontoBoards], results))[0];

    return new Frames([{ ...initialParams, ...collectedResultFrame, error: undefined }]);
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
      { path: `/api/brontoboard/${brontoBoardId}`, session, brontoBoardId: brontoBoardId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: initialParams[brontoBoardId] },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `BrontoBoard with ID ${initialParams[brontoBoardId]} not found.` }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

    if (currentBrontoBoardDoc.owner !== currentUser) {
      return new Frames([{ ...initialParams, error: "Unauthorized: You do not own this BrontoBoard." }]);
    }

    // _getBrontoBoardById returns an array, but we expect only one result.
    // Format it as an array for the `results` binding.
    const resultsArray = currentBrontoBoardDoc ? [currentBrontoBoardDoc] : [];
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
      { path: `/api/brontoboard/class/${classId}`, session, classId: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getClassById,
      { class: initialParams[classId] },
      { classDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Class with ID ${initialParams[classId]} not found.` }]);
    }
    const currentClassDoc = processedFrames[0][classDoc];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

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
      { path: `/api/brontoboard/assignment/${assignmentId}`, session, assignmentId: assignmentId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getAssignmentById,
      { assignment: initialParams[assignmentId] },
      { assignmentDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Assignment with ID ${initialParams[assignmentId]} not found.` }]);
    }
    const currentAssignmentDoc = processedFrames[0][assignmentDoc];

    // Get parent Class document for the assignment
    processedFrames = await processedFrames.query(
      BrontoBoard._getClassById,
      { class: currentAssignmentDoc.classId },
      { classDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated Class not found for assignment." }]);
    }
    const currentClassDoc = processedFrames[0][classDoc];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

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
      { path: `/api/brontoboard/officehour/${officeHourId}`, session, officeHourId: officeHourId },
      { request },
    ],
  ),
  where: async (frames) => {
    const initialParams = frames[0];

    let processedFrames = await new Frames([initialParams]).query(
      Sessioning._getUser,
      { session: initialParams[session] },
      { user },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Authentication required." }]);
    }
    const currentUser = processedFrames[0][user];

    processedFrames = await processedFrames.query(
      BrontoBoard._getOfficeHourById,
      { officeHour: initialParams[officeHourId] },
      { officeHourDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: `Office hour with ID ${initialParams[officeHourId]} not found.` }]);
    }
    const currentOfficeHourDoc = processedFrames[0][officeHourDoc];

    processedFrames = await processedFrames.query(
      BrontoBoard._getClassById,
      { class: currentOfficeHourDoc.classId },
      { classDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated Class not found for office hour." }]);
    }
    const currentClassDoc = processedFrames[0][classDoc];

    processedFrames = await processedFrames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: currentClassDoc.brontoBoardId },
      { brontoBoardDoc },
    );
    if (processedFrames.length === 0) {
      return new Frames([{ ...initialParams, error: "Associated BrontoBoard not found for class." }]);
    }
    const currentBrontoBoardDoc = processedFrames[0][brontoBoardDoc];

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
