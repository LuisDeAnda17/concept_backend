import { actions, Sync, Frames } from "@engine";
// Import all necessary concepts from your @concepts alias
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is available from @utils/types.ts
// import { $vars } from "../engine/vars.ts";

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
      { path: "/BrontoBoard/initializeBB", session, calendar },
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
      { path: "/BrontoBoard/initializeBB" },
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
      { path: "/BrontoBoard/initializeBB" },
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
      { path: "/BrontoBoard/createClass", session, brontoBoard, className, overview },
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
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
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
      { path: "/BrontoBoard/addWork", session, class: classId, workName, dueDate },
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
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
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
      { path: "/BrontoBoard/changeWork", session, work, dueDate },
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
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
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
      { path: "/BrontoBoard/removeWork", session, work },
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
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
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
      { path: "/BrontoBoard/addOH", session, class: classId, OHTime, OHduration },
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
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
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
      { path: "/BrontoBoard/changeOH", session, oh, newDate, newduration },
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
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
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
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
    [BrontoBoard.changeOH, {}, { error }], // Matches error output
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});


// /**
//  * Sync 1.1: Handles the request to get a specific Class by its ID.
//  * Performs full authorization: verifies session, gets user, then ensures
//  * user owns the BrontoBoard associated with the requested Class.
//  */
export const GetClassByIdRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request payload
  classId,        // The ID of the class to retrieve
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  class: classOutput, // Output variable for the BrontoBoard query, aliased to avoid conflict with classId
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the Class document
    frames = await frames.query(BrontoBoard.getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 3. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 5. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard.getClassById, { class: classId }, { class: classOutput }],
  ),
});

/**
 * Sync 1.2: Handles responding to the client with the successfully retrieved Class.
 */
export const GetClassByIdResponse: Sync = ({ request, class: classOutput }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass" }, { request }],
    [BrontoBoard.getClassById, {}, { class: classOutput }],
  ),
  then: actions(
    [Requesting.respond, { request, results: classOutput }],
  ),
});

/**
 * Sync 1.3: Handles responding to the client with an error if the _getClassById query failed.
 */
export const GetClassByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClass" }, { request }],
    [BrontoBoard.getClassById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getAssignmentById ---

/**
 * Sync 2.1: Handles the request to get a specific Assignment by its ID.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the Assignment's Class.
 */
export const GetAssignmentByIdRequest: Sync = ({
  request,           // The ID of the incoming request
  session,           // The session ID from the request payload
  assignmentId,      // The ID of the assignment to retrieve
  user,              // Variable to bind the user ID from the session
  assignmentDoc,     // Variable to bind the Assignment document
  classId,           // Intermediate variable to bind the Class ID from assignmentDoc
  classDoc,          // Variable to bind the Class document
  brontoBoardId,     // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc,    // Variable to bind the BrontoBoard document
  assignment,        // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment", session, assignment: assignmentId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the Assignment document
    frames = await frames.query(BrontoBoard.getAssignmentById, { assignment: assignmentId }, { assignmentDoc });
    if (frames.length === 0) return frames; // Assignment not found

    // 3. Extract classId from assignmentDoc and bind it
    frames = frames.map(($) => ({ ...$, [classId]: ($[assignmentDoc] as { classId: ID }).classId }));

    // 4. Get the Class document
    frames = await frames.query(BrontoBoard.getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 5. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 6. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 7. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard.getAssignmentById, { assignment: assignmentId }, { assignment }],
  ),
});

/**
 * Sync 2.2: Handles responding to the client with the successfully retrieved Assignment.
 */
export const GetAssignmentByIdResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment" }, { request }],
    [BrontoBoard.getAssignmentById, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, results: assignment }],
  ),
});

/**
 * Sync 2.3: Handles responding to the client with an error if the _getAssignmentById query failed.
 */
