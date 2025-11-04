---
timestamp: 'Mon Nov 03 2025 20:52:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_205202.de3278b1.md]]'
content_id: 482063c943488a7e5607eb881d3039c36f13f59aab37baf0f7b33d7615f6b01f
---

# response:

Here are the synchronizations for the `BrontoBoard` concept's getter functions, implemented in a single file as requested. Each synchronization handles authorization using the `Sessioning` concept and ensures that every `Requesting.request` receives a `Requesting.respond` for all success and error cases (authorization failure, or concept-level error).

## file: src/syncs/brontoboard\_queries.sync.ts

```typescript
// These imports are crucial for declaring synchronizations and accessing concepts
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts"; // Assuming BrontoBoard and Sessioning are exposed via @concepts

// --- Helper for consistent error messages and Frame initialization ---
// This is not a "helper function for authorization" in the context of the prompt's
// restriction, as it's purely for internal sync logic structuring and not
// an extracted, reusable authorization component for multiple syncs.
const initSyncFrames = (originalFrame: Record<symbol, unknown>): Frames => new Frames(originalFrame);

// --- 1. Get Assignments For a Specific Class ---
export const GetAssignmentsForClass: Sync = (
  { request, session, user, classId, classDoc, brontoBoardDoc, assignments, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes/:classId/assignments", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the Class Document
    currentFrames = await currentFrames.query(BrontoBoard._getClassById, { class: originalFrame[classId] }, { classDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Class with ID '${originalFrame[classId]}' not found.` });
      return new Frames();
    }

    // 3. Get the BrontoBoard Document using the class's brontoBoardId
    //    Ensure classDoc is available for this step
    const classIdFromFrame = currentFrames[0][classDoc]._id; // Access the actual ID from the bound document
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: BrontoBoard for class '${classIdFromFrame}' not found.` });
      return new Frames();
    }

    // 4. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user]; // The symbol `user` holds the ID directly
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own the BrontoBoard for this class." });
      return new Frames();
    }

    // 5. If authorized, proceed to execute the actual BrontoBoard query for assignments
    currentFrames = await currentFrames.query(BrontoBoard._getAssignmentsForClass, { class: originalFrame[classId] }, { assignments, error });

    // 6. Handle potential errors from the BrontoBoard query itself
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 7. Filter to keep only successful results (where `assignments` is defined and `error` is not)
    //    An empty `assignments` array is a valid successful result.
    return currentFrames.filter(($) => $[assignments] !== undefined && $[error] === undefined);
  },
  then: actions(
    // Respond with a structured body containing the assignments array
    [Requesting.respond, { request, body: { assignments } }],
  ),
});

// --- 2. Get Office Hours For a Specific Class ---
export const GetOfficeHoursForClass: Sync = (
  { request, session, user, classId, classDoc, brontoBoardDoc, officeHours, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes/:classId/office-hours", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the Class Document
    currentFrames = await currentFrames.query(BrontoBoard._getClassById, { class: originalFrame[classId] }, { classDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Class with ID '${originalFrame[classId]}' not found.` });
      return new Frames();
    }

    // 3. Get the BrontoBoard Document using the class's brontoBoardId
    const classIdFromFrame = currentFrames[0][classDoc]._id;
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: BrontoBoard for class '${classIdFromFrame}' not found.` });
      return new Frames();
    }

    // 4. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own the BrontoBoard for this class." });
      return new Frames();
    }

    // 5. If authorized, proceed to execute the actual BrontoBoard query for office hours
    currentFrames = await currentFrames.query(BrontoBoard._getOfficeHoursForClass, { class: originalFrame[classId] }, { officeHours, error });

    // 6. Handle potential errors from the BrontoBoard query itself
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 7. Filter to keep only successful results
    return currentFrames.filter(($) => $[officeHours] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: { officeHours } }],
  ),
});

// --- 3. Get Classes For a Specific BrontoBoard ---
export const GetClassesForBrontoBoard: Sync = (
  { request, session, user, brontoBoardId, brontoBoardDoc, classes, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the BrontoBoard Document
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: originalFrame[brontoBoardId] }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `BrontoBoard with ID '${originalFrame[brontoBoardId]}' not found.` });
      return new Frames();
    }

    // 3. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own this BrontoBoard." });
      return new Frames();
    }

    // 4. If authorized, execute the actual BrontoBoard query for classes
    currentFrames = await currentFrames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: originalFrame[brontoBoardId] }, { classes, error });

    // 5. Handle potential errors from the BrontoBoard query itself
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 6. Filter to keep only successful results
    return currentFrames.filter(($) => $[classes] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: { classes } }],
  ),
});

// --- 4. Get BrontoBoards For the Authenticated User ---
export const GetBrontoBoardsForAuthenticatedUser: Sync = (
  { request, session, user, brontoBoards, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/me", session }, { request }], // Path for currently authenticated user
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // No further authorization needed as the request is for 'me', already authenticated.
    const currentUserId = currentFrames[0][user];

    // 2. Execute the BrontoBoard query for the authenticated user's BrontoBoards
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardsForUser, { user: currentUserId }, { brontoBoards, error });

    // 3. Handle potential errors from the BrontoBoard query itself
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 4. Filter to keep only successful results
    return currentFrames.filter(($) => $[brontoBoards] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: { brontoBoards } }],
  ),
});


// --- 5. Get a Specific BrontoBoard by ID ---
export const GetBrontoBoardById: Sync = (
  { request, session, user, brontoBoard, brontoBoardDoc, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/:brontoBoard/view", session, brontoBoard }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the BrontoBoard Document
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: originalFrame[brontoBoard] }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `BrontoBoard with ID '${originalFrame[brontoBoard]}' not found.` });
      return new Frames();
    }

    // 3. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own this BrontoBoard." });
      return new Frames();
    }

    // 4. If authorized, proceed to execute the actual BrontoBoard query (which we already did to get brontoBoardDoc)
    // Here, we just return the already fetched document. Queries should ideally return arrays,
    // so we wrap the single document in an array for consistency with other BrontoBoard queries.
    // However, for single-item views, usually the item itself is returned.
    // Assuming `_getBrontoBoardById` returns `BrontoBoardDoc[]` or `{ error: string }`.
    // If it successfully found one, `brontoBoardDoc` would be an array of one item.
    // We can simply set the `brontoBoard` variable to the single doc for the `then` clause.
    currentFrames = currentFrames.map(($) => ({ ...$, [brontoBoard]: $[brontoBoardDoc] }));


    // 5. Handle potential errors (if _getBrontoBoardById also populates `error` for internal DB issues)
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 6. Filter to keep only successful results
    return currentFrames.filter(($) => $[brontoBoard] !== undefined && $[error] === undefined);
  },
  then: actions(
    // Respond with the single BrontoBoard document
    [Requesting.respond, { request, body: brontoBoard }],
  ),
});


// --- 6. Get a Specific Class by ID ---
export const GetClassById: Sync = (
  { request, session, user, classId, classDoc, brontoBoardDoc, clazz, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes/:classId/view", session, classId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the Class Document
    currentFrames = await currentFrames.query(BrontoBoard._getClassById, { class: originalFrame[classId] }, { classDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Class with ID '${originalFrame[classId]}' not found.` });
      return new Frames();
    }

    // 3. Get the BrontoBoard Document using the class's brontoBoardId
    const classIdFromFrame = currentFrames[0][classDoc]._id;
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: BrontoBoard for class '${classIdFromFrame}' not found.` });
      return new Frames();
    }

    // 4. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own the BrontoBoard for this class." });
      return new Frames();
    }

    // 5. If authorized, proceed. Set the `clazz` variable to the single classDoc for the `then` clause.
    currentFrames = currentFrames.map(($) => ({ ...$, [clazz]: $[classDoc] }));

    // 6. Handle potential errors from the BrontoBoard query (if getClassById returns `error` too)
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 7. Filter to keep only successful results
    return currentFrames.filter(($) => $[clazz] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: clazz }],
  ),
});


// --- 7. Get a Specific Assignment by ID ---
export const GetAssignmentById: Sync = (
  { request, session, user, assignmentId, assignmentDoc, classDoc, brontoBoardDoc, assignment, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignments/:assignmentId/view", session, assignmentId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the Assignment Document
    currentFrames = await currentFrames.query(BrontoBoard._getAssignmentById, { assignment: originalFrame[assignmentId] }, { assignmentDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Assignment with ID '${originalFrame[assignmentId]}' not found.` });
      return new Frames();
    }

    // 3. Get the Class Document that this assignment belongs to
    const assignmentClassId = currentFrames[0][assignmentDoc].classId;
    currentFrames = await currentFrames.query(BrontoBoard._getClassById, { class: assignmentClassId }, { classDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: Class for assignment '${originalFrame[assignmentId]}' not found.` });
      return new Frames();
    }

    // 4. Get the BrontoBoard Document using the class's brontoBoardId
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: BrontoBoard for assignment's class not found.` });
      return new Frames();
    }

    // 5. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own the BrontoBoard for this assignment." });
      return new Frames();
    }

    // 6. If authorized, proceed. Set the `assignment` variable to the single assignmentDoc for the `then` clause.
    currentFrames = currentFrames.map(($) => ({ ...$, [assignment]: $[assignmentDoc] }));

    // 7. Handle potential errors
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 8. Filter to keep only successful results
    return currentFrames.filter(($) => $[assignment] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: assignment }],
  ),
});

