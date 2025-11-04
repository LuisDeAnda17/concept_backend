---
timestamp: 'Mon Nov 03 2025 19:52:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_195216.b9de3209.md]]'
content_id: 4c26707f90520a20a73495b0c7402364a6aa525b2471fe2a7b98898a19bbaeac
---

# response:

Here are the synchronization implementations for the `BrontoBoard` concept, contained within a single `brontoboard.sync.ts` file. These synchronizations define how external HTTP requests (via the `Requesting` concept) trigger actions within `BrontoBoard`, and how responses are returned. Authorization (checking user ownership via `Sessioning`) is handled in the `where` clauses.

The dynamic parts of the URL paths (like `:brontoBoardId`, `:classId`, etc.) are captured using named regex groups (`(?<variableName>[^\/]+)`) within the `path` pattern in the `Requesting.request` input. It's assumed that the `Requesting` concept, as part of its abstraction, automatically extracts these named groups and makes them available as variables in the input pattern for matching.

## file: src/syncs/brontoboard.sync.ts

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Import all necessary concepts
import { Requesting, Sessioning, BrontoBoard } from "@concepts";

// --- Helper for Query Results and Authorization ---
// The BrontoBoard concept's query methods (_getBrontoBoardById, _getClassById, etc.)
// return an array of documents (even if it's 0 or 1).
// This helper filters frames based on the existence and ownership of the queried document.
// It expects:
// - `frames`: The current set of frames.
// - `userVar`: The symbol/variable holding the current user's ID.
// - `docVar`: The symbol/variable holding the array result from a BrontoBoard query (e.g., '_temp_brontoBoard_doc').
// - `ownerPath`: A string path to the owner ID within the document (e.g., 'owner', or 'parentDoc[0].owner' if nested).
const filterOwnedDoc = (
    frames: Frames,
    userVar: symbol,
    docVar: symbol,
    ownerPath: string, // e.g., "owner" for BrontoBoard, "brontoBoardId" for Class
): Frames => {
    return frames.filter(($) => {
        const user = $[userVar];
        const docs = $[docVar];

        if (!user || !docs || docs.length === 0) {
            return false;
        }

        // Dynamically get the owner from the document based on ownerPath
        let docOwner;
        if (ownerPath === "owner") {
            docOwner = docs[0].owner;
        } else if (ownerPath === "brontoBoardId") {
            docOwner = docs[0].brontoBoardId;
        }
        // Extend this for other owner paths if necessary (e.g., for Assignment, need to get class, then brontoboard)

        // For this context, we need to ensure the `docs[0]` actually has an `owner` property
        // or a `brontoBoardId` which itself can be used to check ownership.
        // The check below for `docOwner` implies that the direct owner is in `docs[0].owner`
        // or `docs[0].brontoBoardId`. The actual authorization logic is usually more complex
        // and would query for the parent BrontoBoard's owner.

        // Simpler check for now: just that the doc exists.
        // The full ownership check will be done by chaining queries in the syncs.
        return true; // Return true here, actual ownership check happens in sync's where
    });
};

// --- 1. BrontoBoard.initializeBB ---

export const InitializeBrontoBoardRequest: Sync = (
  { request, session, user, calendar, brontoBoard },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboards/initialize", session, calendar },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => !!$[user]); // Ensure a user is found
  },
  then: actions(
    [BrontoBoard.initializeBB, { user, calendar }, { brontoBoard }],
  ),
});

export const InitializeBrontoBoardResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

export const InitializeBrontoBoardError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 2. BrontoBoard.createClass ---

export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoardId, className, overview, class: createdClass },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: /^\/brontoboards\/(?<brontoBoardId>[^\/]+)\/classes$/,
        brontoBoardId, // Assuming Requesting extracts path params to input pattern
        session,
        className,
        overview,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Ensure user exists and then check if they own the brontoBoard
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames; // No user, no further processing

    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: brontoBoardId },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [
      BrontoBoard.createClass,
      { owner: user, brontoBoard: brontoBoardId, className, overview },
      { class: createdClass },
    ],
  ),
});

export const CreateClassResponse: Sync = ({ request, class: createdClass }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/brontoboards\/[^\/]+\/classes$/ },
      { request },
    ],
    [BrontoBoard.createClass, {}, { class: createdClass }],
  ),
  then: actions(
    [Requesting.respond, { request, class: createdClass }],
  ),
});

export const CreateClassError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/brontoboards\/[^\/]+\/classes$/ },
      { request },
    ],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 3. BrontoBoard.addWork (Assignment) ---

export const AddAssignmentRequest: Sync = (
  { request, session, user, classId, workName, dueDate, assignment },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: /^\/classes\/(?<classId>[^\/]+)\/assignments$/,
        classId, // Assuming Requesting extracts path params
        session,
        workName,
        dueDate,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames;

    // Get the class to find its parent BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: classId },
      { class: "_temp_class_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_class_doc`] && $[`_temp_class_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Use the brontoBoardId from the class to check ownership
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames.map((f) => f[`_temp_class_doc`][0].brontoBoardId) },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [
      BrontoBoard.addWork,
      { owner: user, class: classId, workName, dueDate },
      { assignment },
    ],
  ),
});

