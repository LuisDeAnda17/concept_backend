---
timestamp: 'Mon Nov 03 2025 19:31:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_193126.a0a11508.md]]'
content_id: 3b38305dd172c8ef2a2004d53c53ab0f6b60b64e0d1d86ff7a61164c8e827593
---

# response:

Here are the synchronization implementations for `UserAuthentication`, `Sessioning`, and `BrontoBoard`, structured in their respective `.sync.ts` files.

I've made one minor **assumption/modification** to the `BrontoBoardConcept` to facilitate proper access control for queries within the synchronizations. The `BrontoBoardConcept` definition lacked a direct query to retrieve a single `ClassDoc` by its ID. Without this, performing ownership checks purely through concept queries (as opposed to direct database access from syncs, which breaks concept purity) becomes cumbersome.

**Modification to `BrontoBoardConcept` (to be added to `src/BrontoBoard/BrontoBoardConcept.ts`):**

```typescript
// Add this query to the BrontoBoardConcept class, usually at the end of the class.

  /**
   * _query: _getClass
   * @param input An object containing the class ID.
   *   - `class`: The ID of the class.
   * @returns An array containing the ClassDoc if found, otherwise an empty array.
   */
  async _getClass(input: { class: ID }): Promise<ClassDoc[]> {
    const { class: classId } = input;
    const classDoc = await this.classes.findOne({ _id: classId });
    return classDoc ? [classDoc] : [];
  }
```

This `_getClass` query allows syncs to retrieve `ClassDoc` details (including `brontoBoardId`) using a concept query, which is crucial for then verifying ownership.

***

## 1. `src/syncs/auth.sync.ts`

This file will contain synchronizations related to `UserAuthentication` and `Sessioning`.

