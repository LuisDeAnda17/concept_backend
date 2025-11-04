---
timestamp: 'Mon Nov 03 2025 21:19:05 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_211905.9a2d1daf.md]]'
content_id: 5519ad2968d656546a94321adaf4a7235e99e1f6f6d857bf9069c4295fc388ee
---

# response:

```typescript
// src/syncs/brontoboard_queries.sync.ts

// These imports are crucial for defining synchronizations and interacting with concepts.
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides the ID branded type

// Define local type aliases for better readability, corresponding to the concept's generic parameters and entities.
type User = ID;
type Session = ID;
type BrontoBoardID = ID;
type ClassID = ID;
type AssignmentID = ID;
type OfficeHourID = ID;

/**
 * createQueryResponseSyncs generates boilerplate success and error response synchronizations
 * for a given BrontoBoard query. This function standardizes how query results are
 * collected and sent back as an HTTP response.
 *
 * It is NOT an authorization helper; authorization logic remains in the request syncs.
 *
 * @param queryPath The HTTP path associated with the query (e.g., "/brontoboard/assignments/by-class").
 * @param conceptQueryAction A tuple representing the concept action, its input pattern (placeholder),
 *                           and its output pattern (placeholder). The placeholders are for TypeScript type inference.
 *                           Example: [BrontoBoard._getAssignmentsForClass, { class: undefined as any }, { assignment: undefined as any }]
 * @param outputVarName The name of the variable that will hold individual items returned by the query.
 *                      (e.g., 'assignment' if BrontoBoard._getAssignmentsForClass returns items bound to 'assignment').
 * @returns A tuple containing two Sync functions: [SuccessResponseSync, ErrorResponseSync].
 */
function createQueryResponseSyncs<T>(
  queryPath: string,
  conceptQueryAction: [
    (input: Record<string, unknown>) => Promise<T[] | { error: string }>,
    Record<string, unknown>,
    Record<string, unknown>,
  ],
  outputVarName: string,
): [Sync, Sync] {
  // Success Response Sync
  // This sync fires when the initial Requesting.request has occurred AND
  // the BrontoBoard query successfully completed, returning one or more items.
  const successSync: Sync = ({ request, [outputVarName]: outputItem, ...vars }) => ({
    when: actions(
      // Match the original request that triggered the query
      [Requesting.request, { path: queryPath }, { request, ...vars }],
      // Match the successful output of the BrontoBoard query.
      // For queries returning arrays, the engine creates a frame for each item,
      // binding it to `outputVarName`.
      [conceptQueryAction[0], {}, { [outputVarName]: outputItem }],
    ),
    where: async (frames) => {
      // Collect all individual 'outputItem' bindings across potentially multiple frames
      // into a single array named 'results'. This groups all results for the response.
      return frames.collectAs([outputItem as symbol], "results");
    },
    then: actions(
      // Respond to the original request with the collected results.
      [Requesting.respond, { request, results }],
    ),
  });

  // Error Response Sync
  // This sync fires when the initial Requesting.request has occurred AND
  // the BrontoBoard query completed with an error.
  const errorSync: Sync = ({ request, error, ...vars }) => ({
    when: actions(
      // Match the original request
      [Requesting.request, { path: queryPath }, { request, ...vars }],
      // Match the error output of the BrontoBoard query
      [conceptQueryAction[0], {}, { error }],
    ),
    then: actions(
      // Respond to the original request with the error message.
      [Requesting.respond, { request, error }],
    ),
  });

  return [successSync, errorSync];
}

// =======================================================
// 1. Syncs for BrontoBoard._getAssignmentsForClass
//    Endpoint: GET /brontoboard/assignments/by-class?session=<id>&class=<id>
// =======================================================

export const GetAssignmentsForClassRequest: Sync = ({
  request,
  session,
  class: classId,
  user,
  brontoBoard: brontoBoardId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignments/by-class", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get the associated user.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames; // No valid session or user found

    // 2. Retrieve the relevant Class document to get its parent BrontoBoardID.
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classId, brontoBoardId });
    if (frames.length === 0) return frames; // Class not found or input was invalid

    // 3. Retrieve the BrontoBoard document and filter to ensure the user from the session is its owner.
    // The output pattern `{ owner: user }` implicitly filters: if the 'owner' of the retrieved
    // BrontoBoard does not match the 'user' obtained from the session, the frame is discarded.
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    // If frames are empty at this point, it means either the BrontoBoard wasn't found
    // or the user is not the owner. The 'then' clause will not fire, leading to a timeout.
    return frames;
  },
  then: actions(
    // Call the BrontoBoard query action. 'assignment' will bind to each item if the query returns an array.
    [BrontoBoard._getAssignmentsForClass, { class: classId }, { assignment: ID }],
  ),
});

export const [
  GetAssignmentsForClassResponse,
  GetAssignmentsForClassErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/assignments/by-class",
  [BrontoBoard._getAssignmentsForClass, { class: undefined as unknown as ClassID }, { assignment: undefined as unknown as ID }],
  "assignment",
);

// =======================================================
// 2. Syncs for BrontoBoard._getOfficeHoursForClass
//    Endpoint: GET /brontoboard/officehours/by-class?session=<id>&class=<id>
// =======================================================

export const GetOfficeHoursForClassRequest: Sync = ({
  request,
  session,
  class: classId,
  user,
  brontoBoard: brontoBoardId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/by-class", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get class document to find its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classId, brontoBoardId });
    if (frames.length === 0) return frames;

    // 3. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getOfficeHoursForClass, { class: classId }, { officeHour: ID }],
  ),
});

export const [
  GetOfficeHoursForClassResponse,
  GetOfficeHoursForClassErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/officehours/by-class",
  [BrontoBoard._getOfficeHoursForClass, { class: undefined as unknown as ClassID }, { officeHour: undefined as unknown as ID }],
  "officeHour",
);

// =======================================================
// 3. Syncs for BrontoBoard._getClassesForBrontoBoard
//    Endpoint: GET /brontoboard/classes/by-brontoboard?session=<id>&brontoBoard=<id>
// =======================================================

export const GetClassesForBrontoBoardRequest: Sync = ({
  request,
  session,
  brontoBoard: brontoBoardId,
  user,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/classes/by-brontoboard", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getClassesForBrontoBoard, { brontoBoard: brontoBoardId }, { class: ID }],
  ),
});

export const [
  GetClassesForBrontoBoardResponse,
  GetClassesForBrontoBoardErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/classes/by-brontoboard",
  [BrontoBoard._getClassesForBrontoBoard, { brontoBoard: undefined as unknown as BrontoBoardID }, { class: undefined as unknown as ID }],
  "class",
);

// =======================================================
// 4. Syncs for BrontoBoard._getBrontoBoardsForUser
//    Endpoint: GET /brontoboard/my-brontoboards?session=<id>
//    Special case: This query directly uses the user from the session,
//    so the authorization is implicitly done by checking the session.
// =======================================================

export const GetBrontoBoardsForUserRequest: Sync = ({ request, session, user }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/my-brontoboards", session }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user (direct authorization for this query)
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard._getBrontoBoardsForUser, { user }, { brontoBoard: ID }],
  ),
});

export const [
  GetBrontoBoardsForUserResponse,
  GetBrontoBoardsForUserErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/my-brontoboards",
  [BrontoBoard._getBrontoBoardsForUser, { user: undefined as unknown as User }, { brontoBoard: undefined as unknown as ID }],
  "brontoBoard",
);

// =======================================================
// 5. Syncs for BrontoBoard._getBrontoBoardById
//    Endpoint: GET /brontoboard/by-id?session=<id>&brontoBoard=<id>
// =======================================================

export const GetBrontoBoardByIdRequest: Sync = ({
  request,
  session,
  brontoBoard: brontoBoardId,
  user,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/by-id", session, brontoBoard: brontoBoardId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: ID }],
  ),
});

export const [
  GetBrontoBoardByIdResponse,
  GetBrontoBoardByIdErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/by-id",
  [BrontoBoard._getBrontoBoardById, { brontoBoard: undefined as unknown as BrontoBoardID }, { brontoBoard: undefined as unknown as ID }],
  "brontoBoard",
);

// =======================================================
// 6. Syncs for BrontoBoard._getClassById
//    Endpoint: GET /brontoboard/class/by-id?session=<id>&class=<id>
// =======================================================

export const GetClassByIdRequest: Sync = ({
  request,
  session,
  class: classId,
  user,
  brontoBoard: brontoBoardId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/by-id", session, class: classId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get class document to find its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classId, brontoBoardId });
    if (frames.length === 0) return frames;

    // 3. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getClassById, { class: classId }, { class: ID }],
  ),
});

export const [
  GetClassByIdResponse,
  GetClassByIdErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/class/by-id",
  [BrontoBoard._getClassById, { class: undefined as unknown as ClassID }, { class: undefined as unknown as ID }],
  "class",
);

// =======================================================
// 7. Syncs for BrontoBoard._getAssignmentById
//    Endpoint: GET /brontoboard/assignment/by-id?session=<id>&assignment=<id>
// =======================================================

export const GetAssignmentByIdRequest: Sync = ({
  request,
  session,
  assignment: assignmentId,
  user,
  class: classId,
  brontoBoard: brontoBoardId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/by-id", session, assignment: assignmentId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get assignment document to find its parent classId
    frames = await frames.query(BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignment: assignmentId, class: classId });
    if (frames.length === 0) return frames;

    // 3. Get class document to find its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classId, brontoBoardId });
    if (frames.length === 0) return frames;

    // 4. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getAssignmentById, { assignment: assignmentId }, { assignment: ID }],
  ),
});

export const [
  GetAssignmentByIdResponse,
  GetAssignmentByIdErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/assignment/by-id",
  [BrontoBoard._getAssignmentById, { assignment: undefined as unknown as AssignmentID }, { assignment: undefined as unknown as ID }],
  "assignment",
);

// =======================================================
// 8. Syncs for BrontoBoard._getOfficeHourById
//    Endpoint: GET /brontoboard/officehour/by-id?session=<id>&officeHour=<id>
// =======================================================

export const GetOfficeHourByIdRequest: Sync = ({
  request,
  session,
  officeHour: officeHourId,
  user,
  class: classId,
  brontoBoard: brontoBoardId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehour/by-id", session, officeHour: officeHourId }, { request }],
  ),
  where: async (frames) => {
    // 1. Verify session and get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return frames;

    // 2. Get officeHour document to find its parent classId
    frames = await frames.query(BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHour: officeHourId, class: classId });
    if (frames.length === 0) return frames;

    // 3. Get class document to find its parent brontoBoardId
    frames = await frames.query(BrontoBoard._getClassById, { class: classId }, { class: classId, brontoBoardId });
    if (frames.length === 0) return frames;

    // 4. Get brontoBoard document and ensure the user from session is its owner
    frames = await frames.query(BrontoBoard._getBrontoBoardById, { brontoBoard: brontoBoardId }, { brontoBoard: brontoBoardId, owner: user });

    return frames;
  },
  then: actions(
    [BrontoBoard._getOfficeHourById, { officeHour: officeHourId }, { officeHour: ID }],
  ),
});

export const [
  GetOfficeHourByIdResponse,
  GetOfficeHourByIdErrorResponse,
] = createQueryResponseSyncs(
  "/brontoboard/officehour/by-id",
  [BrontoBoard._getOfficeHourById, { officeHour: undefined as unknown as OfficeHourID }, { officeHour: undefined as unknown as ID }],
  "officeHour",
);
```
