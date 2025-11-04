---
timestamp: 'Mon Nov 03 2025 20:29:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_202900.d28ca62e.md]]'
content_id: ab4b0435dd6f38aaf8fc971a1eeb35991217d6170f059e06990f738eed9d8a94
---

# response:

Here's the TypeScript file containing synchronizations for the `BrontoBoard` concept, handling requests, successful responses, and error responses, and integrating with the `Sessioning` concept for authorization.

**File:** `src/syncs/brontoboard.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
// Import all necessary concepts from your @concepts alias
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is available from @utils/types.ts

// --- Synchronization for initializeBB ---

/**
 * Sync: Request to initialize a BrontoBoard.
 * When a request comes in, get the user from the session and call BrontoBoard.initializeBB.
 */
export const InitializeBBRequest: Sync = (
  { request, session, user, calendar },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/initialize", session, calendar },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user associated with the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // If no user found for the session, this frame set will become empty,
    // preventing BrontoBoard.initializeBB from being called.
    return frames;
  },
  then: actions(
    [BrontoBoard.initializeBB, { user, calendar }],
  ),
});

/**
 * Sync: Respond to a successful BrontoBoard initialization.
 */
export const InitializeBBResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/initialize" },
      { request },
    ],
    [BrontoBoard.initializeBB, {}, { brontoBoard }], // Matches success output
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

/**
 * Sync: Respond to an error during BrontoBoard initialization.
 */
export const InitializeBBError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/initialize" },
      { request },
    ],
    [BrontoBoard.initializeBB, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for createClass ---

/**
 * Sync: Request to create a Class within a BrontoBoard.
 * Verifies the user's session and that they own the BrontoBoard before creating the class.
 */
export const CreateClassRequest: Sync = (
  { request, session, user, brontoBoard, className, overview },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/class/create", session, brontoBoard, className, overview },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.createClass action itself handles checking ownership using the 'owner' parameter.
    // We just need to ensure 'user' is properly bound.
    return frames;
  },
  then: actions(
    [
      BrontoBoard.createClass,
      { owner: user, brontoBoard, className, overview },
    ],
  ),
});

/**
 * Sync: Respond to a successful Class creation.
 */
export const CreateClassResponse: Sync = (
  { request, class: newClass }, // Renamed 'class' to 'newClass' to avoid keyword conflict
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: newClass }], // Matches success output
  ),
  then: actions(
    [Requesting.respond, { request, class: newClass }],
  ),
});

/**
 * Sync: Respond to an error during Class creation.
 */
export const CreateClassError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for addWork ---

/**
 * Sync: Request to add an Assignment to a Class.
 * Verifies the user's session and that they own the associated BrontoBoard/Class.
 */
export const AddWorkRequest: Sync = (
  { request, session, user, class: classId, workName, dueDate },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/assignment/add", session, class: classId, workName, dueDate },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.addWork action itself handles checking ownership using the 'owner' parameter.
    return frames;
  },
  then: actions(
    [
      BrontoBoard.addWork,
      { owner: user, class: classId, workName, dueDate },
    ],
  ),
});

/**
 * Sync: Respond to a successful Assignment addition.
 */
export const AddWorkResponse: Sync = (
  { request, assignment },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }], // Matches success output
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

/**
 * Sync: Respond to an error during Assignment addition.
 */
export const AddWorkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for changeWork ---

/**
 * Sync: Request to change an Assignment's due date.
 * Verifies the user's session and that they own the associated BrontoBoard/Class/Assignment.
 */
export const ChangeWorkRequest: Sync = (
  { request, session, user, work, dueDate },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/assignment/change", session, work, dueDate },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.changeWork action itself handles checking ownership using the 'owner' parameter.
    return frames;
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work, dueDate }],
  ),
});

/**
 * Sync: Respond to a successful Assignment change.
 * Note: changeWork returns an Empty object on success.
 */
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches success (empty) output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Assignment updated successfully." }],
  ),
});

/**
 * Sync: Respond to an error during Assignment change.
 */
export const ChangeWorkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for removeWork ---

/**
 * Sync: Request to remove an Assignment.
 * Verifies the user's session and that they own the associated BrontoBoard/Class/Assignment.
 */
export const RemoveWorkRequest: Sync = (
  { request, session, user, work },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/assignment/remove", session, work },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.removeWork action itself handles checking ownership using the 'owner' parameter.
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work }],
  ),
});

/**
 * Sync: Respond to a successful Assignment removal.
 * Note: removeWork returns an Empty object on success.
 */
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches success (empty) output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Assignment removed successfully." }],
  ),
});

/**
 * Sync: Respond to an error during Assignment removal.
 */
export const RemoveWorkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for addOH ---

/**
 * Sync: Request to add Office Hours to a Class.
 * Verifies the user's session and that they own the associated BrontoBoard/Class.
 */
export const AddOHRequest: Sync = (
  { request, session, user, class: classId, OHTime, OHduration },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/officehours/add", session, class: classId, OHTime, OHduration },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.addOH action itself handles checking ownership using the 'owner' parameter.
    return frames;
  },
  then: actions(
    [
      BrontoBoard.addOH,
      { owner: user, class: classId, OHTime, OHduration },
    ],
  ),
});

/**
 * Sync: Respond to a successful Office Hours addition.
 */
export const AddOHResponse: Sync = (
  { request, officeHours },
) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }], // Matches success output
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

/**
 * Sync: Respond to an error during Office Hours addition.
 */
export const AddOHError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Synchronization for changeOH ---

/**
 * Sync: Request to change Office Hours details.
 * Verifies the user's session and that they own the associated BrontoBoard/Class/OfficeHours.
 */
export const ChangeOHRequest: Sync = (
  { request, session, user, oh, newDate, newduration },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/api/brontoboard/officehours/change", session, oh, newDate, newduration },
      { request },
    ],
  ),
  where: async (frames) => {
    // Get the user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // The BrontoBoard.changeOH action itself handles checking ownership using the 'owner' parameter.
    return frames;
  },
  then: actions(
    [BrontoBoard.changeOH, { owner: user, oh, newDate, newduration }],
  ),
});

/**
 * Sync: Respond to a successful Office Hours change.
 * Note: changeOH returns an Empty object on success.
 */
export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches success (empty) output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Office Hours updated successfully." }],
  ),
});

/**
 * Sync: Respond to an error during Office Hours change.
 */
export const ChangeOHError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
