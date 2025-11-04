---
timestamp: 'Mon Nov 03 2025 20:27:13 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_202713.5fbbf705.md]]'
content_id: 259af7f5bd5e14cf8247eb91c23af7ccca2948ead33c461d31e80eeeb390818b
---

# response:

```typescript
// file: src/syncs/brontoboard.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID is a branded string type

// --- Generic Type Definitions for Destructured Variables in Syncs ---
// These types help TypeScript understand the expected types of values bound to symbols
// within the Frames object, especially within the 'where' clause.
// 'ID' refers to concept entity identifiers (User, Session, BrontoBoard, Class, Assignment, OfficeHour).
interface BrontoBoardSyncVars {
  request: ID;
  session: ID;
  user: ID; // User from Sessioning._getUser
  owner: ID; // Aliased user for BrontoBoard owner checks
  calendar: ID;
  brontoBoard: ID;
  className: string;
  overview: string;
  class: ID; // ID of a Class entity
  workName: string;
  dueDate: Date;
  assignment: ID; // ID of an Assignment entity
  work: ID; // Aliased assignment for update/delete actions
  oh: ID; // Aliased officeHours for update action
  OHTime: Date;
  OHduration: number;
  newDate: Date;
  newduration: number;
  error: string; // Generic error message
  status: string; // For success responses with no specific output
}

// ====================================================================
// 1. initializeBB (user: User, calendar: Calendar): BrontoBoard
// ====================================================================

/**
 * Sync: Handles the request to initialize a new BrontoBoard.
 * Extracts user from session and calls BrontoBoard.initializeBB.
 */
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, calendar, owner }, // Use 'owner' here as the user being extracted from session
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/initialize", session, calendar },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Ensure 'session' is an ID when querying
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner }, // Bind the user found from the session to 'owner'
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.initializeBB, { user: owner, calendar }],
  ),
});

/**
 * Sync: Responds successfully after a BrontoBoard is initialized.
 */
export const InitializeBrontoBoardResponseSuccess: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/initialize" },
      { request },
    ],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

/**
 * Sync: Responds with an error if BrontoBoard initialization fails.
 */
export const InitializeBrontoBoardResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/initialize" },
      { request },
    ],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 2. createClass (owner: User, brontoBoard: BrontoBoard, className: String, overview: String): (class: Class)
// ====================================================================

/**
 * Sync: Handles the request to create a new Class within a BrontoBoard.
 * Extracts owner from session and calls BrontoBoard.createClass.
 */
export const CreateClassRequest: Sync = (
  { request, session, brontoBoard, className, overview, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/create", session, brontoBoard, className, overview },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.createClass, { owner, brontoBoard, className, overview }],
  ),
});

/**
 * Sync: Responds successfully after a Class is created.
 */
export const CreateClassResponseSuccess: Sync = (
  { request, class: classId }, // Alias 'class' to 'classId' to avoid keyword conflict
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId }],
  ),
  then: actions(
    [Requesting.respond, { request, class: classId }],
  ),
});

/**
 * Sync: Responds with an error if Class creation fails.
 */
export const CreateClassResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 3. addWork (owner: User, class: Class, workName: String, dueDate: Date): Assignment
// ====================================================================

/**
 * Sync: Handles the request to add an Assignment to a Class.
 * Extracts owner from session and calls BrontoBoard.addWork.
 */
export const AddAssignmentRequest: Sync = (
  { request, session, class: classId, workName, dueDate, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/add", session, class: classId, workName, dueDate },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.addWork, { owner, class: classId, workName, dueDate }],
  ),
});

/**
 * Sync: Responds successfully after an Assignment is added.
 */
export const AddAssignmentResponseSuccess: Sync = (
  { request, assignment },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

/**
 * Sync: Responds with an error if Assignment addition fails.
 */
export const AddAssignmentResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 4. changeWork (owner: User, work: Assignment, dueDate: Date): ()
// ====================================================================

/**
 * Sync: Handles the request to change an Assignment's due date.
 * Extracts owner from session and calls BrontoBoard.changeWork.
 */
export const ChangeAssignmentRequest: Sync = (
  { request, session, work, dueDate, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/change", session, work, dueDate },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.changeWork, { owner, work, dueDate }],
  ),
});

/**
 * Sync: Responds successfully after an Assignment's due date is changed.
 * Note: BrontoBoard.changeWork returns Empty, so we respond with a generic success status.
 */
export const ChangeAssignmentResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Matches an action with no output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Assignment due date updated successfully." }],
  ),
});

/**
 * Sync: Responds with an error if Assignment due date change fails.
 */
export const ChangeAssignmentResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 5. removeWork (owner: User, work: Assignment): ()
// ====================================================================

/**
 * Sync: Handles the request to remove an Assignment.
 * Extracts owner from session and calls BrontoBoard.removeWork.
 */
export const RemoveAssignmentRequest: Sync = (
  { request, session, work, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/remove", session, work },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner, work }],
  ),
});

/**
 * Sync: Responds successfully after an Assignment is removed.
 * Note: BrontoBoard.removeWork returns Empty, so we respond with a generic success status.
 */
export const RemoveAssignmentResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Matches an action with no output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Assignment removed successfully." }],
  ),
});

/**
 * Sync: Responds with an error if Assignment removal fails.
 */
export const RemoveAssignmentResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 6. addOH (owner: User, class: Class, OHTime: Date, OHduration: Number): OfficeHours
// ====================================================================

/**
 * Sync: Handles the request to add Office Hours to a Class.
 * Extracts owner from session and calls BrontoBoard.addOH.
 */
export const AddOfficeHoursRequest: Sync = (
  { request, session, class: classId, OHTime, OHduration, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/officehours/add", session, class: classId, OHTime, OHduration },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.addOH, { owner, class: classId, OHTime, OHduration }],
  ),
});

/**
 * Sync: Responds successfully after Office Hours are added.
 */
export const AddOfficeHoursResponseSuccess: Sync = (
  { request, officeHours },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

/**
 * Sync: Responds with an error if Office Hours addition fails.
 */
export const AddOfficeHoursResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// ====================================================================
// 7. changeOH (owner: User, oh: OfficeHours, newDate: Date, newduration: Number): ()
// ====================================================================

/**
 * Sync: Handles the request to change Office Hours details.
 * Extracts owner from session and calls BrontoBoard.changeOH.
 */
export const ChangeOfficeHoursRequest: Sync = (
  { request, session, oh, newDate, newduration, owner },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/officehours/change", session, oh, newDate, newduration },
      { request },
    ],
  ),
  where: async (frames: Frames<keyof BrontoBoardSyncVars>) => {
    // Get the user from the session and bind it to 'owner'
    frames = await frames.query(
      Sessioning._getUser,
      { session: frames.get(session) as ID },
      { user: owner },
    );
    return frames;
  },
  then: actions(
    [BrontoBoard.changeOH, { owner, oh, newDate, newduration }],
  ),
});

/**
 * Sync: Responds successfully after Office Hours details are changed.
 * Note: BrontoBoard.changeOH returns Empty, so we respond with a generic success status.
 */
export const ChangeOfficeHoursResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Matches an action with no output
  ),
  then: actions(
    [Requesting.respond, { request, status: "Office hours updated successfully." }],
  ),
});

/**
 * Sync: Responds with an error if Office Hours details change fails.
 */
export const ChangeOfficeHoursResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