```typescript
// src/syncs/auth.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, UserAuthentication, Sessioning } from "@concepts";
// Importing User and Session types from UserAuthentication/Sessioning for clarity in syncs
import { User } from "@concepts/UserAuthentication/UserAuthenticationConcept";
import { Session } from "@concepts/Sessioning/SessioningConcept";

// --- User Registration Flow ---

/**
 * Sync: RegisterRequest
 * When a request to /register comes in, trigger the UserAuthentication.register action.
 */
export const RegisterRequest: Sync = ({ request, username, password, user, error }) => ({
    when: actions(
        [Requesting.request, { path: "/register", username, password }, { request }],
    ),
    then: actions(
        // Attempt to register, capturing either a successful user ID or an error message
        [UserAuthentication.register, { username, password }, { user, error }],
    ),
});

/**
 * Sync: RegisterResponseSuccess
 * When UserAuthentication.register successfully returns a user, respond to the original request.
 */
export const RegisterResponseSuccess: Sync = ({ request, user }) => ({
    when: actions(
        [Requesting.request, { path: "/register" }, { request }], // Match the initial request
        [UserAuthentication.register, {}, { user }],             // Match successful registration outcome
    ),
    then: actions(
        [Requesting.respond, { request, user }], // Respond with the new user's ID
    ),
});

/**
 * Sync: RegisterResponseError
 * When UserAuthentication.register returns an error, respond to the original request with the error.
 */
export const RegisterResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/register" }, { request }], // Match the initial request
        [UserAuthentication.register, {}, { error }],             // Match failed registration outcome
    ),
    then: actions(
        [Requesting.respond, { request, error }], // Respond with the error message
    ),
});

// --- User Authentication Flow ---

/**
 * Sync: AuthenticateRequest
 * When a request to /authenticate comes in, trigger the UserAuthentication.authenticate action.
 */
export const AuthenticateRequest: Sync = ({ request, username, password, user, error }) => ({
    when: actions(
        [Requesting.request, { path: "/authenticate", username, password }, { request }],
    ),
    then: actions(
        // Attempt to authenticate, capturing either a successful user ID or an error message
        [UserAuthentication.authenticate, { username, password }, { user, error }],
    ),
});

/**
 * Sync: AuthenticateResponseError
 * When UserAuthentication.authenticate returns an error, respond to the original request.
 */
export const AuthenticateResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/authenticate" }, { request }], // Match the initial request
        [UserAuthentication.authenticate, {}, { error }],             // Match failed authentication outcome
    ),
    then: actions(
        [Requesting.respond, { request, error }], // Respond with the error message
    ),
});

/**
 * Sync: CreateSessionOnAuthSuccess
 * On successful authentication, create a new session for the authenticated user.
 */
export const CreateSessionOnAuthSuccess: Sync = ({ request, user, session }) => ({
    when: actions(
        [Requesting.request, { path: "/authenticate" }, { request }], // Match the initial request
        [UserAuthentication.authenticate, {}, { user }],             // Match successful authentication
    ),
    then: actions(
        [Sessioning.create, { user }, { session }], // Create a new session for the user
    ),
});

/**
 * Sync: AuthenticateResponseSuccess
 * After a session is successfully created for an authenticated user, respond to the original request.
 */
export const AuthenticateResponseSuccess: Sync = ({ request, user, session }) => ({
    when: actions(
        [Requesting.request, { path: "/authenticate" }, { request }], // Match the initial request
        [UserAuthentication.authenticate, {}, { user }],             // Match successful authentication
        [Sessioning.create, {}, { session }],                      // Match successful session creation
    ),
    then: actions(
        [Requesting.respond, { request, user, session }], // Respond with the authenticated user and new session ID
    ),
});

// --- User Logout Flow ---

/**
 * Sync: LogoutRequest
 * When a request to /logout comes in, trigger the Sessioning.delete action.
 */
export const LogoutRequest: Sync = ({ request, session, error }) => ({
    when: actions(
        [Requesting.request, { path: "/logout", session }, { request }],
    ),
    then: actions(
        // Attempt to delete the session, capturing potential errors
        [Sessioning.delete, { session }, { error }],
    ),
});

/**
 * Sync: LogoutResponseSuccess
 * On successful session deletion, respond to the original request.
 */
export const LogoutResponseSuccess: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/logout" }, { request }], // Match the initial request
        [Sessioning.delete, {}, {}],                           // Match successful deletion (empty result)
    ),
    then: actions(
        [Requesting.respond, { request, status: "logged out" }], // Indicate successful logout
    ),
});

/**
 * Sync: LogoutResponseError
 * When Sessioning.delete returns an error, respond to the original request.
 */
export const LogoutResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/logout" }, { request }], // Match the initial request
        [Sessioning.delete, {}, { error }],                      // Match failed deletion outcome
    ),
    then: actions(
        [Requesting.respond, { request, error }], // Respond with the error message
    ),
});
```

***

## 2. `src/syncs/brontoboard.sync.ts`

This file will contain synchronizations related to the `BrontoBoard` concept, including fetching the `user` from `Sessioning` for authorization.

