---
timestamp: 'Mon Nov 03 2025 22:04:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_220442.beee101b.md]]'
content_id: 5aa89edfba54925d01ca35baf156f0cd545574b0e5598aeabb63fda68826aa10
---

# response:

```typescript
// src/syncs/brontoboard_assignments.sync.ts

// These two help you declare synchronizations
import { actions, Frames, Sync } from "@engine";
// Choose whatever concepts you have
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID, Empty } from "@utils/types.ts"; // Assuming ID is available

// Define local types for readability, matching the concept's ID types
type User = ID;
type Session = ID;
type ClassId = ID; // Using ClassId to avoid conflict with JS reserved word 'class'

/**
 * --- Sync 1: Trigger BrontoBoard._getAssignmentsForClass on request ---
 *
 * This synchronization handles an incoming HTTP request to list assignments for a specific class.
 * It performs a multi-step authorization check:
 * 1. Validates the session and retrieves the associated user.
 * 2. Retrieves the class document to find its associated BrontoBoard.
 * 3. Retrieves the BrontoBoard document to identify its owner.
 * 4. Ensures the user from the session is the owner of the BrontoBoard.
 * If all authorization checks pass, it then triggers the `BrontoBoard._getAssignmentsForClass` query.
 *
 * Requirements from prompt:
 * - No helper function for authorization.
 * - Do NOT use an initial frame (`const originalFrame = frames[0]`).
 * - Initial `where` form: `frames = await frames.query(Sessioning._getUser, { session }, { user }); return frames;`
 */
export const GetAssignmentsRequest: Sync = (
  { request, session, class: classId, user, classDoc, brontoBoardDoc },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignments/list", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get the associated user.
    // As per prompt's initial query form:
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // If no user found for the session, the request is unauthorized.
    // Return empty frames to prevent triggering the `then` clause.
    if (frames.length === 0) {
      // console.warn("GetAssignmentsRequest: No user found for session. Unauthorized request.");
      return new Frames();
    }

    // 2. Retrieve the relevant Class document using BrontoBoard._getClassById.
    // This assumes BrontoBoardConcept has a query `_getClassById(class: ID): (classDoc: ClassDoc)`.
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { classDoc });

    // If the class is not found, the request is invalid for this specific class.
    if (frames.length === 0) {
      // console.warn(`GetAssignmentsRequest: Class with ID ${classId} not found.`);
      return new Frames();
    }

    // 3. Trace up the ownership chain (Class -> BrontoBoard).
    // For each frame (which currently contains request, session, classId, user, and classDoc),
    // get the `brontoBoardId` from `classDoc` and query for the `BrontoBoardDoc`.
    const framesAfterBrontoBoardQuery = [];
    for (const frame of frames) {
      const currentClassDoc = frame[classDoc]; // This will be the full ClassDoc object
      if (!currentClassDoc || !currentClassDoc.brontoBoardId) {
        console.error(
          "GetAssignmentsRequest: Missing class document or brontoBoardId in frame.",
          frame,
        );
        continue;
      }
      // Query for the BrontoBoardDoc using the brontoBoardId from the classDoc
      const brontoBoardQueryResults = await new Frames(frame).query(
        BrontoBoard._getBrontoBoardById,
        { brontoBoard: currentClassDoc.brontoBoardId },
        { brontoBoardDoc }, // Bind the BrontoBoard document to `brontoBoardDoc`
      );
      if (brontoBoardQueryResults.length > 0) {
        framesAfterBrontoBoardQuery.push(...brontoBoardQueryResults.toArray());
      }
    }
    frames = new Frames(...framesAfterBrontoBoardQuery);

    // If no BrontoBoard found associated with the class, this implies a data inconsistency
    // or an invalid `brontoBoardId`, effectively making the request unauthorized/invalid.
    if (frames.length === 0) {
      // console.warn(
      //   `GetAssignmentsRequest: No BrontoBoard found for class ID ${classId}'s associated brontoBoardId.`,
      // );
      return new Frames();
    }

    // 4. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
    const authorizedFrames = frames.filter(($) => {
      const sessionUser = $[user]; // User ID obtained from the session
      const ownerOfBrontoBoard = $[brontoBoardDoc]?.owner; // Owner ID from the BrontoBoard document
      const isAuthorized = sessionUser === ownerOfBrontoBoard;
      if (!isAuthorized) {
        // console.warn(
        //   `GetAssignmentsRequest: User ${sessionUser} is not owner of BrontoBoard ${$[brontoBoardDoc]?._id}. Unauthorized.`,
        // );
      }
      return isAuthorized;
    });

    return authorizedFrames; // Only authorized frames proceed to the `then` clause
  },
  then: actions(
    // If authorization passes and frames are not empty, trigger the BrontoBoard query.
    // We assume the BrontoBoard concept's _getAssignmentsForClass query is specified
    // to return an array of assignments, which is bound to the 'assignments' output parameter.
    // This entire array is then captured by the local variable `assignmentResults`.
    [BrontoBoard._getAssignmentsForClass, { class: classId }, { assignments: "assignmentResults" }],
  ),
});

/**
 * --- Sync 2: Respond to successful _getAssignmentsForClass query ---
 *
 * This synchronization listens for the successful completion of the
 * `BrontoBoard._getAssignmentsForClass` query and responds to the
 * original `Requesting.request` with the retrieved assignments.
 */
export const GetAssignmentsResponse: Sync = (
  { request, assignmentResults }, // 'assignmentResults' will hold the array of AssignmentDoc
) => ({
  when: actions(
    // Matches the original request to get context (like the 'request' variable)
    [Requesting.request, { path: "/brontoboard/assignments/list" }, { request }],
    // Matches the successful completion of the BrontoBoard._getAssignmentsForClass query.
    // Assumes the query returns an object with an 'assignments' key containing the array.
    [BrontoBoard._getAssignmentsForClass, {}, { assignments: assignmentResults }],
  ),
  then: actions(
    // Respond to the original request with the collected assignment results.
    // The response body will contain a key 'results' with the array of assignments.
    [Requesting.respond, { request, results: assignmentResults }],
  ),
});

/**
 * --- Sync 3: Respond to error from _getAssignmentsForClass query ---
 *
 * This synchronization listens for an error returned by the
 * `BrontoBoard._getAssignmentsForClass` query and responds to the
 * original `Requesting.request` with the error message.
 */
export const GetAssignmentsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    // Matches the original request to get context (like the 'request' variable)
    [Requesting.request, { path: "/brontoboard/assignments/list" }, { request }],
    // Matches an error returned by the BrontoBoard._getAssignmentsForClass query.
    // The query returns an object with an 'error' key containing the error message.
    [BrontoBoard._getAssignmentsForClass, {}, { error }],
  ),
  then: actions(
    // Respond to the original request with the error.
    [Requesting.respond, { request, error }],
  ),
});
```