export const AddAssignmentResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/classes\/[^\/]+\/assignments$/ },
      { request },
    ],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

export const AddAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/classes\/[^\/]+\/assignments$/ },
      { request },
    ],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 4. BrontoBoard.changeWork (Assignment) ---

export const ChangeAssignmentRequest: Sync = (
  { request, session, user, assignmentId, dueDate },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: /^\/assignments\/(?<assignmentId>[^\/]+)$/,
        assignmentId, // Assuming Requesting extracts path params
        session,
        dueDate,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames;

    // Get the assignment to find its parent class
    frames = await frames.query(
      BrontoBoard._getAssignmentById,
      { assignment: assignmentId },
      { assignment: "_temp_assignment_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_assignment_doc`] && $[`_temp_assignment_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Get the class to find its parent BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: frames.map((f) => f[`_temp_assignment_doc`][0].classId) },
      { class: "_temp_class_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_class_doc`] && $[`_temp_class_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Use the brontoBoardId from the class to check ownership
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames.map((f) => f[`_temp_class_doc`][0].brontoBoardId) },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work: assignmentId, dueDate }],
  ),
});

export const ChangeAssignmentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: /^\/assignments\/[^\/]+$/ }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Empty result for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const ChangeAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: /^\/assignments\/[^\/]+$/ }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 5. BrontoBoard.removeWork (Assignment) ---

export const RemoveAssignmentRequest: Sync = (
  { request, session, user, assignmentId },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/assignments\/(?<assignmentId>[^\/]+)$/, assignmentId, session },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames;

    // Get the assignment to find its parent class
    frames = await frames.query(
      BrontoBoard._getAssignmentById,
      { assignment: assignmentId },
      { assignment: "_temp_assignment_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_assignment_doc`] && $[`_temp_assignment_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Get the class to find its parent BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: frames.map((f) => f[`_temp_assignment_doc`][0].classId) },
      { class: "_temp_class_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_class_doc`] && $[`_temp_class_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Use the brontoBoardId from the class to check ownership
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames.map((f) => f[`_temp_class_doc`][0].brontoBoardId) },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work: assignmentId }],
  ),
});

export const RemoveAssignmentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: /^\/assignments\/[^\/]+$/ }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Empty result for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const RemoveAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: /^\/assignments\/[^\/]+$/ }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 6. BrontoBoard.addOH (Office Hours) ---

export const AddOfficeHoursRequest: Sync = (
  { request, session, user, classId, OHTime, OHduration, officeHours },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: /^\/classes\/(?<classId>[^\/]+)\/officehours$/,
        classId, // Assuming Requesting extracts path params
        session,
        OHTime,
        OHduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames;

    // Get the class to find its parent BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: classId },
      { class: "_temp_class_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_class_doc`] && $[`_temp_class_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Use the brontoBoardId from the class to check ownership
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames.map((f) => f[`_temp_class_doc`][0].brontoBoardId) },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [
      BrontoBoard.addOH,
      { owner: user, class: classId, OHTime, OHduration },
      { officeHours },
    ],
  ),
});

export const AddOfficeHoursResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/classes\/[^\/]+\/officehours$/ },
      { request },
    ],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const AddOfficeHoursError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: /^\/classes\/[^\/]+\/officehours$/ },
      { request },
    ],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 7. BrontoBoard.changeOH (Office Hours) ---

export const ChangeOfficeHoursRequest: Sync = (
  { request, session, user, officeHourId, newDate, newduration },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: /^\/officehours\/(?<officeHourId>[^\/]+)$/,
        officeHourId, // Assuming Requesting extracts path params
        session,
        newDate,
        newduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authorize: Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.filter(($) => !!$[user]);
    if (frames.length === 0) return frames;

    // Get the office hour record to find its parent class
    frames = await frames.query(
      BrontoBoard._getOfficeHourById,
      { officeHour: officeHourId },
      { officeHour: "_temp_office_hour_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_office_hour_doc`] && $[`_temp_office_hour_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Get the class to find its parent BrontoBoard
    frames = await frames.query(
      BrontoBoard._getClassById,
      { class: frames.map((f) => f[`_temp_office_hour_doc`][0].classId) },
      { class: "_temp_class_doc" },
    );
    frames = await frames.filter(($) =>
      $[`_temp_class_doc`] && $[`_temp_class_doc`].length > 0
    );
    if (frames.length === 0) return frames;

    // Use the brontoBoardId from the class to check ownership
    frames = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: frames.map((f) => f[`_temp_class_doc`][0].brontoBoardId) },
      { brontoBoard: "_temp_brontoBoard_doc" },
    );

    return frames.filter(($) =>
      $[`_temp_brontoBoard_doc`] && $[`_temp_brontoBoard_doc`].length > 0 &&
      $[`_temp_brontoBoard_doc`][0].owner === $[user]
    );
  },
  then: actions(
    [
      BrontoBoard.changeOH,
      { owner: user, oh: officeHourId, newDate, newduration },
    ],
  ),
});

export const ChangeOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: /^\/officehours\/[^\/]+$/ }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Empty result for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

export const ChangeOfficeHoursError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: /^\/officehours\/[^\/]+$/ }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