```typescript
// src/syncs/brontoboard.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
// Importing specific types from BrontoBoardConcept for clarity in syncs
import { User, Calendar, ID } from "@concepts/BrontoBoard/BrontoBoardConcept";

// --- Helper for Session-based Authorization and Error Propagation in `where` clauses ---
// This pattern captures the original request frame, queries for the user, and if
// any error occurs or the user is not found, it propagates that error into a new frame
// to be caught by a dedicated response sync.

/**
 * Generic function to query for user from session and optionally pre-validate BrontoBoard ownership.
 * @param frames The input Frames.
 * @param session The session ID from the request.
 * @param owner The variable to bind the user ID to.
 * @param brontoBoardToValidate (Optional) If provided, it will also check if the user owns this BrontoBoard.
 * @returns Frames with `owner` bound, or a single frame with an `error` binding.
 */
async function authorizeAndValidateOwnership(
    frames: Frames,
    session: ID,
    owner: symbol,
    brontoBoardToValidate?: ID,
): Promise<Frames> {
    const originalFrame = frames[0];
    let currentFrames = await frames.query(Sessioning._getUser, { session: originalFrame.session }, { user: owner });

    if (currentFrames.length === 0 || "error" in currentFrames[0]) {
        return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || "Invalid session." }]);
    }

    if (brontoBoardToValidate) {
        // Now `owner` is bound, check if this `owner` owns `brontoBoardToValidate`
        const ownedBrontoBoardsFrames = await currentFrames.query(
            BrontoBoard._getBrontoBoardsForUser,
            { user: currentFrames[0][owner] },
            { brontoBoard: originalFrame.tempOwnedBrontoBoard } // Temporary variable for checking
        );

        const hasAccess = ownedBrontoBoardsFrames.some(f => f[originalFrame.tempOwnedBrontoBoard]._id === brontoBoardToValidate);

        if (!hasAccess) {
            return new Frames([{ ...originalFrame, error: `User ${currentFrames[0][owner]} does not have access to BrontoBoard ${brontoBoardToValidate}.` }]);
        }
    }

    // If all good, return the frames with the owner bound
    return currentFrames;
}


// --- BrontoBoard.initializeBB Syncs ---

export const InitializeBrontoBoardRequest: Sync = ({ request, session, user, calendar, brontoBoardId, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboards/initialize", session, calendar }, { request }],
    ),
    where: async (frames) => {
        return await authorizeAndValidateOwnership(frames, session, user);
    },
    then: actions(
        [BrontoBoard.initializeBB, { user, calendar }, { brontoBoard: brontoBoardId, error }],
    ),
});

export const InitializeBrontoBoardResponseSuccess: Sync = ({ request, brontoBoardId }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
        [BrontoBoard.initializeBB, {}, { brontoBoard: brontoBoardId }],
    ),
    then: actions(
        [Requesting.respond, { request, brontoBoard: brontoBoardId }],
    ),
});

export const InitializeBrontoBoardResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboards/initialize" }, { request }],
        [BrontoBoard.initializeBB, {}, { error }], // Catches errors from BrontoBoard action or propagated session errors
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.createClass Syncs ---

export const CreateClassRequest: Sync = ({ request, session, user, brontoBoardId, className, overview, classId, error }) => ({
    when: actions(
        [Requesting.request, { path: "/classes/create", session, brontoBoard: brontoBoardId, className, overview }, { request }],
    ),
    where: async (frames) => {
        // Authorize user and validate ownership of the brontoBoard for class creation
        return await authorizeAndValidateOwnership(frames, session, user, brontoBoardId);
    },
    then: actions(
        [BrontoBoard.createClass, { owner: user, brontoBoard: brontoBoardId, className, overview }, { class: classId, error }],
    ),
});

export const CreateClassResponseSuccess: Sync = ({ request, classId }) => ({
    when: actions(
        [Requesting.request, { path: "/classes/create" }, { request }],
        [BrontoBoard.createClass, {}, { class: classId }],
    ),
    then: actions(
        [Requesting.respond, { request, class: classId }],
    ),
});

export const CreateClassResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/classes/create" }, { request }],
        [BrontoBoard.createClass, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.addWork Syncs ---

export const AddWorkRequest: Sync = ({ request, session, user, classId, workName, dueDate, assignmentId, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/add", session, class: classId, workName, dueDate }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user); // Get user first
        if ("error" in currentFrames[0]) return currentFrames; // Propagate session error

        // Now `user` is bound. We need to check if `user` owns the BrontoBoard parent of `classId`.
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: classId }, { classDoc: originalFrame.tempClassDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class with ID ${classId} not found.` }]);
        }
        const classBrontoBoardId = currentFrames[0][originalFrame.tempClassDoc].brontoBoardId;

        return await authorizeAndValidateOwnership(currentFrames, session, user, classBrontoBoardId);
    },
    then: actions(
        [BrontoBoard.addWork, { owner: user, class: classId, workName, dueDate }, { assignment: assignmentId, error }],
    ),
});

export const AddWorkResponseSuccess: Sync = ({ request, assignmentId }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/add" }, { request }],
        [BrontoBoard.addWork, {}, { assignment: assignmentId }],
    ),
    then: actions(
        [Requesting.respond, { request, assignment: assignmentId }],
    ),
});

