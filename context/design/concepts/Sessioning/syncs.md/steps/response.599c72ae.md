---
timestamp: 'Mon Nov 03 2025 21:00:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_210038.6586e866.md]]'
content_id: 599c72aee57eb7ffd244bb1c03ccbfe749a58b47fa9f2067bd6a397bc4900058
---

# response:

```typescript
// src/syncs/brontoboard_queries.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

// Define generic types for consistency with BrontoBoard concept
type User = ID;
type Session = ID;
type BrontoBoardID = ID;
type ClassID = ID;
type AssignmentID = ID;
type OfficeHourID = ID;

// --- Syncs for BrontoBoard queries ---

// 1. Get Assignments for a Class
// Path: /api/brontoboard/assignments-for-class?session={sessionID}&class={classID}
export const GetAssignmentsForClassRequest: Sync = ({
  request, session, class: classId, user, // input variables
  assignmentId, assignmentName, dueDate, // output variables for individual assignments
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignments-for-class", session, class: classId as ClassID }, { request }],
  ),
  where: async (frames) => {
    // Retain the initial frame to ensure the `request` variable is always available for responses
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames(); // Should not happen if `when` matched

    // --- Authorization Logic ---
    // 1. Get user from session
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User; // User is now bound in the frame

    // 2. Get class and its associated BrontoBoard for ownership verification
    const classDocs = await BrontoBoard._getClassById({ class: initialFrame[classId] as ClassID });
    if (classDocs.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: `Class with ID ${initialFrame[classId]} not found.` });
    }
    const classDoc = classDocs[0]; // Assuming _getClassById returns an array, take the first

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access class with ID ${initialFrame[classId]}.` });
    }
    // --- End Authorization Logic ---

    // If authorized, perform the actual BrontoBoard query.
    const assignmentsResult = await BrontoBoard._getAssignmentsForClass({ class: initialFrame[classId] as ClassID });

    // Concept queries are designed to return an array; any non-array is an unexpected error.
    if (!Array.isArray(assignmentsResult)) {
        // Handle cases where the concept query itself might return an error object directly
        return new Frames({ [request]: initialFrame[request], [error]: (assignmentsResult as any).error || `Failed to retrieve assignments for class ${initialFrame[classId]}.` });
    }

    if (assignmentsResult.length === 0) {
      // No assignments found, respond with an empty array of results
      return new Frames({ [request]: initialFrame[request], [results]: [] });
    }

    // Collect assignments data for response.
    // Create new temporary frames, each enriched with one assignment's details.
    const assignmentItemFrames = new Frames(
      ...assignmentsResult.map(a => ({
        [request]: initialFrame[request], // Preserve the original request ID
        [assignmentId]: a._id,
        [assignmentName]: a.name,
        [dueDate]: a.dueDate,
      })),
    );

    // Group all assignment details from the temporary frames into the `results` variable.
    // This produces a single frame for the final response.
    return assignmentItemFrames.collectAs(
      [assignmentId, assignmentName, dueDate],
      results,
    );
  },
  then: actions(
    // One then clause for success (frames containing `results`)
    [Requesting.respond, { request, results }, {}],
    // Another then clause for error (frames containing `error`)
    [Requesting.respond, { request, error }, {}],
  ),
});