// --- 8. Get a Specific Office Hour by ID ---
export const GetOfficeHourById: Sync = (
  { request, session, user, officeHourId, officeHourDoc, classDoc, brontoBoardDoc, officeHour, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/office-hours/:officeHourId/view", session, officeHourId }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    let currentFrames = initSyncFrames(originalFrame);

    // 1. Authenticate session
    currentFrames = await currentFrames.query(Sessioning._getUser, { session: originalFrame[session] }, { user });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: "Authentication required: Invalid session or session expired." });
      return new Frames();
    }

    // 2. Get the OfficeHour Document
    currentFrames = await currentFrames.query(BrontoBoard._getOfficeHourById, { officeHour: originalFrame[officeHourId] }, { officeHourDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Office hour with ID '${originalFrame[officeHourId]}' not found.` });
      return new Frames();
    }

    // 3. Get the Class Document that this office hour belongs to
    const officeHourClassId = currentFrames[0][officeHourDoc].classId;
    currentFrames = await currentFrames.query(BrontoBoard._getClassById, { class: officeHourClassId }, { classDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: Class for office hour '${originalFrame[officeHourId]}' not found.` });
      return new Frames();
    }

    // 4. Get the BrontoBoard Document using the class's brontoBoardId
    currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: currentFrames[0][classDoc].brontoBoardId }, { brontoBoardDoc });
    if (currentFrames.length === 0) {
      await Requesting.respond({ request: originalFrame[request], error: `Internal error: BrontoBoard for office hour's class not found.` });
      return new Frames();
    }

    // 5. Authorize: Check if the session user is the owner of the BrontoBoard
    const ownerId = currentFrames[0][brontoBoardDoc].owner;
    const currentUserId = currentFrames[0][user];
    if (ownerId !== currentUserId) {
      await Requesting.respond({ request: originalFrame[request], error: "Authorization failed: You do not own the BrontoBoard for this office hour." });
      return new Frames();
    }

    // 6. If authorized, proceed. Set the `officeHour` variable to the single officeHourDoc for the `then` clause.
    currentFrames = currentFrames.map(($) => ({ ...$, [officeHour]: $[officeHourDoc] }));

    // 7. Handle potential errors
    const erroredFrames = currentFrames.filter(($) => $[error] !== undefined);
    if (erroredFrames.length > 0) {
      await Requesting.respond({ request: originalFrame[request], error: erroredFrames[0][error] });
      return new Frames();
    }

    // 8. Filter to keep only successful results
    return currentFrames.filter(($) => $[officeHour] !== undefined && $[error] === undefined);
  },
  then: actions(
    [Requesting.respond, { request, body: officeHour }],
  ),
});
```