export const GetAssignmentByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignment" }, { request }],
    [BrontoBoard.getAssignmentById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getOfficeHourById ---

/**
 * Sync 3.1: Handles the request to get specific Office Hours by ID.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the OfficeHour's Class.
 */
export const GetOfficeHourByIdRequest: Sync = ({
  request,           // The ID of the incoming request
  session,           // The session ID from the request payload
  officeHourId,      // The ID of the office hour to retrieve
  user,              // Variable to bind the user ID from the session
  officeHourDoc,     // Variable to bind the OfficeHour document
  classId,           // Intermediate variable to bind the Class ID from officeHourDoc
  classDoc,          // Variable to bind the Class document
  brontoBoardId,     // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc,    // Variable to bind the BrontoBoard document
  officeHour,        // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour", session, officeHour: officeHourId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the OfficeHour document
    frames = await frames.query(BrontoBoard.getOfficeHourById, { officeHour: officeHourId }, { officeHourDoc });
    if (frames.length === 0) return frames; // OfficeHour not found

    // 3. Extract classId from officeHourDoc and bind it
    frames = frames.map(($) => ({ ...$, [classId]: ($[officeHourDoc] as { classId: ID }).classId }));

    // 4. Get the Class document
    frames = await frames.query(BrontoBoard.getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames; // Class not found

    // 5. Extract brontoBoardId from classDoc and bind it
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 6. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 7. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard.getOfficeHourById, { officeHour: officeHourId }, { officeHour }],
  ),
});

/**
 * Sync 3.2: Handles responding to the client with the successfully retrieved OfficeHour.
 */
export const GetOfficeHourByIdResponse: Sync = ({ request, officeHour }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour" }, { request }],
    [BrontoBoard.getOfficeHourById, {}, { officeHour }],
  ),
  then: actions(
    [Requesting.respond, { request, results: officeHour }],
  ),
});

/**
 * Sync 3.3: Handles responding to the client with an error if the _getOfficeHourById query failed.
 */
export const GetOfficeHourByIdErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHour" }, { request }],
    [BrontoBoard.getOfficeHourById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getClassesForBrontoBoard ---

/**
 * Sync 4.1: Handles the request to get all Classes for a specific BrontoBoard.
 * Performs authorization: verifies session, gets user, then ensures
 * user owns the requested BrontoBoard.
 */
export const GetClassesForBrontoBoardRequest: Sync = ({
  request,         // The ID of the incoming request
  session,         // The session ID from the request payload
  brontoBoardId,   // The ID of the BrontoBoard to retrieve classes from
  user,            // Variable to bind the user ID from the session
  brontoBoardDoc,  // Variable to bind the BrontoBoard document
  classes,         // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // Session invalid or not found

    // 2. Get the BrontoBoard document
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames; // BrontoBoard not found

    // 3. Filter: Ensure user from session is the owner of the BrontoBoard
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    // If authorization passes, call the BrontoBoard query
    [BrontoBoard.getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { classes }],
  ),
});

/**
 * Sync 4.2: Handles responding to the client with the successfully retrieved Classes.
 */
export const GetClassesForBrontoBoardResponse: Sync = ({ request, classes }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses" }, { request }],
    [BrontoBoard.getClassesForBrontoBoard, {}, { classes }],
  ),
  then: actions(
    // The `collectAs` helper would typically be used here if `classes` needed
    // to be wrapped in an object property for the response.
    // Assuming `classes` is already an array of the desired format.
    [Requesting.respond, { request, results: classes }],
  ),
});

/**
 * Sync 4.3: Handles responding to the client with an error if the _getClassesForBrontoBoard query failed.
 */
export const GetClassesForBrontoBoardErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getClasses" }, { request }],
    [BrontoBoard.getClassesForBrontoBoard, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getAssignmentsForClass (already provided in the prompt, including for completeness) ---

/**
 * Sync 5.1: Handles the request to get all Assignments for a specific Class.
 * This sync was provided as an example and is included for completeness and context.
 */
export const GetAssignmentsForClassRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request
  classId,        // The ID of the class from the request
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  assignments,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // Each frame starts with bindings from Requesting.request (e.g., { [request]: 'req1', [session]: 's1', [classId]: 'c1' })

    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Retrieve the Class document by its ID.
    frames = await frames.query(BrontoBoard.getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames;

    // 3. Explicitly extract the 'brontoBoardId' from the 'classDoc' object and bind it as a top-level variable in each frame.
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Retrieve the BrontoBoard document by its ID.
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames;

    // 5. Final authorization step: Filter the frames to ensure the user (from session) is the owner of the BrontoBoard.
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard.getAssignmentsForClass, { class: classId }, { assignments }],
  ),
});

/**
 * Sync 5.2: Handles responding to the client with the successfully retrieved assignments.
 */
