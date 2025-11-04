---
timestamp: 'Mon Nov 03 2025 20:41:03 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_204103.988729e9.md]]'
content_id: 0ecd93ec3ddb1d3e514c83fe8bf57e84dd2f638885182d388f7dff2ba032d3fa
---

# response:

Here's the TypeScript code for the synchronizations (`.sync.ts` file) that implement the getter functions for the `BrontoBoard` concept, including authorization via the `Sessioning` concept and robust error handling.

This file assumes the `BrontoBoardConcept` and `SessioningConcept` are correctly implemented as per the previous steps and that `@concepts` is set up to import them.

```typescript
// file: src/syncs/brontoboard_getters.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts"; // Assuming BrontoBoard concept is exported
import { ID } from "@utils/types.ts";

// =========================================================================
// 1. Define Symbols for consistent access to frame bindings
//    These are used as variable names in the sync destructuring and in frames.
// =========================================================================

const requestSym = Symbol("request"); // Represents the Requesting.request object
const sessionSym = Symbol("session"); // Represents the session ID from the request
const userSym = Symbol("user");       // Represents the authenticated user ID

// Symbols for URL path parameters captured by Requesting
const brontoBoardIdPathParamSym = Symbol("brontoBoardId");
const classIdPathParamSym = Symbol("classId");
const assignmentIdPathParamSym = Symbol("assignmentId");
const officeHourIdPathParamSym = Symbol("officeHourId");

// Symbols for specific results returned to the HTTP caller
const brontoBoardResultSym = Symbol("brontoBoard"); // For a single BrontoBoard object
const classResultSym = Symbol("class");             // For a single Class object
const assignmentResultSym = Symbol("assignment");   // For a single Assignment object
const officeHourResultSym = Symbol("officeHour");   // For a single OfficeHour object
const listResultsSym = Symbol("results");           // For arrays of results (e.g., list of assignments)
const errorSym = Symbol("error");                   // For error messages

// =========================================================================
// 2. Re-declare relevant concept types for clarity and type safety within syncs
// =========================================================================

// These interfaces mirror the internal document structures of the BrontoBoard concept
// and are used for type checking when accessing properties like 'owner' or 'brontoBoardId'.
type User = ID;
type Session = ID;
type BrontoBoardId = ID;
type ClassId = ID;
type AssignmentId = ID;
type OfficeHourId = ID;

interface BrontoBoardDoc {
    _id: BrontoBoardId;
    owner: User;
    calendar: ID;
}

interface ClassDoc {
    _id: ClassId;
    brontoBoardId: BrontoBoardId;
    name: string;
    overview: string;
}

interface AssignmentDoc {
    _id: AssignmentId;
    classId: ClassId;
    name: string;
    dueDate: Date;
}

interface OfficeHourDoc {
    _id: OfficeHourId;
    classId: ClassId;
    startTime: Date;
    duration: number;
}

// =========================================================================
// 3. Helper Function for Centralized Authorization and Query Logic
//    This function processes a single request frame, performs all necessary
//    authorization and database queries, and returns a Frames object containing
//    either the successful results or an error message.
// =========================================================================

async function handleBrontoBoardGetRequest(
    initialFrame: Record<symbol, unknown>,
): Promise<Frames> {
    const frame = { ...initialFrame }; // Create a mutable copy of the initial frame bindings

    // 1. Validate session ID from the incoming request
    const sessionId = frame[sessionSym] as Session;
    if (!sessionId) {
        return new Frames({ ...frame, [errorSym]: "Session ID is required." });
    }

    try {
        // 2. Authenticate user from session
        const userResult = await Sessioning._getUser({ session: sessionId });
        if ("error" in userResult) {
            throw new Error(userResult.error); // Propagate Sessioning concept's error
        }
        const authorizedUser: User = userResult.user;
        frame[userSym] = authorizedUser; // Add the authorized user to the frame

        const requestPath = frame.path as string; // The full request path from Requesting.request

        // 3. Process request based on the path and perform authorization/queries
        switch (requestPath) {
            case "/brontoboards/my": {
                // Get all BrontoBoards for the authorized user
                const queryResult = await BrontoBoard._getBrontoBoardsForUser({ user: authorizedUser });
                if ("error" in queryResult) throw new Error(queryResult.error);
                frame[listResultsSym] = queryResult; // List of BrontoBoards
                break;
            }
            case `/brontoboards/${frame[brontoBoardIdPathParamSym]}`: {
                // Get a specific BrontoBoard by ID
                const requestedBrontoBoardId = frame[brontoBoardIdPathParamSym] as BrontoBoardId;
                if (!requestedBrontoBoardId) throw new Error("BrontoBoard ID is missing from path.");

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: requestedBrontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0) throw new Error(`BrontoBoard '${requestedBrontoBoardId}' not found.`);

                const brontoBoardDoc = brontoBoardDocs[0] as BrontoBoardDoc;
                if (brontoBoardDoc.owner !== authorizedUser) throw new Error("Unauthorized: User does not own this BrontoBoard.");
                frame[brontoBoardResultSym] = brontoBoardDoc; // Single BrontoBoard object
                break;
            }
            case `/classes/${frame[classIdPathParamSym]}/assignments`: {
                // Get assignments for a specific class
                const requestedClassId = frame[classIdPathParamSym] as ClassId;
                if (!requestedClassId) throw new Error("Class ID is missing from path.");

                // Check class existence and ownership of its parent BrontoBoard
                const classAuthCheck = await BrontoBoard._getClassById({ class: requestedClassId });
                if ("error" in classAuthCheck) throw new Error(classAuthCheck.error);
                if (classAuthCheck.length === 0) throw new Error(`Class '${requestedClassId}' not found.`);
                const classDoc = classAuthCheck[0] as ClassDoc;

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== authorizedUser) {
                    throw new Error("Unauthorized: User does not own this class's BrontoBoard.");
                }

                const queryResult = await BrontoBoard._getAssignmentsForClass({ class: requestedClassId });
                if ("error" in queryResult) throw new Error(queryResult.error);
                frame[listResultsSym] = queryResult; // List of assignments
                break;
            }
            case `/classes/${frame[classIdPathParamSym]}/officehours`: {
                // Get office hours for a specific class
                const requestedClassId = frame[classIdPathParamSym] as ClassId;
                if (!requestedClassId) throw new Error("Class ID is missing from path.");

                // Check class existence and ownership of its parent BrontoBoard
                const classAuthCheck = await BrontoBoard._getClassById({ class: requestedClassId });
                if ("error" in classAuthCheck) throw new Error(classAuthCheck.error);
                if (classAuthCheck.length === 0) throw new Error(`Class '${requestedClassId}' not found.`);
                const classDoc = classAuthCheck[0] as ClassDoc;

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== authorizedUser) {
                    throw new Error("Unauthorized: User does not own this class's BrontoBoard.");
                }

                const queryResult = await BrontoBoard._getOfficeHoursForClass({ class: requestedClassId });
                if ("error" in queryResult) throw new Error(queryResult.error);
                frame[listResultsSym] = queryResult; // List of office hours
                break;
            }
            case `/classes/${frame[classIdPathParamSym]}`: {
                // Get a specific class by ID
                const requestedClassId = frame[classIdPathParamSym] as ClassId;
                if (!requestedClassId) throw new Error("Class ID is missing from path.");

                // Check class existence and ownership of its parent BrontoBoard
                const classAuthCheck = await BrontoBoard._getClassById({ class: requestedClassId });
                if ("error" in classAuthCheck) throw new Error(classAuthCheck.error);
                if (classAuthCheck.length === 0) throw new Error(`Class '${requestedClassId}' not found.`);
                const classDoc = classAuthCheck[0] as ClassDoc;

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== authorizedUser) {
                    throw new Error("Unauthorized: User does not own this class's BrontoBoard.");
                }
                frame[classResultSym] = classDoc; // Single class object
                break;
            }
            case `/assignments/${frame[assignmentIdPathParamSym]}`: {
                // Get a specific assignment by ID
                const requestedAssignmentId = frame[assignmentIdPathParamSym] as AssignmentId;
                if (!requestedAssignmentId) throw new Error("Assignment ID is missing from path.");

                // Check assignment existence and ownership chain (Assignment -> Class -> BrontoBoard)
                const assignmentAuthCheck = await BrontoBoard._getAssignmentById({ assignment: requestedAssignmentId });
                if ("error" in assignmentAuthCheck) throw new Error(assignmentAuthCheck.error);
                if (assignmentAuthCheck.length === 0) throw new Error(`Assignment '${requestedAssignmentId}' not found.`);
                const assignmentDoc = assignmentAuthCheck[0] as AssignmentDoc;

                const classAuthCheck = await BrontoBoard._getClassById({ class: assignmentDoc.classId });
                if ("error" in classAuthCheck) throw new Error(classAuthCheck.error);
                if (classAuthCheck.length === 0) throw new Error(`Class for assignment '${requestedAssignmentId}' not found.`);
                const classDoc = classAuthCheck[0] as ClassDoc;

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== authorizedUser) {
                    throw new Error("Unauthorized: User does not own this assignment's BrontoBoard.");
                }
                frame[assignmentResultSym] = assignmentDoc; // Single assignment object
                break;
            }
            case `/officehours/${frame[officeHourIdPathParamSym]}`: {
                // Get specific office hours by ID
                const requestedOfficeHourId = frame[officeHourIdPathParamSym] as OfficeHourId;
                if (!requestedOfficeHourId) throw new Error("Office Hour ID is missing from path.");

                // Check office hour existence and ownership chain (OfficeHour -> Class -> BrontoBoard)
                const officeHourAuthCheck = await BrontoBoard._getOfficeHourById({ officeHour: requestedOfficeHourId });
                if ("error" in officeHourAuthCheck) throw new Error(officeHourAuthCheck.error);
                if (officeHourAuthCheck.length === 0) throw new Error(`Office Hour '${requestedOfficeHourId}' not found.`);
                const officeHourDoc = officeHourAuthCheck[0] as OfficeHourDoc;

                const classAuthCheck = await BrontoBoard._getClassById({ class: officeHourDoc.classId });
                if ("error" in classAuthCheck) throw new Error(classAuthCheck.error);
                if (classAuthCheck.length === 0) throw new Error(`Class for office hour '${requestedOfficeHourId}' not found.`);
                const classDoc = classAuthCheck[0] as ClassDoc;

                const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId });
                if ("error" in brontoBoardDocs) throw new Error(brontoBoardDocs.error);
                if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== authorizedUser) {
                    throw new Error("Unauthorized: User does not own this office hour's BrontoBoard.");
                }
                frame[officeHourResultSym] = officeHourDoc; // Single office hour object
                break;
            }
            default:
                throw new Error(`Unhandled request path: ${requestPath}`);
        }
    } catch (e: any) {
        // If any error (authorization, not found, concept error, unexpected) occurs, add it to the frame
        frame[errorSym] = e.message || "An unexpected error occurred during request processing.";
    }

    return new Frames(frame); // Always return a single frame, enriched with either results or an error
}

// =========================================================================
// 4. Synchronization Declarations for Each Getter Endpoint
//    Each endpoint requires two syncs: one for successful responses and one for errors.
//    They both execute the same `handleBrontoBoardGetRequest` in their `where` clause
//    and then filter based on the presence of the `errorSym` binding.
// =========================================================================

// --- GET /brontoboards/my ---

export const GetMyBrontoBoardsSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [listResultsSym]: results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/my", session: sessionSym }, { request: requestSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]); // Keep frames without an error
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, results: listResultsSym }],
  ),
});

export const GetMyBrontoBoardsError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/my", session: sessionSym }, { request: requestSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]); // Keep frames with an error
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /brontoboards/:brontoBoardId ---

export const GetBrontoBoardByIdSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [brontoBoardIdPathParamSym]: brontoBoardId, [brontoBoardResultSym]: brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/:brontoBoardId", session: sessionSym }, { request: requestSym, brontoBoardId: brontoBoardIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, brontoBoard: brontoBoardResultSym }],
  ),
});

export const GetBrontoBoardByIdError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [brontoBoardIdPathParamSym]: brontoBoardId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboards/:brontoBoardId", session: sessionSym }, { request: requestSym, brontoBoardId: brontoBoardIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /classes/:classId/assignments ---

export const GetClassAssignmentsSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [listResultsSym]: results },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId/assignments", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, results: listResultsSym }],
  ),
});

export const GetClassAssignmentsError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId/assignments", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /classes/:classId/officehours ---

export const GetClassOfficeHoursSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [listResultsSym]: results },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId/officehours", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, results: listResultsSym }],
  ),
});

export const GetClassOfficeHoursError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId/officehours", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /classes/:classId ---

export const GetClassByIdSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [classResultSym]: classResult },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, class: classResultSym }],
  ),
});

export const GetClassByIdError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [classIdPathParamSym]: classId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/classes/:classId", session: sessionSym }, { request: requestSym, classId: classIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /assignments/:assignmentId ---

export const GetAssignmentByIdSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [assignmentIdPathParamSym]: assignmentId, [assignmentResultSym]: assignment },
) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:assignmentId", session: sessionSym }, { request: requestSym, assignmentId: assignmentIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, assignment: assignmentResultSym }],
  ),
});

export const GetAssignmentByIdError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [assignmentIdPathParamSym]: assignmentId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/:assignmentId", session: sessionSym }, { request: requestSym, assignmentId: assignmentIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});

// --- GET /officehours/:officeHourId ---

export const GetOfficeHourByIdSuccess: Sync = (
  { [requestSym]: request, [sessionSym]: session, [officeHourIdPathParamSym]: officeHourId, [officeHourResultSym]: officeHour },
) => ({
  when: actions(
    [Requesting.request, { path: "/officehours/:officeHourId", session: sessionSym }, { request: requestSym, officeHourId: officeHourIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => !$[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, officeHour: officeHourResultSym }],
  ),
});

export const GetOfficeHourByIdError: Sync = (
  { [requestSym]: request, [sessionSym]: session, [officeHourIdPathParamSym]: officeHourId, [errorSym]: error },
) => ({
  when: actions(
    [Requesting.request, { path: "/officehours/:officeHourId", session: sessionSym }, { request: requestSym, officeHourId: officeHourIdPathParamSym }],
  ),
  where: async (frames) => {
    const processedFrames = await handleBrontoBoardGetRequest(frames[0]);
    return processedFrames.filter(($) => $[errorSym]);
  },
  then: actions(
    [Requesting.respond, { [requestSym]: requestSym, error: errorSym }],
  ),
});
```