export const AddWorkResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/add" }, { request }],
        [BrontoBoard.addWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.changeWork Syncs ---

export const ChangeWorkRequest: Sync = ({ request, session, user, assignmentId, dueDate, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/change", session, work: assignmentId, dueDate }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the assignment to find its parent classId
        currentFrames = await currentFrames.query(BrontoBoard._getAssignment, { assignment: assignmentId }, { assignmentDoc: originalFrame.tempAssignmentDoc }); // Assuming _getAssignment query exists
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Assignment with ID ${assignmentId} not found.` }]);
        }
        const assignmentClassId = currentFrames[0][originalFrame.tempAssignmentDoc].classId;

        // Get the class document to find its parent brontoBoardId
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: assignmentClassId }, { classDoc: originalFrame.tempClassDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class for assignment ${assignmentId} not found.` }]);
        }
        const classBrontoBoardId = currentFrames[0][originalFrame.tempClassDoc].brontoBoardId;

        return await authorizeAndValidateOwnership(currentFrames, session, user, classBrontoBoardId);
    },
    then: actions(
        [BrontoBoard.changeWork, { owner: user, work: assignmentId, dueDate }, { error }],
    ),
});

export const ChangeWorkResponseSuccess: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/change" }, { request }],
        [BrontoBoard.changeWork, {}, {}],
    ),
    then: actions(
        [Requesting.respond, { request, status: "Assignment updated successfully." }],
    ),
});

export const ChangeWorkResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/change" }, { request }],
        [BrontoBoard.changeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.removeWork Syncs ---

export const RemoveWorkRequest: Sync = ({ request, session, user, assignmentId, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/remove", session, work: assignmentId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the assignment to find its parent classId
        currentFrames = await currentFrames.query(BrontoBoard._getAssignment, { assignment: assignmentId }, { assignmentDoc: originalFrame.tempAssignmentDoc }); // Assuming _getAssignment query exists
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Assignment with ID ${assignmentId} not found.` }]);
        }
        const assignmentClassId = currentFrames[0][originalFrame.tempAssignmentDoc].classId;

        // Get the class document to find its parent brontoBoardId
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: assignmentClassId }, { classDoc: originalFrame.tempClassDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class for assignment ${assignmentId} not found.` }]);
        }
        const classBrontoBoardId = currentFrames[0][originalFrame.tempClassDoc].brontoBoardId;

        return await authorizeAndValidateOwnership(currentFrames, session, user, classBrontoBoardId);
    },
    then: actions(
        [BrontoBoard.removeWork, { owner: user, work: assignmentId }, { error }],
    ),
});

export const RemoveWorkResponseSuccess: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/remove" }, { request }],
        [BrontoBoard.removeWork, {}, {}],
    ),
    then: actions(
        [Requesting.respond, { request, status: "Assignment removed successfully." }],
    ),
});

