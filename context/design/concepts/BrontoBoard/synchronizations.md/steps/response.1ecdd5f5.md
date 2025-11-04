---
timestamp: 'Mon Nov 03 2025 15:34:11 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_153411.e5ec33f1.md]]'
content_id: 1ecdd5f5678130002a71575114ef2edc8389ea18542c80923f6fe24d357199c6
---

# response:

Here are the synchronizations for the `BrontoBoard` concept, placed in a `src/syncs/brontoboard.sync.ts` file. These syncs handle incoming `Requesting.request` actions, authorize them using a hypothetical `Sessioning` concept, trigger the `BrontoBoard` concept's actions or queries, and then respond via `Requesting.respond`.

**Note:**

* It's assumed a `Sessioning` concept exists with a query `Sessioning._getUser(session: ID): (user: ID)` that returns a user ID for a valid session, or an empty result set if the session is invalid.
* The `BrontoBoardConcept.ts` file has been updated with a new query `_getClassById` to support class ownership checks in `GET` requests.
* A general `RespondToWhereError` sync is included to catch errors originating directly from `where` clauses (e.g., authentication failures).

First, the necessary addition to `src/concepts/BrontoBoard/BrontoBoardConcept.ts`:

```typescript
// file: src/concepts/BrontoBoard/BrontoBoardConcept.ts
// ... (existing imports and interfaces)

export default class BrontoBoardConcept {
  // ... (existing properties and constructor)

  // ... (existing action methods)

  // --- Concept Queries ---
  // ... (existing query methods)

  /**
   * _query: _getClassById
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array containing the ClassDoc if found, otherwise an empty array.
   */
  async _getClassById(input: { class: ID }): Promise<ClassDoc[]> {
    const { class: classId } = input;
    const classDoc = await this.classes.findOne({ _id: classId });
    return classDoc ? [classDoc] : [];
  }
}
```

Now, the synchronizations:

