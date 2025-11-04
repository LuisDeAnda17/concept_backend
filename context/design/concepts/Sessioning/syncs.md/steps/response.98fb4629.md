---
timestamp: 'Mon Nov 03 2025 20:17:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_201752.4f3c5ed8.md]]'
content_id: 98fb462968415df7baca44b0259e6b01682cbf0dc2a63d766067e15e42d8bfa3
---

# response:

```typescript
// file: src/syncs/brontoboard.sync.ts

// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import {
  Requesting,
  Sessioning,
  BrontoBoard,
} from "@concepts";
// Utility type for IDs
import { ID } from "@utils/types.ts";

// --- Type Definitions for Variables in Syncs ---
// These help TypeScript understand the variables we destructure in the sync functions.
type User = ID;
type Calendar = ID;
type Session = ID;
type BrontoBoardId = ID;
type ClassId = ID;
type AssignmentId = ID;
type OfficeHourId = ID;
type RequestId = ID; // For the request ID returned by Requesting.request

// --- General Helper for Where Clause: Get User from Session ---
// This function encapsulates the common pattern of retrieving a user from a session
// and ensures the original frame is passed through if successful.
// It also handles the case where the session might not exist, preventing further query errors.
const getUserFromSession = async (
  frames: Frames,
  sessionVar: symbol,
  userVar: symbol,
) => {
  if (frames.length === 0) {
    return frames; // If no frames, nothing to do.
  }
  // This query will either return frames with 'user' bound, or an empty Frames if session not found.
  return await frames.query(Sessioning._getUser, { session: sessionVar }, {
    user: userVar,
  });
};

// ============================================================================
// 1. Synchronizations for BrontoBoard.initializeBB
//    Request path: POST /brontoboard/initialize
//    Inputs: session, calendar
//    Output: brontoBoard
// ============================================================================

/**
 * Sync: InitializeBrontoBoardRequest
 * When an HTTP request (POST /brontoboard/initialize) is received to initialize a BrontoBoard,
 * first authenticate the user via their session, then trigger the BrontoBoard.initializeBB action.
 */
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, user, calendar, brontoBoard }, // Destructure variables for use in patterns
) => ({
  when: actions([
    Requesting.request, // Matches an incoming HTTP request
    { path: "/brontoboard/initialize", session, calendar }, // Input parameters from the request body/query
    { request }, // Binds the unique ID of this request for later response
  ]),
  where: async (frames) => {
    // Attempt to retrieve the user ID associated with the provided session.
    // If the session is invalid, frames will become empty, and 'then' will not fire.
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.initializeBB, // Call the concept action
    { user, calendar }, // Pass the user (from session) and calendar (from request)
    { brontoBoard }, // Bind the output 'brontoBoard' ID
  ]),
});

/**
 * Sync: InitializeBrontoBoardResponse
 * When BrontoBoard.initializeBB successfully completes, respond to the original HTTP request
 * with the ID of the newly created BrontoBoard.
 */
export const InitializeBrontoBoardResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/initialize" }, { request }], // Matches the original request flow
    [BrontoBoard.initializeBB, {}, { brontoBoard }], // Matches the successful completion of the action
  ),
  then: actions([
    Requesting.respond, // Respond to the client
    { request, brontoBoard }, // Include the request ID and the BrontoBoard ID in the response
  ]),
});

/**
 * Sync: InitializeBrontoBoardErrorResponse
 * When BrontoBoard.initializeBB fails and returns an error, respond to the original HTTP request
 * with the error message.
 */
export const InitializeBrontoBoardErrorResponse: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/initialize" }, { request }], // Matches the original request flow
    [BrontoBoard.initializeBB, {}, { error }], // Matches the action failing with an error
  ),
  then: actions([
    Requesting.respond, // Respond to the client
    { request, error }, // Include the request ID and the error message in the response
  ]),
});

// ============================================================================
// 2. Synchronizations for BrontoBoard.createClass
//    Request path: POST /brontoboard/class/create
//    Inputs: session, brontoBoard, className, overview
//    Output: class
// ============================================================================

/**
 * Sync: CreateClassRequest
 * Handles requests to create a new class within a BrontoBoard.
 * Authenticates the user and then triggers the BrontoBoard.createClass action.
 */
export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoard, className, overview, class: newClass },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/class/create", session, brontoBoard, className, overview },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.createClass,
    { owner: user, brontoBoard, className, overview }, // 'user' from session becomes 'owner'
    { class: newClass }, // Bind the output 'class' ID to 'newClass' variable
  ]),
});

/**
 * Sync: CreateClassResponse
 * Responds to the client with the ID of the newly created class upon successful creation.
 */
export const CreateClassResponse: Sync = ({ request, class: newClass }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: newClass }],
  ),
  then: actions([
    Requesting.respond,
    { request, class: newClass },
  ]),
});

/**
 * Sync: CreateClassErrorResponse
 * Responds with an error message if BrontoBoard.createClass fails.
 */
export const CreateClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// 3. Synchronizations for BrontoBoard.addWork
//    Request path: POST /brontoboard/assignment/add
//    Inputs: session, class, workName, dueDate
//    Output: assignment
// ============================================================================

/**
 * Sync: AddWorkRequest
 * Handles requests to add a new assignment to a class.
 * Authenticates the user and then triggers the BrontoBoard.addWork action.
 */
export const AddWorkRequest: Sync = (
  { request, session, user, class: classId, workName, dueDate, assignment },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/assignment/add", session, class: classId, workName, dueDate },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.addWork,
    { owner: user, class: classId, workName, dueDate },
    { assignment }, // Bind the output 'assignment' ID
  ]),
});

/**
 * Sync: AddWorkResponse
 * Responds to the client with the ID of the newly created assignment upon successful addition.
 */
export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions([
    Requesting.respond,
    { request, assignment },
  ]),
});

/**
 * Sync: AddWorkErrorResponse
 * Responds with an error message if BrontoBoard.addWork fails.
 */
export const AddWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// 4. Synchronizations for BrontoBoard.changeWork
//    Request path: PUT /brontoboard/assignment/change
//    Inputs: session, work, dueDate
//    Output: Empty (success)
// ============================================================================

/**
 * Sync: ChangeWorkRequest
 * Handles requests to change the due date of an assignment.
 * Authenticates the user and then triggers the BrontoBoard.changeWork action.
 */
export const ChangeWorkRequest: Sync = (
  { request, session, user, work, dueDate },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/assignment/change", session, work, dueDate },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.changeWork,
    { owner: user, work, dueDate },
    {}, // Action returns Empty on success
  ]),
});

/**
 * Sync: ChangeWorkResponse
 * Responds to the client with a generic success message upon successful modification.
 */
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches the successful completion (Empty output)
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Assignment due date updated successfully." }, // Custom success message
  ]),
});

/**
 * Sync: ChangeWorkErrorResponse
 * Responds with an error message if BrontoBoard.changeWork fails.
 */
export const ChangeWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// 5. Synchronizations for BrontoBoard.removeWork
//    Request path: DELETE /brontoboard/assignment/remove
//    Inputs: session, work
//    Output: Empty (success)
// ============================================================================

/**
 * Sync: RemoveWorkRequest
 * Handles requests to remove an assignment from a class.
 * Authenticates the user and then triggers the BrontoBoard.removeWork action.
 */
export const RemoveWorkRequest: Sync = (
  { request, session, user, work },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/assignment/remove", session, work },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.removeWork,
    { owner: user, work },
    {}, // Action returns Empty on success
  ]),
});

/**
 * Sync: RemoveWorkResponse
 * Responds to the client with a generic success message upon successful removal.
 */
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches the successful completion (Empty output)
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Assignment removed successfully." }, // Custom success message
  ]),
});

/**
 * Sync: RemoveWorkErrorResponse
 * Responds with an error message if BrontoBoard.removeWork fails.
 */
export const RemoveWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// 6. Synchronizations for BrontoBoard.addOH
//    Request path: POST /brontoboard/officehours/add
//    Inputs: session, class, OHTime, OHduration
//    Output: officeHours
// ============================================================================

/**
 * Sync: AddOHRequest
 * Handles requests to add new office hours to a class.
 * Authenticates the user and then triggers the BrontoBoard.addOH action.
 */
export const AddOHRequest: Sync = (
  { request, session, user, class: classId, OHTime, OHduration, officeHours },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/officehours/add", session, class: classId, OHTime, OHduration },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.addOH,
    { owner: user, class: classId, OHTime, OHduration },
    { officeHours }, // Bind the output 'officeHours' ID
  ]),
});

/**
 * Sync: AddOHResponse
 * Responds to the client with the ID of the newly created office hours upon successful addition.
 */
export const AddOHResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions([
    Requesting.respond,
    { request, officeHours },
  ]),
});

/**
 * Sync: AddOHErrorResponse
 * Responds with an error message if BrontoBoard.addOH fails.
 */
export const AddOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// 7. Synchronizations for BrontoBoard.changeOH
//    Request path: PUT /brontoboard/officehours/change
//    Inputs: session, oh, newDate, newduration
//    Output: Empty (success)
// ============================================================================

/**
 * Sync: ChangeOHRequest
 * Handles requests to change the details of existing office hours.
 * Authenticates the user and then triggers the BrontoBoard.changeOH action.
 */
export const ChangeOHRequest: Sync = (
  { request, session, user, oh, newDate, newduration },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/officehours/change", session, oh, newDate, newduration },
    { request },
  ]),
  where: async (frames) => {
    return await getUserFromSession(frames, session, user);
  },
  then: actions([
    BrontoBoard.changeOH,
    { owner: user, oh, newDate, newduration },
    {}, // Action returns Empty on success
  ]),
});

/**
 * Sync: ChangeOHResponse
 * Responds to the client with a generic success message upon successful modification.
 */
export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches the successful completion (Empty output)
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Office hours updated successfully." }, // Custom success message
  ]),
});

/**
 * Sync: ChangeOHErrorResponse
 * Responds with an error message if BrontoBoard.changeOH fails.
 */
export const ChangeOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// ============================================================================
// Example Query Synchronizations (Read Operations)
// These demonstrate how to fetch data and respond, handling the "zero matches" pitfall.
// ============================================================================

/**
 * Sync: GetClassesForBrontoBoardRequest
 * Handles a request (GET /brontoboard/classes) to retrieve all classes for a given BrontoBoard.
 * Requires user authentication via session to ensure authorized access to the BrontoBoard.
 */
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, user, brontoBoard, classes }, // `classes` will hold the collected results
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/classes", session, brontoBoard }, // Takes brontoBoard ID from query/body
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await getUserFromSession(frames, session, user);

    // IMPORTANT: If no user (session invalid), return an empty array for `classes`
    // instead of letting the query potentially fail or not respond.
    const originalRequestFrame = frames.length > 0 ? frames[0] : null;

    if (frames.length === 0) {
      // Create a new frame with the request ID and an empty classes array
      // This ensures a response is sent even if the session is invalid.
      if (originalRequestFrame) {
        return new Frames({ ...originalRequestFrame, [classes]: [] });
      }
      return new Frames({ [request]: frames[request], [classes]: []}); // Fallback if no original frame
    }

    // 2. Query the BrontoBoard concept for the classes associated with the given brontoBoard ID.
    // The `BrontoBoardConcept`'s query method `_getClassesForBrontoBoard` is expected
    // to return an array of `ClassDoc`s. This will enrich each frame.
    // An authorization check for ownership of the `brontoBoard` itself would ideally
    // happen here by querying `BrontoBoard._getBrontoBoardById` and checking its `owner`.
    // For this example, we assume `_getClassesForBrontoBoard` implicitly handles access
    // or that higher-level syncs manage it.
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard },
      { class: classes }, // Bind the individual class documents to 'class' variable temporarily
    );

    // 3. Collect all retrieved classes into a single 'classes' array under the original frame.
    // This is crucial if `_getClassesForBrontoBoard` returns multiple frames (one per class).
    // If no classes were found, frames might still be empty after the query.
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({ ...originalRequestFrame, [classes]: [] });
    } else if (frames.length === 0) {
       return new Frames({ [request]: originalRequestFrame?.[request], [classes]: []});
    }

    // Collect all individual 'class' bindings from potentially multiple frames into one 'classes' array.
    // The non-collected variable is implicitly grouped by (in this case, just the original request info).
    return frames.collectAs([classes], classes);
  },
  then: actions([
    Requesting.respond,
    { request, classes }, // Respond with the collected array of classes
  ]),
});

/**
 * Sync: GetAssignmentsForClassRequest
 * Handles a request (GET /brontoboard/class/assignments) to retrieve all assignments for a given Class.
 * Requires user authentication via session to ensure authorized access.
 */
export const GetAssignmentsForClassRequest: Sync = (
  { request, session, user, class: classId, assignments },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboard/class/assignments", session, class: classId },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await getUserFromSession(frames, session, user);

    const originalRequestFrame = frames.length > 0 ? frames[0] : null;

    if (frames.length === 0) {
      if (originalRequestFrame) {
        return new Frames({ ...originalRequestFrame, [assignments]: [] });
      }
      return new Frames({ [request]: frames[request], [assignments]: []});
    }

    // Additional authorization step: Ensure the user owns the BrontoBoard that owns this class.
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, {
      class: classId,
      brontoBoardId: brontoBoard, // Bind the parent brontoBoardId from the class
    });

    if (frames.length === 0) {
      // If the class itself doesn't exist or isn't found
      if (originalRequestFrame) {
        return new Frames({ ...originalRequestFrame, [assignments]: [] });
      }
      return new Frames({ [request]: originalRequestFrame?.[request], [assignments]: []});
    }

    // Now check if the user is the owner of the BrontoBoard
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: brontoBoard },
      { owner: user, brontoBoard: brontoBoard }, // Rebind brontoBoard and check owner
    );

    // Filter frames to ensure the 'user' matches the 'owner' of the BrontoBoard
    frames = frames.filter(($) => $[user] === $[user]); // This check is redundant with _getBrontoBoardIfOwned logic, but illustrates explicit filtering

    if (frames.length === 0) {
      // If the user is not the owner or brontoBoard not found
      if (originalRequestFrame) {
        return new Frames({ ...originalRequestFrame, [assignments]: [] });
      }
       return new Frames({ [request]: originalRequestFrame?.[request], [assignments]: []});
    }

    // 2. Query assignments for the class
    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: classId },
      { assignment: assignments },
    );

    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({ ...originalRequestFrame, [assignments]: [] });
    } else if (frames.length === 0) {
       return new Frames({ [request]: originalRequestFrame?.[request], [assignments]: []});
    }

    return frames.collectAs([assignments], assignments);
  },
  then: actions([
    Requesting.respond,
    { request, assignments },
  ]),
});
```