export const GetAssignmentsForClassResponse: Sync = ({ request, assignments }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass" }, { request }],
    [BrontoBoard.getAssignmentsForClass, {}, { assignments }],
  ),
  then: actions(
    [Requesting.respond, { request, results: assignments }],
  ),
});

/**
 * Sync 5.3: Handles responding to the client with an error if the BrontoBoard query failed.
 */
export const GetAssignmentsForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getAssignmentsForClass" }, { request }],
    [BrontoBoard.getAssignmentsForClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getOfficeHoursForClass (adding this as well, similar to assignments) ---

/**
 * Sync 6.1: Handles the request to get all Office Hours for a specific Class.
 * Performs full authorization: verifies session, gets user, then ensures
 * user owns the BrontoBoard associated with the requested Class.
 */
export const GetOfficeHoursForClassRequest: Sync = ({
  request,        // The ID of the incoming request
  session,        // The session ID from the request
  classId,        // The ID of the class from the request
  user,           // Variable to bind the user ID from the session
  classDoc,       // Variable to bind the Class document
  brontoBoardId,  // Intermediate variable to bind the BrontoBoard ID from classDoc
  brontoBoardDoc, // Variable to bind the BrontoBoard document
  officeHours,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Retrieve the Class document by its ID.
    frames = await frames.query(BrontoBoard.getClassById, { class: classId }, { classDoc });
    if (frames.length === 0) return frames;

    // 3. Explicitly extract the 'brontoBoardId' from the 'classDoc' object and bind it as a top-level variable in each frame.
    frames = frames.map(($) => ({ ...$, [brontoBoardId]: ($[classDoc] as { brontoBoardId: ID }).brontoBoardId }));

    // 4. Retrieve the BrontoBoard document by its ID.
    frames = await frames.query(BrontoBoard.getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoardDoc });
    if (frames.length === 0) return frames;

    // 5. Final authorization step: Filter the frames to ensure the user (from session) is the owner of the BrontoBoard.
    return frames.filter(($) =>
      $[user] && $[brontoBoardDoc] && ($[brontoBoardDoc] as { owner: ID }).owner === $[user]
    );
  },
  then: actions(
    [BrontoBoard.getOfficeHoursForClass, { class: classId }, { officeHours }],
  ),
});

/**
 * Sync 6.2: Handles responding to the client with the successfully retrieved office hours.
 */
export const GetOfficeHoursForClassResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass" }, { request }],
    [BrontoBoard.getOfficeHoursForClass, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

/**
 * Sync 6.3: Handles responding to the client with an error if the BrontoBoard query failed.
 */
export const GetOfficeHoursForClassErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getOfficeHoursForClass" }, { request }],
    [BrontoBoard.getOfficeHoursForClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query for _getBrontoBoardsForUser (this one is authorized differently) ---

/**
 * Sync 7.1: Handles the request to get all BrontoBoards for the authenticated user.
 * Authorization only needs to verify the session to get the user.
 */
export const GetBrontoBoardsForUserRequest: Sync = ({
  request,         // The ID of the incoming request
  session,         // The session ID from the request payload
  user,            // Variable to bind the user ID from the session
  brontoBoards,    // Output variable for the BrontoBoard query
}) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser", session }, { request }],
  ),
  where: async (frames) => {
    // 1. Get user from session
    // frames = await frames.query(Sessioning._getUser, { session }, { user });
    // if (frames.length === 0) return frames; // Session invalid or not found
    // return frames; // No further authorization needed for this specific query
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    // If session is valid, call the BrontoBoard query
    [BrontoBoard.getBrontoBoardsForUser, { user }, { brontoBoards }],
  ),
});

/**
 * Sync 7.2: Handles responding to the client with the successfully retrieved BrontoBoards.
 */
export const GetBrontoBoardsForUserResponse: Sync = ({ request, brontoBoards }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser" }, { request }],
    [BrontoBoard.getBrontoBoardsForUser, {}, { brontoBoards }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoards }],
  ),
});

/**
 * Sync 7.3: Handles responding to the client with an error if the _getBrontoBoardsForUser query failed.
 */
export const GetBrontoBoardsForUserErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/getBrontoBoardsForUser" }, { request }],
    [BrontoBoard.getBrontoBoardsForUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});