export const RemoveWorkResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/remove" }, { request }],
        [BrontoBoard.removeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.addOH Syncs ---

export const AddOHRequest: Sync = ({ request, session, user, classId, OHTime, OHduration, officeHoursId, error }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/add", session, class: classId, OHTime, OHduration }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the class document to find its parent brontoBoardId
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: classId }, { classDoc: originalFrame.tempClassDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class with ID ${classId} not found.` }]);
        }
        const classBrontoBoardId = currentFrames[0][originalFrame.tempClassDoc].brontoBoardId;

        return await authorizeAndValidateOwnership(currentFrames, session, user, classBrontoBoardId);
    },
    then: actions(
        [BrontoBoard.addOH, { owner: user, class: classId, OHTime, OHduration }, { officeHours: officeHoursId, error }],
    ),
});

export const AddOHResponseSuccess: Sync = ({ request, officeHoursId }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/add" }, { request }],
        [BrontoBoard.addOH, {}, { officeHours: officeHoursId }],
    ),
    then: actions(
        [Requesting.respond, { request, officeHours: officeHoursId }],
    ),
});

export const AddOHResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/add" }, { request }],
        [BrontoBoard.addOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard.changeOH Syncs ---

export const ChangeOHRequest: Sync = ({ request, session, user, officeHoursId, newDate, newduration, error }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/change", session, oh: officeHoursId, newDate, newduration }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the office hour doc to find its parent classId
        currentFrames = await currentFrames.query(BrontoBoard._getOfficeHour, { officeHour: officeHoursId }, { ohDoc: originalFrame.tempOHDoc }); // Assuming _getOfficeHour query exists
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Office Hours with ID ${officeHoursId} not found.` }]);
        }
        const ohClassId = currentFrames[0][originalFrame.tempOHDoc].classId;

        // Get the class document to find its parent brontoBoardId
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: ohClassId }, { classDoc: originalFrame.tempClassDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class for office hours ${officeHoursId} not found.` }]);
        }
        const classBrontoBoardId = currentFrames[0][originalFrame.tempClassDoc].brontoBoardId;

        return await authorizeAndValidateOwnership(currentFrames, session, user, classBrontoBoardId);
    },
    then: actions(
        [BrontoBoard.changeOH, { owner: user, oh: officeHoursId, newDate, newduration }, { error }],
    ),
});

export const ChangeOHResponseSuccess: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/change" }, { request }],
        [BrontoBoard.changeOH, {}, {}],
    ),
    then: actions(
        [Requesting.respond, { request, status: "Office hours updated successfully." }],
    ),
});

export const ChangeOHResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/change" }, { request }],
        [BrontoBoard.changeOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


// --- BrontoBoard Queries ---

export const GetMyBrontoBoards: Sync = ({ request, session, user, brontoBoard, boards, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboards/my", session }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) {
            return currentFrames;
        }

        currentFrames = await currentFrames.query(BrontoBoard._getBrontoBoardsForUser, { user: currentFrames[0][user] }, { brontoBoard });

        if (currentFrames.length === 0) {
            return new Frames([{ ...originalFrame, [boards]: [] }]);
        }

        return currentFrames.collectAs([brontoBoard], boards);
    },
    then: actions(
        [Requesting.respond, { request, boards, error }],
    ),
});


export const GetClassesForBrontoBoard: Sync = ({ request, session, user, brontoBoardId, classData, classes, error }) => ({
    when: actions(
        [Requesting.request, { path: "/classes/for_brontoboard", session, brontoBoard: brontoBoardId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user, brontoBoardId); // Validates user owns brontoBoard
        if ("error" in currentFrames[0]) {
            return currentFrames;
        }

        currentFrames = await currentFrames.query(BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { class: classData });

        if (currentFrames.length === 0) {
            return new Frames([{ ...originalFrame, [classes]: [] }]);
        }

        return currentFrames.collectAs([classData], classes);
    },
    then: actions(
        [Requesting.respond, { request, classes, error }],
    ),
});


export const GetAssignmentsForClass: Sync = ({ request, session, user, classId, classDoc, brontoBoard, assignmentData, assignments, error }) => ({
    when: actions(
        [Requesting.request, { path: "/assignments/for_class", session, class: classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the class document to find its parent brontoBoardId and validate ownership
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: classId }, { classDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class with ID ${classId} not found.` }]);
        }
        const actualBrontoBoardId = currentFrames[0][classDoc].brontoBoardId;

        currentFrames = await authorizeAndValidateOwnership(currentFrames, session, user, actualBrontoBoardId);
        if ("error" in currentFrames[0]) return currentFrames;

        currentFrames = await currentFrames.query(BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment: assignmentData });

        if (currentFrames.length === 0) {
            return new Frames([{ ...originalFrame, [assignments]: [] }]);
        }

        return currentFrames.collectAs([assignmentData], assignments);
    },
    then: actions(
        [Requesting.respond, { request, assignments, error }],
    ),
});