```typescript
// file: src/syncs/brontoboard.sync.ts

import { actions, Sync, Frames } from "@engine";
// Assuming Requesting and Sessioning are available under @concepts
import { Requesting, Sessioning } from "@concepts";
// Import the BrontoBoard concept
import BrontoBoard from "@concepts/BrontoBoard/BrontoBoardConcept.ts";

// --- Generic Error Handling for Where Clause Failures ---
// This sync catches any Requesting.request that had an 'error' binding added
// during its `where` clause execution (e.g., failed session lookup).
export const RespondToWhereError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, {}, { request, error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 1. BrontoBoard Initialization ---

// Triggers BrontoBoard.initializeBB upon receiving an HTTP request.
export const InitializeBBRequest: Sync = ({ request, session, user, calendar, brontoBoard, error }) => ({
    when: actions(
        [Requesting.request, { method: "POST", path: "/brontoboard/init", session, calendar }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0]; // Capture original request and its variables

        // Authorize: Get the user from the session
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });

        if (sessionFrames.length === 0) {
            // Session is invalid, create a new frame with an error for Requesting.respond
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames; // If session is valid, proceed with the user binding
    },
    then: actions(
        // This will only fire if `where` clause produced valid frames (i.e., user was found).
        // If `where` produced an error frame, the `RespondToWhereError` sync will handle it.
        [BrontoBoard.initializeBB, { user, calendar }, { brontoBoard, error }],
    ),
});

// Handles successful BrontoBoard.initializeBB action and responds to the HTTP request.
export const InitializeBBResponse: Sync = ({ request, brontoBoard }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/init" }, { request }],
        [BrontoBoard.initializeBB, {}, { brontoBoard }], // Matches successful action output
    ),
    then: actions(
        [Requesting.respond, { request, brontoBoard }],
    ),
});

// Handles errors returned by BrontoBoard.initializeBB action and responds to the HTTP request.
export const InitializeBBErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/init" }, { request }],
        [BrontoBoard.initializeBB, {}, { error }], // Matches error action output
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 2. Create Class ---

export const CreateClassRequest: Sync = ({ request, session, user, brontoBoardId, className, overview, class: classId, error }) => ({
    when: actions(
        [Requesting.request, { method: "POST", path: "/brontoboard/:brontoBoardId/class/create", session, className, overview, brontoBoardId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        [BrontoBoard.createClass, { owner: user, brontoBoard: brontoBoardId, className, overview }, { class: classId, error }],
    ),
});

export const CreateClassResponse: Sync = ({ request, class: classId }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/create" }, { request }],
        [BrontoBoard.createClass, {}, { class: classId }],
    ),
    then: actions(
        [Requesting.respond, { request, class: classId }],
    ),
});

export const CreateClassErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/create" }, { request }],
        [BrontoBoard.createClass, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 3. Add Work (Assignment) ---

export const AddWorkRequest: Sync = ({ request, session, user, classId, workName, dueDate, assignment, error }) => ({
    when: actions(
        [Requesting.request, { method: "POST", path: "/brontoboard/class/:classId/assignment/add", session, workName, dueDate, classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        // Assuming dueDate comes as a string and needs conversion to Date object
        [BrontoBoard.addWork, { owner: user, class: classId, workName, dueDate: new Date(dueDate) }, { assignment, error }],
    ),
});

export const AddWorkResponse: Sync = ({ request, assignment }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/class/:classId/assignment/add" }, { request }],
        [BrontoBoard.addWork, {}, { assignment }],
    ),
    then: actions(
        [Requesting.respond, { request, assignment }],
    ),
});

export const AddWorkErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/class/:classId/assignment/add" }, { request }],
        [BrontoBoard.addWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 4. Change Work (Assignment Due Date) ---

export const ChangeWorkRequest: Sync = ({ request, session, user, assignmentId, dueDate, error }) => ({
    when: actions(
        [Requesting.request, { method: "PUT", path: "/brontoboard/assignment/:assignmentId/change-date", session, dueDate, assignmentId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        [BrontoBoard.changeWork, { owner: user, work: assignmentId, dueDate: new Date(dueDate) }, { error }],
    ),
});

export const ChangeWorkResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/assignment/:assignmentId/change-date" }, { request }],
        [BrontoBoard.changeWork, {}, {}], // No specific return on success for Empty type
    ),
    then: actions(
        [Requesting.respond, { request, message: "Assignment due date updated successfully." }],
    ),
});

export const ChangeWorkErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/assignment/:assignmentId/change-date" }, { request }],
        [BrontoBoard.changeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 5. Remove Work (Assignment) ---

export const RemoveWorkRequest: Sync = ({ request, session, user, assignmentId, error }) => ({
    when: actions(
        [Requesting.request, { method: "DELETE", path: "/brontoboard/assignment/:assignmentId", session, assignmentId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        [BrontoBoard.removeWork, { owner: user, work: assignmentId }, { error }],
    ),
});

export const RemoveWorkResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { method: "DELETE", path: "/brontoboard/assignment/:assignmentId" }, { request }],
        [BrontoBoard.removeWork, {}, {}], // No specific return on success for Empty type
    ),
    then: actions(
        [Requesting.respond, { request, message: "Assignment removed successfully." }],
    ),
});

export const RemoveWorkErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { method: "DELETE", path: "/brontoboard/assignment/:assignmentId" }, { request }],
        [BrontoBoard.removeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 6. Add Office Hours ---

export const AddOHRequest: Sync = ({ request, session, user, classId, OHTime, OHduration, officeHours, error }) => ({
    when: actions(
        [Requesting.request, { method: "POST", path: "/brontoboard/class/:classId/office-hours/add", session, OHTime, OHduration, classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        // Assuming OHTime comes as a string and needs conversion to Date object
        [BrontoBoard.addOH, { owner: user, class: classId, OHTime: new Date(OHTime), OHduration }, { officeHours, error }],
    ),
});

export const AddOHResponse: Sync = ({ request, officeHours }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/class/:classId/office-hours/add" }, { request }],
        [BrontoBoard.addOH, {}, { officeHours }],
    ),
    then: actions(
        [Requesting.respond, { request, officeHours }],
    ),
});

export const AddOHErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/class/:classId/office-hours/add" }, { request }],
        [BrontoBoard.addOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 7. Change Office Hours ---

export const ChangeOHRequest: Sync = ({ request, session, user, officeHoursId, newDate, newduration, error }) => ({
    when: actions(
        [Requesting.request, { method: "PUT", path: "/brontoboard/office-hours/:officeHoursId/change", session, newDate, newduration, officeHoursId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }
        return sessionFrames;
    },
    then: actions(
        [BrontoBoard.changeOH, { owner: user, oh: officeHoursId, newDate: new Date(newDate), newduration }, { error }],
    ),
});

export const ChangeOHResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/office-hours/:officeHoursId/change" }, { request }],
        [BrontoBoard.changeOH, {}, {}], // No specific return on success for Empty type
    ),
    then: actions(
        [Requesting.respond, { request, message: "Office hours updated successfully." }],
    ),
});

export const ChangeOHErrorResponse: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/office-hours/:officeHoursId/change" }, { request }],
        [BrontoBoard.changeOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// --- 8. Get Classes for BrontoBoard (Query) ---

export const GetClassesForBrontoBoardRequest: Sync = ({ request, session, user, brontoBoardId, classes, error, results }) => ({
    when: actions(
        [Requesting.request, { method: "GET", path: "/brontoboard/:brontoBoardId/classes", session, brontoBoardId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }

        // Verify user owns the BrontoBoard
        const ownedBoards = await sessionFrames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard: brontoBoardId });
        if (ownedBoards.length === 0) {
            return new Frames({ ...originalFrame, error: "Access Denied: BrontoBoard not found or not owned by user." });
        }

        // Query for classes associated with the owned BrontoBoard
        let resultFrames = await ownedBoards.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { class: classes });

        if (resultFrames.length === 0) {
            // No classes found for the owned BrontoBoard. Return an empty array.
            return new Frames({ ...originalFrame, results: [] });
        }

        // Collect all 'class' bindings into a 'results' array
        return resultFrames.collectAs([classes], results);
    },
    then: actions(
        [Requesting.respond, { request, results, error }],
    ),
});

// --- 9. Get Assignments for Class (Query) ---

export const GetAssignmentsForClassRequest: Sync = ({ request, session, user, classId, assignment, error, results }) => ({
    when: actions(
        [Requesting.request, { method: "GET", path: "/brontoboard/class/:classId/assignments", session, classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }

        // Verify user owns the BrontoBoard that contains this class
        const classDocs = await sessionFrames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: classId });
        if (classDocs.length === 0) {
            return new Frames({ ...originalFrame, error: "Class not found." });
        }
        
        // Extract brontoBoardId from the fetched class document
        const brontoBoardIdForClass = classDocs[0][classId].brontoBoardId;
        const ownedBoards = await sessionFrames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard: brontoBoardIdForClass });
        if (ownedBoards.length === 0) {
            return new Frames({ ...originalFrame, error: "Access Denied: Class not owned by user." });
        }

        // Query for assignments associated with the owned class
        let resultFrames = await ownedBoards.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment });

        if (resultFrames.length === 0) {
            // No assignments found for the owned class. Return an empty array.
            return new Frames({ ...originalFrame, results: [] });
        }

        // Collect all 'assignment' bindings into a 'results' array
        return resultFrames.collectAs([assignment], results);
    },
    then: actions(
        [Requesting.respond, { request, results, error }],
    ),
});

// --- 10. Get Office Hours for Class (Query) ---

export const GetOfficeHoursForClassRequest: Sync = ({ request, session, user, classId, officeHour, error, results }) => ({
    when: actions(
        [Requesting.request, { method: "GET", path: "/brontoboard/class/:classId/office-hours", session, classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }

        // Verify user owns the BrontoBoard that contains this class
        const classDocs = await sessionFrames.query(BrontoBoard._getClassById, { class: classId }, { classDoc: classId });
        if (classDocs.length === 0) {
            return new Frames({ ...originalFrame, error: "Class not found." });
        }
        
        // Extract brontoBoardId from the fetched class document
        const brontoBoardIdForClass = classDocs[0][classId].brontoBoardId;
        const ownedBoards = await sessionFrames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard: brontoBoardIdForClass });
        if (ownedBoards.length === 0) {
            return new Frames({ ...originalFrame, error: "Access Denied: Class not owned by user." });
        }

        // Query for office hours associated with the owned class
        let resultFrames = await ownedBoards.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour });

        if (resultFrames.length === 0) {
            // No office hours found for the owned class. Return an empty array.
            return new Frames({ ...originalFrame, results: [] });
        }

        // Collect all 'officeHour' bindings into a 'results' array
        return resultFrames.collectAs([officeHour], results);
    },
    then: actions(
        [Requesting.respond, { request, results, error }],
    ),
});

// --- 11. Get My BrontoBoards (Query) ---

export const GetMyBrontoBoardsRequest: Sync = ({ request, session, user, brontoBoard, error, results }) => ({
    when: actions(
        [Requesting.request, { method: "GET", path: "/brontoboard/my-boards", session }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (sessionFrames.length === 0) {
            return new Frames({ ...originalFrame, error: "Authentication required: Invalid session." });
        }

        // Query for all BrontoBoards owned by the authenticated user
        let resultFrames = await sessionFrames.query(BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard });

        if (resultFrames.length === 0) {
            // No BrontoBoards found for the user. Return an empty array.
            return new Frames({ ...originalFrame, results: [] });
        }

        // Collect all 'brontoBoard' bindings (full BrontoBoardDoc objects) into a 'results' array
        return resultFrames.collectAs([brontoBoard], results);
    },
    then: actions(
        [Requesting.respond, { request, results, error }],
    ),
});
```
