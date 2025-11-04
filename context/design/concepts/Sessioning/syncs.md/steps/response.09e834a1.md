---
timestamp: 'Mon Nov 03 2025 20:25:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_202502.b1d72697.md]]'
content_id: 09e834a171a1be1d06266a93378cdc6a2d4a39e9bd6c1e5b58b2f6d9b188d55a
---

# response:

Here are the synchronizations for the `BrontoBoard` concept, implementing the request, success response, and error response patterns, and integrating with `Sessioning` for user authentication and authorization.

Store this code in a file like `src/syncs/brontoboard.sync.ts`.

```typescript
// src/syncs/brontoboard.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID, Empty } from "@utils/types.ts";

// ============================================================================
// BrontoBoard Initialization Syncs
// ============================================================================

/**
 * Sync: InitializeBBRequest
 * When a request to initialize a BrontoBoard comes in, get the user from the session
 * and trigger the BrontoBoard.initializeBB action.
 */
export const InitializeBBRequest: Sync = (
  { request, session, user, calendar },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/initialize", calendar, session },
    { request },
  ]),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions([BrontoBoard.initializeBB, { user, calendar }, {}]),
});

/**
 * Sync: InitializeBBResponse
 * When a BrontoBoard.initializeBB action successfully completes, respond to the original request.
 */
export const InitializeBBResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions([Requesting.respond, { request, brontoBoard }]),
});

/**
 * Sync: InitializeBBErrorResponse
 * When a BrontoBoard.initializeBB action fails, respond to the original request with the error.
 */
export const InitializeBBErrorResponse: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Class Creation Syncs
// ============================================================================

/**
 * Sync: CreateClassRequest
 * Handles a request to create a new class for a BrontoBoard.
 * Authenticates the user and authorizes them as the BrontoBoard owner.
 */
export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoard, className, overview, brontoBoardDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/:brontoBoard/classes", className, overview, session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session not found or user not linked

    // 2. Get the BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard },
      { brontoBoard: brontoBoardDoc },
    ); // Alias brontoBoard to brontoBoardDoc to avoid conflicts
    if (frames.length === 0) { // BrontoBoard not found
      // Handle the case where the brontoBoard might not exist,
      // or filter for owner check below will fail.
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [className]: frames._getBinding(className), [overview]: frames._getBinding(overview) };
      return new Frames({ ...originalFrame, error: `BrontoBoard with ID ${brontoBoard} not found.` });
    }

    // 3. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        // If not authorized, create an error frame instead of filtering all frames out
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [className]: frames._getBinding(className), [overview]: frames._getBinding(overview) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to create classes on BrontoBoard ${brontoBoard}.` });
    }
    return filteredFrames;
  },
  then: actions([
    BrontoBoard.createClass,
    { owner: user, brontoBoard, className, overview },
    {},
  ]),
});

/**
 * Sync: CreateClassResponse
 * Responds with the created class ID if the BrontoBoard.createClass action is successful.
 */
export const CreateClassResponse: Sync = ({ request, clazz }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboards/:brontoBoard/classes" },
      { request },
    ],
    [BrontoBoard.createClass, {}, { class: clazz }], // Using 'clazz' to avoid keyword conflict
  ),
  then: actions([Requesting.respond, { request, class: clazz }]),
});

/**
 * Sync: CreateClassErrorResponse
 * Responds with an error if the BrontoBoard.createClass action fails.
 */
export const CreateClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboards/:brontoBoard/classes" },
      { request },
    ],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Add Assignment (addWork) Syncs
// ============================================================================

/**
 * Sync: AddWorkRequest
 * Handles a request to add an assignment to a class.
 * Authenticates the user and authorizes them as the owner of the parent BrontoBoard.
 */