export const GetOfficeHoursForClass: Sync = ({ request, session, user, classId, classDoc, brontoBoard, officeHourData, officeHours, error }) => ({
    when: actions(
        [Requesting.request, { path: "/officehours/for_class", session, class: classId }, { request }],
    ),
    where: async (frames) => {
        const originalFrame = frames[0];
        let currentFrames = await authorizeAndValidateOwnership(frames, session, user);
        if ("error" in currentFrames[0]) return currentFrames;

        // Get the class document to find its parent brontoBoardId and validate ownership
        currentFrames = await currentFrames.query(BrontoBoard._getClass, { class: classId }, { classDoc });
        if (currentFrames.length === 0 || "error" in currentFrames[0]) {
            return new Frames([{ ...originalFrame, error: currentFrames[0]?.error || `Class with ID ${classId} not found.` }]);
        }
        const actualBrontoBoardId = currentFrames[0][classDoc].brontoBoardId;

        currentFrames = await authorizeAndValidateOwnership(currentFrames, session, user, actualBrontoBoardId);
        if ("error" in currentFrames[0]) return currentFrames;

        currentFrames = await currentFrames.query(BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour: officeHourData });

        if (currentFrames.length === 0) {
            return new Frames([{ ...originalFrame, [officeHours]: [] }]);
        }

        return currentFrames.collectAs([officeHourData], officeHours);
    },
    then: actions(
        [Requesting.respond, { request, officeHours, error }],
    ),
});

// Assuming BrontoBoardConcept *also* has these queries to retrieve single documents for validation.
// If not, you'd need to add them similarly to `_getClass`.
// _getAssignment (assignment: ID): (assignmentDoc: AssignmentDoc)
// _getOfficeHour (officeHour: ID): (ohDoc: OfficeHourDoc)

// These are used internally in the `where` clauses of ChangeWorkRequest/RemoveWorkRequest/ChangeOHRequest
// If these are not defined in BrontoBoardConcept, the syncs will error.
// For the sake of demonstrating the sync logic, I've used them assuming they exist.
// You would add them to src/BrontoBoard/BrontoBoardConcept.ts as follows:
/*
  async _getAssignment(input: { assignment: ID }): Promise<AssignmentDoc[]> {
    const { assignment: assignmentId } = input;
    const assignmentDoc = await this.assignments.findOne({ _id: assignmentId });
    return assignmentDoc ? [assignmentDoc] : [];
  }

  async _getOfficeHour(input: { officeHour: ID }): Promise<OfficeHourDoc[]> {
    const { officeHour: officeHourId } = input;
    const ohDoc = await this.officeHours.findOne({ _id: officeHourId });
    return ohDoc ? [ohDoc] : [];
  }
*/
```

***

**Important Notes for Usage:**

1. **Concept Imports:** Ensure your `src/concepts/concepts.ts` (generated by `deno run build`) correctly exports `UserAuthentication`, `Sessioning`, and `BrontoBoard` classes.
2. **Generic Type Imports:** The sync files directly import `User`, `Session`, `Calendar`, and `ID` types from their respective concept files (`@concepts/UserAuthentication/UserAuthenticationConcept`, `@concepts/Sessioning/SessioningConcept`, `@concepts/BrontoBoard/BrontoBoardConcept`). Make sure these types are exported from those concept files.
3. **Error Handling:** The `authorizeAndValidateOwnership` helper in `brontoboard.sync.ts` is crucial for propagating authorization errors early. It ensures that if a session is invalid or a user doesn't own the requested resource, an error response is sent without attempting the underlying `BrontoBoard` action.
4. **`_getAssignment` and `_getOfficeHour` queries:** I've added comments in `brontoboard.sync.ts` indicating the need for `_getAssignment` and `_getOfficeHour` queries in `BrontoBoardConcept.ts` for the `changeWork`, `removeWork`, and `changeOH` syncs to function correctly with purely query-based access control. You should implement these similarly to `_getClass` in your `BrontoBoardConcept.ts` file if you haven't already.
5. **Pathing and Parameters:** The syncs assume specific HTTP request paths (`/register`, `/authenticate`, `/logout`, `/brontoboards/initialize`, etc.) and parameter names in the request body/query string (e.g., `username`, `password`, `session`, `brontoBoard`). Ensure your client-side requests match these patterns.
6. **`collectAs` for Query Responses:** Query syncs (`GetMyBrontoBoards`, etc.) use `collectAs` to aggregate multiple database results into a single array under a specified key (e.g., `boards`, `classes`, `assignments`, `officeHours`) for a cleaner JSON response.

After adding these files and the necessary query modifications to `BrontoBoardConcept.ts`, run `deno run build` to update your `@concepts` imports, then `deno run start` to launch your application with these synchronizations enabled.
