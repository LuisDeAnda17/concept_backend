---
timestamp: 'Tue Nov 04 2025 11:14:59 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_111459.5db8b53b.md]]'
content_id: 254d78a15b299ea9da9abba00da3dad6037d7d26bb3b690915d3352d0890da16
---

# file: src/syncs/brontoboard.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { BrontoBoard, Requesting, Sessioning } from "@concepts";

// =============================================================================
// Initialize BrontoBoard
// API Route: POST /BrontoBoard/initializeBB
// =============================================================================

/**
 * When a request is made to initialize a BrontoBoard, this sync authenticates
 * the user via their session and then triggers the BrontoBoard.initializeBB action.
 */
export const InitializeBBRequest: Sync = ({ request, session, calendar, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/initializeBB", session, calendar },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the request by getting the user from the session.
    // If the session is invalid, no frames are returned, and the sync stops.
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    // The user from the session is passed as the 'user' parameter.
    BrontoBoard.initializeBB,
    { user, calendar },
  ]),
});

/**
 * Responds to the original request with the new BrontoBoard's ID upon successful creation.
 */
export const InitializeBBResponse: Sync = ({ request, brontoBoard }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/initializeBB" }, { request }],
    // Matches when the initializeBB action completes successfully, returning a 'brontoBoard' ID.
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions([
    Requesting.respond,
    { request, brontoBoard },
  ]),
});

/**
 * Responds to the original request with an error if BrontoBoard creation fails.
 */
export const InitializeBBErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/initializeBB" }, { request }],
    // Matches when the initializeBB action fails, returning an 'error'.
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Create Class
// API Route: POST /BrontoBoard/createClass
// =============================================================================

/**
 * When a request is made to create a class, this sync authenticates the user
 * and triggers the BrontoBoard.createClass action.
 */
export const CreateClassRequest: Sync = ({ request, session, brontoBoard, className, overview, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/createClass", session, brontoBoard, className, overview },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    // The concept action expects 'owner', so we map the 'user' variable from the session.
    BrontoBoard.createClass,
    { owner: user, brontoBoard, className, overview },
  ]),
});

/**
 * Responds to the original request with the new class's ID upon successful creation.
 */
export const CreateClassResponse: Sync = ({ request, class: classId }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId }],
  ),
  then: actions([
    Requesting.respond,
    { request, class: classId },
  ]),
});

/**
 * Responds to the original request with an error if class creation fails.
 */
export const CreateClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Add Work (Assignment)
// API Route: POST /BrontoBoard/addWork
// =============================================================================

/**
 * When a request is made to add work to a class, this sync authenticates the user
 * and triggers the BrontoBoard.addWork action.
 */
export const AddWorkRequest: Sync = ({ request, session, class: classId, workName, dueDate, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/addWork", session, class: classId, workName, dueDate },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    BrontoBoard.addWork,
    { owner: user, class: classId, workName, dueDate },
  ]),
});

/**
 * Responds to the original request with the new assignment's ID upon successful creation.
 */
export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions([
    Requesting.respond,
    { request, assignment },
  ]),
});

/**
 * Responds to the original request with an error if adding work fails.
 */
export const AddWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Change Work (Assignment)
// API Route: POST /BrontoBoard/changeWork
// =============================================================================

/**
 * When a request is made to change an assignment's due date, this sync authenticates the user
 * and triggers the BrontoBoard.changeWork action.
 */
export const ChangeWorkRequest: Sync = ({ request, session, work, dueDate, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/changeWork", session, work, dueDate },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    BrontoBoard.changeWork,
    { owner: user, work, dueDate },
  ]),
});

/**
 * Responds to the original request with a success status upon successful modification.
 * The `changeWork` action returns an empty object on success.
 */
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches the empty success response from the action
  ),
  then: actions([
    Requesting.respond,
    { request, status: "ok" },
  ]),
});

/**
 * Responds to the original request with an error if changing the work fails.
 */
export const ChangeWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Remove Work (Assignment)
// API Route: POST /BrontoBoard/removeWork
// =============================================================================

/**
 * When a request is made to remove an assignment, this sync authenticates the user
 * and triggers the BrontoBoard.removeWork action.
 */
export const RemoveWorkRequest: Sync = ({ request, session, work, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/removeWork", session, work },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    BrontoBoard.removeWork,
    { owner: user, work },
  ]),
});

/**
 * Responds to the original request with a success status upon successful removal.
 */
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches empty success response
  ),
  then: actions([
    Requesting.respond,
    { request, status: "ok" },
  ]),
});

/**
 * Responds to the original request with an error if removing the work fails.
 */
export const RemoveWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Add Office Hours
// API Route: POST /BrontoBoard/addOH
// =============================================================================

/**
 * When a request is made to add office hours to a class, this sync authenticates the user
 * and triggers the BrontoBoard.addOH action.
 */
export const AddOHRequest: Sync = ({ request, session, class: classId, OHTime, OHduration, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/addOH", session, class: classId, OHTime, OHduration },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    BrontoBoard.addOH,
    { owner: user, class: classId, OHTime, OHduration },
  ]),
});

/**
 * Responds with the new office hours' ID upon successful creation.
 */
export const AddOHResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions([
    Requesting.respond,
    { request, officeHours },
  ]),
});

/**
 * Responds with an error if adding office hours fails.
 */
export const AddOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// =============================================================================
// Change Office Hours
// API Route: POST /BrontoBoard/changeOH
// =============================================================================

/**
 * When a request is made to change office hours, this sync authenticates the user
 * and triggers the BrontoBoard.changeOH action.
 */
export const ChangeOHRequest: Sync = ({ request, session, oh, newDate, newduration, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/BrontoBoard/changeOH", session, oh, newDate, newduration },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions([
    BrontoBoard.changeOH,
    { owner: user, oh, newDate, newduration },
  ]),
});

/**
 * Responds with a success status upon successful modification of office hours.
 */
export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches empty success response
  ),
  then: actions([
    Requesting.respond,
    { request, status: "ok" },
  ]),
});

/**
 * Responds with an error if changing office hours fails.
 */
export const ChangeOHErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
```