export const AddWorkRequest: Sync = (
  { request, session, user, clazz, workName, dueDate, classDoc, brontoBoardDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/classes/:clazz/assignments", workName, dueDate, session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get the Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: clazz },
      { class: classDoc },
    ); // Use 'clazz' as input, alias output to 'classDoc'
    if (frames.length === 0) {
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [workName]: frames._getBinding(workName), [dueDate]: frames._getBinding(dueDate) };
      return new Frames({ ...originalFrame, error: `Class with ID ${clazz} not found.` });
    }

    // 3. Get the parent BrontoBoard document using classDoc.brontoBoardId
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
        // This case indicates an internal inconsistency (class points to non-existent brontoBoard)
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [workName]: frames._getBinding(workName), [dueDate]: frames._getBinding(dueDate) };
        return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${clazz} not found.` });
    }

    // 4. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [workName]: frames._getBinding(workName), [dueDate]: frames._getBinding(dueDate) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to add work to class ${clazz}.` });
    }
    return filteredFrames;
  },
  then: actions([
    BrontoBoard.addWork,
    { owner: user, class: clazz, workName, dueDate },
    {},
  ]),
});

/**
 * Sync: AddWorkResponse
 * Responds with the created assignment ID if the BrontoBoard.addWork action is successful.
 */
export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:clazz/assignments" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions([Requesting.respond, { request, assignment }]),
});

/**
 * Sync: AddWorkErrorResponse
 * Responds with an error if the BrontoBoard.addWork action fails.
 */
export const AddWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:clazz/assignments" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Change Assignment (changeWork) Syncs
// ============================================================================

/**
 * Sync: ChangeWorkRequest
 * Handles a request to change an assignment's due date.
 * Authenticates the user and authorizes them as the owner of the parent BrontoBoard.
 */
export const ChangeWorkRequest: Sync = (
  { request, session, user, work, dueDate, assignmentDoc, classDoc, brontoBoardDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/assignments/:work", dueDate, session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get the Assignment document
    frames = await frames.query(
      BrontoBoard._getAssignmentById,
      { assignment: work },
      { assignment: assignmentDoc },
    );
    if (frames.length === 0) {
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [dueDate]: frames._getBinding(dueDate) };
      return new Frames({ ...originalFrame, error: `Assignment with ID ${work} not found.` });
    }

    // 3. Get the parent Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: assignmentDoc.classId },
      { class: classDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [dueDate]: frames._getBinding(dueDate) };
        return new Frames({ ...originalFrame, error: `Internal error: Class for assignment ${work} not found.` });
    }

    // 4. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [dueDate]: frames._getBinding(dueDate) };
        return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${classDoc._id} not found.` });
    }

    // 5. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [dueDate]: frames._getBinding(dueDate) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to change assignment ${work}.` });
    }
    return filteredFrames;
  },
  then: actions([
    BrontoBoard.changeWork,
    { owner: user, work, dueDate },
    {},
  ]),
});

/**
 * Sync: ChangeWorkResponse
 * Responds with a success status if the BrontoBoard.changeWork action is successful.
 */
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:work" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // No output on success
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * Sync: ChangeWorkErrorResponse
 * Responds with an error if the BrontoBoard.changeWork action fails.
 */
export const ChangeWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:work" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Remove Assignment (removeWork) Syncs
// ============================================================================

/**
 * Sync: RemoveWorkRequest
 * Handles a request to remove an assignment.
 * Authenticates the user and authorizes them as the owner of the parent BrontoBoard.
 */
export const RemoveWorkRequest: Sync = (
  { request, session, user, work, assignmentDoc, classDoc, brontoBoardDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/assignments/:work", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get the Assignment document
    frames = await frames.query(
      BrontoBoard._getAssignmentById,
      { assignment: work },
      { assignment: assignmentDoc },
    );
    if (frames.length === 0) {
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session) };
      return new Frames({ ...originalFrame, error: `Assignment with ID ${work} not found.` });
    }

    // 3. Get the parent Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: assignmentDoc.classId },
      { class: classDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session) };
        return new Frames({ ...originalFrame, error: `Internal error: Class for assignment ${work} not found.` });
    }

    // 4. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session) };
        return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${classDoc._id} not found.` });
    }

    // 5. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to remove assignment ${work}.` });
    }
    return filteredFrames;
  },
  then: actions([BrontoBoard.removeWork, { owner: user, work }, {}]),
});

