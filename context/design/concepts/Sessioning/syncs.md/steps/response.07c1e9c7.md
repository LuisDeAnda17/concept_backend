---
timestamp: 'Mon Nov 03 2025 21:08:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_210838.5781f6a7.md]]'
content_id: 07c1e9c798ce75e59c3671924ba0c0256d91d5aa7d25e181c67cc5a5a4a1f221
---

# response:

Here are the synchronizations for the `BrontoBoard` concept's query functions, implemented in a single file as requested. Each query has three associated synchronizations: one to handle the incoming request and authorize it, one for a successful response from the query, and one for an error response from the query.

Authorization for all BrontoBoard-related queries (except `_getBrontoBoardsForUser`) follows a chain:

1. Verify session and get the associated user.
2. Retrieve the relevant BrontoBoard, Class, Assignment, or OfficeHour document.
3. Trace up the ownership chain (e.g., Assignment -> Class -> BrontoBoard).
4. Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.

For `_getBrontoBoardsForUser`, only session validation is needed, as the query itself filters by the user.

```typescript
// src/syncs/brontoboard_queries.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts"; // Assuming BrontoBoard and Sessioning are correctly generated imports

// --- Syncs for BrontoBoard._getAssignmentsForClass ---
// API Path: /api/brontoboard/assignments/forClass

export const GetAssignmentsForClassRequest: Sync = ({ request, session, user, class: classId, classDoc, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignments/forClass", class: classId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames; // No valid session, or session not found

        // 2. Get Class document by classId
        frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classDoc });
        if (frames.length === 0) return frames; // Class not found

        // 3. Get parent BrontoBoard document using classDoc's brontoBoardId
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: frames[0][classDoc].brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames; // BrontoBoard not found (implies data inconsistency or incorrect ID if class exists)

        // 4. Authorize: user from session must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        // If authorization passes, trigger the BrontoBoard query. Its output will be matched by response syncs.
        [BrontoBoard._getAssignmentsForClass, { class: classId }, {}],
    ),
});

export const GetAssignmentsForClassResponse: Sync = ({ request, assignments }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignments/forClass" }, { request }],
        [BrontoBoard._getAssignmentsForClass, {}, { assignments }], // Match the array output of the query
    ),
    then: actions(
        [Requesting.respond, { request, assignments }], // Respond with the collected assignments
    ),
});

export const GetAssignmentsForClassResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignments/forClass" }, { request }],
        [BrontoBoard._getAssignmentsForClass, {}, { error }], // Match the error output of the query
    ),
    then: actions(
        [Requesting.respond, { request, error }], // Respond with the error
    ),
});

// --- Syncs for BrontoBoard._getOfficeHoursForClass ---
// API Path: /api/brontoboard/officehours/forClass

export const GetOfficeHoursForClassRequest: Sync = ({ request, session, user, class: classId, classDoc, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehours/forClass", class: classId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get Class document
        frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classDoc });
        if (frames.length === 0) return frames;

        // 3. Get parent BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: frames[0][classDoc].brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames;

        // 4. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getOfficeHoursForClass, { class: classId }, {}],
    ),
});

export const GetOfficeHoursForClassResponse: Sync = ({ request, officeHours }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehours/forClass" }, { request }],
        [BrontoBoard._getOfficeHoursForClass, {}, { officeHours }],
    ),
    then: actions(
        [Requesting.respond, { request, officeHours }],
    ),
});

export const GetOfficeHoursForClassResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehours/forClass" }, { request }],
        [BrontoBoard._getOfficeHoursForClass, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getClassesForBrontoBoard ---
// API Path: /api/brontoboard/classes/forBrontoBoard

export const GetClassesForBrontoBoardRequest: Sync = ({ request, session, user, brontoBoard: brontoBoardId, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/classes/forBrontoBoard", brontoBoard: brontoBoardId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames;

        // 3. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, {}],
    ),
});

export const GetClassesForBrontoBoardResponse: Sync = ({ request, classes }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/classes/forBrontoBoard" }, { request }],
        [BrontoBoard._getClassesForBrontoBoard, {}, { classes }],
    ),
    then: actions(
        [Requesting.respond, { request, classes }],
    ),
});

export const GetClassesForBrontoBoardResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/classes/forBrontoBoard" }, { request }],
        [BrontoBoard._getClassesForBrontoBoard, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getBrontoBoardsForUser ---
// API Path: /api/brontoboard/forUser

export const GetBrontoBoardsForUserRequest: Sync = ({ request, session, user }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/forUser", session }, { request }],
    ),
    where: async (frames) => {
        // Only need to get the user from the session; the query itself filters by user.
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        return frames;
    },
    then: actions(
        [BrontoBoard._getBrontoBoardsForUser, { user }, {}],
    ),
});

export const GetBrontoBoardsForUserResponse: Sync = ({ request, brontoBoards }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/forUser" }, { request }],
        [BrontoBoard._getBrontoBoardsForUser, {}, { brontoBoards }],
    ),
    then: actions(
        [Requesting.respond, { request, brontoBoards }],
    ),
});

export const GetBrontoBoardsForUserResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/forUser" }, { request }],
        [BrontoBoard._getBrontoBoardsForUser, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getBrontoBoardById ---
// API Path: /api/brontoboard/getById

export const GetBrontoBoardByIdRequest: Sync = ({ request, session, user, brontoBoard: brontoBoardId, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getById", brontoBoard: brontoBoardId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames; // BrontoBoard not found

        // 3. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, {}],
    ),
});

export const GetBrontoBoardByIdResponse: Sync = ({ request, brontoBoard }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getById" }, { request }],
        // Match the array output. For a single-item by-ID query, it's typically an array of 0 or 1 element.
        [BrontoBoard._getBrontoBoardById, {}, { brontoBoard }], 
    ),
    then: actions(
        [Requesting.respond, { request, brontoBoard }],
    ),
});

export const GetBrontoBoardByIdResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/getById" }, { request }],
        [BrontoBoard._getBrontoBoardById, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getClassById ---
// API Path: /api/brontoboard/class/getById

export const GetClassByIdRequest: Sync = ({ request, session, user, class: classId, classDoc, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/class/getById", class: classId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get Class document
        frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classDoc });
        if (frames.length === 0) return frames; // Class not found

        // 3. Get parent BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: frames[0][classDoc].brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames;

        // 4. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getClassById, { class: classId }, {}],
    ),
});

export const GetClassByIdResponse: Sync = ({ request, class: classResult }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/class/getById" }, { request }],
        [BrontoBoard._getClassById, {}, { class: classResult }],
    ),
    then: actions(
        [Requesting.respond, { request, class: classResult }],
    ),
});

export const GetClassByIdResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/class/getById" }, { request }],
        [BrontoBoard._getClassById, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getAssignmentById ---
// API Path: /api/brontoboard/assignment/getById

export const GetAssignmentByIdRequest: Sync = ({ request, session, user, assignment: assignmentId, assignmentDoc, classDoc, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignment/getById", assignment: assignmentId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get Assignment document
        frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignment: assignmentDoc });
        if (frames.length === 0) return frames; // Assignment not found

        // 3. Get parent Class document
        frames = await frames.query(BrontoBoard._getClassById, { class: frames[0][assignmentDoc].classId }, { class: classDoc });
        if (frames.length === 0) return frames;

        // 4. Get grandparent BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: frames[0][classDoc].brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames;

        // 5. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getAssignmentById, { assignment: assignmentId }, {}],
    ),
});

export const GetAssignmentByIdResponse: Sync = ({ request, assignment }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignment/getById" }, { request }],
        [BrontoBoard._getAssignmentById, {}, { assignment }],
    ),
    then: actions(
        [Requesting.respond, { request, assignment }],
    ),
});

export const GetAssignmentByIdResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/assignment/getById" }, { request }],
        [BrontoBoard._getAssignmentById, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- Syncs for BrontoBoard._getOfficeHourById ---
// API Path: /api/brontoboard/officehour/getById

export const GetOfficeHourByIdRequest: Sync = ({ request, session, user, officeHour: officeHourId, officeHourDoc, classDoc, brontoBoardDoc }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehour/getById", officeHour: officeHourId, session }, { request }],
    ),
    where: async (frames) => {
        // 1. Authenticate user via session
        frames = await frames.query(Sessioning._getUser, { session }, { user });
        if (frames.length === 0) return frames;

        // 2. Get OfficeHour document
        frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHour: officeHourDoc });
        if (frames.length === 0) return frames; // OfficeHour not found

        // 3. Get parent Class document
        frames = await frames.query(BrontoBoard._getClassById, { class: frames[0][officeHourDoc].classId }, { class: classDoc });
        if (frames.length === 0) return frames;

        // 4. Get grandparent BrontoBoard document
        frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: frames[0][classDoc].brontoBoardId }, { brontoBoard: brontoBoardDoc });
        if (frames.length === 0) return frames;

        // 5. Authorize: user must be the owner of the BrontoBoard
        return frames.filter(($) => $[brontoBoardDoc].owner === $[user]);
    },
    then: actions(
        [BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, {}],
    ),
});

export const GetOfficeHourByIdResponse: Sync = ({ request, officeHour }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehour/getById" }, { request }],
        [BrontoBoard._getOfficeHourById, {}, { officeHour }],
    ),
    then: actions(
        [Requesting.respond, { request, officeHour }],
    ),
});

export const GetOfficeHourByIdResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/api/brontoboard/officehour/getById" }, { request }],
        [BrontoBoard._getOfficeHourById, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});
```