// 2. Get Office Hours for a Class
// Path: /api/brontoboard/officehours-for-class?session={sessionID}&class={classID}
export const GetOfficeHoursForClassRequest: Sync = ({
  request, session, class: classId, user, // input variables
  officeHourId, startTime, duration, // output variables for individual office hours
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehours-for-class", session, class: classId as ClassID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const classDocs = await BrontoBoard._getClassById({ class: initialFrame[classId] as ClassID });
    if (classDocs.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: `Class with ID ${initialFrame[classId]} not found.` });
    }
    const classDoc = classDocs[0];

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access class with ID ${initialFrame[classId]}.` });
    }
    // --- End Authorization Logic ---

    const officeHoursResult = await BrontoBoard._getOfficeHoursForClass({ class: initialFrame[classId] as ClassID });

    if (!Array.isArray(officeHoursResult)) {
        return new Frames({ [request]: initialFrame[request], [error]: (officeHoursResult as any).error || `Failed to retrieve office hours for class ${initialFrame[classId]}.` });
    }

    if (officeHoursResult.length === 0) {
      return new Frames({ [request]: initialFrame[request], [results]: [] });
    }

    const officeHourItemFrames = new Frames(
      ...officeHoursResult.map(oh => ({
        [request]: initialFrame[request],
        [officeHourId]: oh._id,
        [startTime]: oh.startTime,
        [duration]: oh.duration,
      })),
    );

    return officeHourItemFrames.collectAs(
      [officeHourId, startTime, duration],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 3. Get Classes for a BrontoBoard
// Path: /api/brontoboard/classes-for-brontoboard?session={sessionID}&brontoBoard={brontoBoardID}
export const GetClassesForBrontoBoardRequest: Sync = ({
  request, session, brontoBoard: brontoBoardId, user, // input variables
  classId, className, overview, // output variables for individual classes
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/classes-for-brontoboard", session, brontoBoard: brontoBoardId as BrontoBoardID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: initialFrame[brontoBoardId] as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access BrontoBoard with ID ${initialFrame[brontoBoardId]}.` });
    }
    // --- End Authorization Logic ---

    const classesResult = await BrontoBoard._getClassesForBrontoBoard({ brontoBoard: initialFrame[brontoBoardId] as BrontoBoardID });

    if (!Array.isArray(classesResult)) {
        return new Frames({ [request]: initialFrame[request], [error]: (classesResult as any).error || `Failed to retrieve classes for BrontoBoard ${initialFrame[brontoBoardId]}.` });
    }

    if (classesResult.length === 0) {
      return new Frames({ [request]: initialFrame[request], [results]: [] });
    }

    const classItemFrames = new Frames(
      ...classesResult.map(c => ({
        [request]: initialFrame[request],
        [classId]: c._id,
        [className]: c.name,
        [overview]: c.overview,
      })),
    );

    return classItemFrames.collectAs(
      [classId, className, overview],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 4. Get BrontoBoards for a User
// Path: /api/brontoboard/my-brontoboards?session={sessionID}
export const GetBrontoBoardsForUserRequest: Sync = ({
  request, session, user, // input variables
  brontoBoardId, owner, calendar, // output variables for individual BrontoBoards
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/my-brontoboards", session }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    // Here, we just need to ensure the session is valid and get the user ID.
    // The query itself handles filtering by owner.
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;
    // --- End Authorization Logic ---

    const brontoBoardsResult = await BrontoBoard._getBrontoBoardsForUser({ user: currentUserId });

    if (!Array.isArray(brontoBoardsResult)) {
        return new Frames({ [request]: initialFrame[request], [error]: (brontoBoardsResult as any).error || `Failed to retrieve BrontoBoards for user ${currentUserId}.` });
    }

    if (brontoBoardsResult.length === 0) {
      return new Frames({ [request]: initialFrame[request], [results]: [] });
    }

    const brontoBoardItemFrames = new Frames(
      ...brontoBoardsResult.map(bb => ({
        [request]: initialFrame[request],
        [brontoBoardId]: bb._id,
        [owner]: bb.owner, // This will be `currentUserId` as the query filters by owner
        [calendar]: bb.calendar,
      })),
    );

    return brontoBoardItemFrames.collectAs(
      [brontoBoardId, owner, calendar],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 5. Get BrontoBoard by ID
// Path: /api/brontoboard/get-by-id?session={sessionID}&brontoBoard={brontoBoardID}
export const GetBrontoBoardByIdRequest: Sync = ({
  request, session, brontoBoard: brontoBoardId, user, // input variables
  id, owner: bbOwner, calendar: bbCalendar, // output variables for the single BrontoBoard (aliased to avoid conflict)
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/get-by-id", session, brontoBoard: brontoBoardId as BrontoBoardID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: initialFrame[brontoBoardId] as BrontoBoardID });
    if (brontoBoardDocs.length === 0) {
        return new Frames({ [request]: initialFrame[request], [error]: `BrontoBoard with ID ${initialFrame[brontoBoardId]} not found.` });
    }
    const brontoBoardDoc = brontoBoardDocs[0];

    if (brontoBoardDoc.owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access BrontoBoard with ID ${initialFrame[brontoBoardId]}.` });
    }
    // --- End Authorization Logic ---

    // At this point, brontoBoardDoc is the authorized document.
    // Prepare it for collectAs (even though it's a single item, collectAs can still format it consistently)
    const singleResultFrame = new Frames({
      [request]: initialFrame[request],
      [id]: brontoBoardDoc._id,
      [bbOwner]: brontoBoardDoc.owner,
      [bbCalendar]: brontoBoardDoc.calendar,
    });

    return singleResultFrame.collectAs(
      [id, bbOwner, bbCalendar],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 6. Get Class by ID
// Path: /api/brontoboard/class-by-id?session={sessionID}&class={classID}
export const GetClassByIdRequest: Sync = ({
  request, session, class: classId, user, // input variables
  id, brontoBoardId: classBrontoBoardId, name: className, overview, // output variables for the single Class (aliased)
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/class-by-id", session, class: classId as ClassID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const classDocs = await BrontoBoard._getClassById({ class: initialFrame[classId] as ClassID });
    if (classDocs.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: `Class with ID ${initialFrame[classId]} not found.` });
    }
    const classDoc = classDocs[0];

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access class with ID ${initialFrame[classId]}.` });
    }
    // --- End Authorization Logic ---

    // At this point, classDoc is the authorized document.
    const singleResultFrame = new Frames({
      [request]: initialFrame[request],
      [id]: classDoc._id,
      [classBrontoBoardId]: classDoc.brontoBoardId,
      [className]: classDoc.name,
      [overview]: classDoc.overview,
    });

    return singleResultFrame.collectAs(
      [id, classBrontoBoardId, className, overview],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 7. Get Assignment by ID
// Path: /api/brontoboard/assignment-by-id?session={sessionID}&assignment={assignmentID}
export const GetAssignmentByIdRequest: Sync = ({
  request, session, assignment: assignmentId, user, // input variables
  id, classId: assignmentClassId, name: assignmentName, dueDate, // output variables for the single Assignment (aliased)
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/assignment-by-id", session, assignment: assignmentId as AssignmentID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const assignmentDocs = await BrontoBoard._getAssignmentById({ assignment: initialFrame[assignmentId] as AssignmentID });
    if (assignmentDocs.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: `Assignment with ID ${initialFrame[assignmentId]} not found.` });
    }
    const assignmentDoc = assignmentDocs[0];

    // Check ownership of the parent class's BrontoBoard
    const classDocs = await BrontoBoard._getClassById({ class: assignmentDoc.classId as ClassID });
    if (classDocs.length === 0) { // Should ideally not happen if assignment.classId is valid
      return new Frames({ [request]: initialFrame[request], [error]: `Associated class for assignment ${initialFrame[assignmentId]} not found.` });
    }
    const classDoc = classDocs[0];

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access assignment with ID ${initialFrame[assignmentId]}.` });
    }
    // --- End Authorization Logic ---

    // At this point, assignmentDoc is the authorized document.
    const singleResultFrame = new Frames({
      [request]: initialFrame[request],
      [id]: assignmentDoc._id,
      [assignmentClassId]: assignmentDoc.classId,
      [assignmentName]: assignmentDoc.name,
      [dueDate]: assignmentDoc.dueDate,
    });

    return singleResultFrame.collectAs(
      [id, assignmentClassId, assignmentName, dueDate],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});

// 8. Get Office Hour by ID
// Path: /api/brontoboard/officehour-by-id?session={sessionID}&officeHour={officeHourID}
export const GetOfficeHourByIdRequest: Sync = ({
  request, session, officeHour: officeHourId, user, // input variables
  id, classId: ohClassId, startTime, duration, // output variables for the single OfficeHour (aliased)
  results, error, // response variables
}) => ({
  when: actions(
    [Requesting.request, { path: "/api/brontoboard/officehour-by-id", session, officeHour: officeHourId as OfficeHourID }, { request }],
  ),
  where: async (frames) => {
    const initialFrame = frames[0];
    if (!initialFrame) return new Frames();

    // --- Authorization Logic ---
    frames = await frames.query(Sessioning._getUser, { session: initialFrame[session] as Session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: "Authentication required: Invalid session." });
    }
    const currentUserId = frames[0][user] as User;

    const officeHourDocs = await BrontoBoard._getOfficeHourById({ officeHour: initialFrame[officeHourId] as OfficeHourID });
    if (officeHourDocs.length === 0) {
      return new Frames({ [request]: initialFrame[request], [error]: `Office Hour with ID ${initialFrame[officeHourId]} not found.` });
    }
    const officeHourDoc = officeHourDocs[0];

    // Check ownership of the parent class's BrontoBoard
    const classDocs = await BrontoBoard._getClassById({ class: officeHourDoc.classId as ClassID });
    if (classDocs.length === 0) { // Should ideally not happen if officeHour.classId is valid
      return new Frames({ [request]: initialFrame[request], [error]: `Associated class for office hour ${initialFrame[officeHourId]} not found.` });
    }
    const classDoc = classDocs[0];

    const brontoBoardDocs = await BrontoBoard._getBrontoBoardById({ brontoBoard: classDoc.brontoBoardId as BrontoBoardID });
    if (brontoBoardDocs.length === 0 || brontoBoardDocs[0].owner !== currentUserId) {
      return new Frames({ [request]: initialFrame[request], [error]: `Unauthorized to access office hour with ID ${initialFrame[officeHourId]}.` });
    }
    // --- End Authorization Logic ---

    // At this point, officeHourDoc is the authorized document.
    const singleResultFrame = new Frames({
      [request]: initialFrame[request],
      [id]: officeHourDoc._id,
      [ohClassId]: officeHourDoc.classId,
      [startTime]: officeHourDoc.startTime,
      [duration]: officeHourDoc.duration,
    });

    return singleResultFrame.collectAs(
      [id, ohClassId, startTime, duration],
      results,
    );
  },
  then: actions(
    [Requesting.respond, { request, results }, {}],
    [Requesting.respond, { request, error }, {}],
  ),
});
```