/**
 * Sync: RemoveWorkResponse
 * Responds with a success status if the BrontoBoard.removeWork action is successful.
 */
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:work" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // No output on success
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * Sync: RemoveWorkErrorResponse
 * Responds with an error if the BrontoBoard.removeWork action fails.
 */
export const RemoveWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:work" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Add Office Hours (addOH) Syncs
// ============================================================================

/**
 * Sync: AddOHRequest
 * Handles a request to add office hours to a class.
 * Authenticates the user and authorizes them as the owner of the parent BrontoBoard.
 */
export const AddOHRequest: Sync = (
  {
    request,
    session,
    user,
    clazz,
    OHTime,
    OHduration,
    classDoc,
    brontoBoardDoc,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/classes/:clazz/officehours", OHTime, OHduration, session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get the Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: clazz },
      { class: classDoc },
    );
    if (frames.length === 0) {
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [OHTime]: frames._getBinding(OHTime), [OHduration]: frames._getBinding(OHduration) };
      return new Frames({ ...originalFrame, error: `Class with ID ${clazz} not found.` });
    }

    // 3. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [OHTime]: frames._getBinding(OHTime), [OHduration]: frames._getBinding(OHduration) };
        return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${clazz} not found.` });
    }

    // 4. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [OHTime]: frames._getBinding(OHTime), [OHduration]: frames._getBinding(OHduration) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to add office hours to class ${clazz}.` });
    }
    return filteredFrames;
  },
  then: actions([
    BrontoBoard.addOH,
    { owner: user, class: clazz, OHTime, OHduration },
    {},
  ]),
});

/**
 * Sync: AddOHResponse
 * Responds with the created office hours ID if the BrontoBoard.addOH action is successful.
 */
export const AddOHResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:clazz/officehours" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions([Requesting.respond, { request, officeHours }]),
});

/**
 * Sync: AddOHErrorResponse
 * Responds with an error if the BrontoBoard.addOH action fails.
 */
export const AddOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:clazz/officehours" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Change Office Hours (changeOH) Syncs
// ============================================================================

/**
 * Sync: ChangeOHRequest
 * Handles a request to change office hours details.
 * Authenticates the user and authorizes them as the owner of the parent BrontoBoard.
 */
export const ChangeOHRequest: Sync = (
  { request, session, user, oh, newDate, newduration, officeHourDoc, classDoc, brontoBoardDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/officehours/:oh", newDate, newduration, session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get the OfficeHour document
    frames = await frames.query(
      BrontoBoard._getOfficeHourById,
      { officeHour: oh },
      { officeHour: officeHourDoc },
    );
    if (frames.length === 0) {
      const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [newDate]: frames._getBinding(newDate), [newduration]: frames._getBinding(newduration) };
      return new Frames({ ...originalFrame, error: `Office hours with ID ${oh} not found.` });
    }

    // 3. Get the parent Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: officeHourDoc.classId },
      { class: classDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [newDate]: frames._getBinding(newDate), [newduration]: frames._getBinding(newduration) };
        return new Frames({ ...originalFrame, error: `Internal error: Class for office hours ${oh} not found.` });
    }

    // 4. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [newDate]: frames._getBinding(newDate), [newduration]: frames._getBinding(newduration) };
        return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${classDoc._id} not found.` });
    }

    // 5. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
        const originalFrame = frames[0] || { [request]: frames._getBinding(request), [session]: frames._getBinding(session), [newDate]: frames._getBinding(newDate), [newduration]: frames._getBinding(newduration) };
        return new Frames({ ...originalFrame, error: `User ${user} is not authorized to change office hours ${oh}.` });
    }
    return filteredFrames;
  },
  then: actions([
    BrontoBoard.changeOH,
    { owner: user, oh, newDate, newduration },
    {},
  ]),
});

/**
 * Sync: ChangeOHResponse
 * Responds with a success status if the BrontoBoard.changeOH action is successful.
 */
export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/officehours/:oh" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // No output on success
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * Sync: ChangeOHErrorResponse
 * Responds with an error if the BrontoBoard.changeOH action fails.
 */
export const ChangeOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/officehours/:oh" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Query BrontoBoard Syncs (GET requests)
// ============================================================================

/**
 * Sync: GetMyBrontoBoardsRequest
 * Handles a request to retrieve all BrontoBoards owned by the current user.
 */
export const GetMyBrontoBoardsRequest: Sync = (
  { request, session, user, brontoBoard, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/my-brontoboards", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original frame for error handling
    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session." });
    }

    // 2. Query BrontoBoards for this user
    frames = await frames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user },
      { brontoBoard },
    );

    // 3. Handle zero matches by returning an empty array for results
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }
    return frames.collectAs([brontoBoard], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Sync: GetClassesForBrontoBoardRequest
 * Handles a request to retrieve all classes for a specific BrontoBoard.
 * Authorizes the user as the owner of the BrontoBoard.
 */
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, user, brontoBoard, brontoBoardDoc, clazz, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/brontoboards/:brontoBoard/classes", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session." });
    }

    // 2. Get the BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `BrontoBoard with ID ${brontoBoard} not found.` });
    }

    // 3. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `User ${user} is not authorized to view classes for BrontoBoard ${brontoBoard}.` });
    }
    frames = filteredFrames;

    // 4. Query classes for this BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard },
      { class: clazz },
    );

    // 5. Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }
    return frames.collectAs([clazz], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Sync: GetAssignmentsForClassRequest
 * Handles a request to retrieve all assignments for a specific class.
 * Authorizes the user as the owner of the parent BrontoBoard.
 */
export const GetAssignmentsForClassRequest: Sync = (
  { request, session, user, clazz, classDoc, brontoBoardDoc, assignment, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/classes/:clazz/assignments", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session." });
    }

    // 2. Get the Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: clazz },
      { class: classDoc },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `Class with ID ${clazz} not found.` });
    }

    // 3. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${clazz} not found.` });
    }

    // 4. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `User ${user} is not authorized to view assignments for class ${clazz}.` });
    }
    frames = filteredFrames;

    // 5. Query assignments for this class
    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: clazz },
      { assignment },
    );

    // 6. Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }
    return frames.collectAs([assignment], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Sync: GetOfficeHoursForClassRequest
 * Handles a request to retrieve all office hours for a specific class.
 * Authorizes the user as the owner of the parent BrontoBoard.
 */
export const GetOfficeHoursForClassRequest: Sync = (
  { request, session, user, clazz, classDoc, brontoBoardDoc, officeHour, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/classes/:clazz/officehours", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session." });
    }

    // 2. Get the Class document
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: clazz },
      { class: classDoc },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `Class with ID ${clazz} not found.` });
    }

    // 3. Get the parent BrontoBoard document
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: classDoc.brontoBoardId },
      { brontoBoard: brontoBoardDoc },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `Internal error: BrontoBoard for class ${clazz} not found.` });
    }

    // 4. Authorize: Ensure the user is the owner of the BrontoBoard
    const filteredFrames = frames.filter(($) =>
      $[brontoBoardDoc].owner === $[user]
    );
    if (filteredFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `User ${user} is not authorized to view office hours for class ${clazz}.` });
    }
    frames = filteredFrames;

    // 5. Query office hours for this class
    frames = await frames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: clazz },
      { officeHour },
    );

    // 6. Handle zero matches
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }
    return frames.collectAs([officeHour], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
```
