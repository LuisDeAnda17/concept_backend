---
timestamp: 'Mon Nov 03 2025 19:53:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_195357.f7071ad1.md]]'
content_id: d2ac349a6372dada9ba3efcc095ac98ea87fea45a3a01bf1dd073b27d69a6f38
---

# response:

Here are the synchronizations for the `BrontoBoard` concept, implemented in a single TypeScript file `brontoboard.sync.ts`. This includes syncs for initiating actions and handling their success/error responses, as well as syncs for querying the concept's state.

**File:** `src/syncs/brontoboard.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
// Import all concepts. Run `deno run build` if you get import errors.
import { BrontoBoard, Requesting, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- BrontoBoard Initialization Syncs ---

/**
 * Sync: Handle request to initialize a new BrontoBoard.
 * Path: POST /brontoboard/init
 * Input: { session: Session, calendar: Calendar }
 * Output: { brontoBoard: ID } | { error: string }
 */
export const InitializeBrontoBoardRequest: Sync = (
  { request, session, calendar, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/init", session, calendar },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.initializeBB, { user, calendar }, { brontoBoard }],
  ),
});

export const InitializeBrontoBoardResponse: Sync = (
  { request, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

export const InitializeBrontoBoardError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Class Management Syncs ---

/**
 * Sync: Handle request to create a new Class within a BrontoBoard.
 * Path: POST /brontoboard/class/create
 * Input: { session: Session, brontoBoard: ID, className: string, overview: string }
 * Output: { class: ID } | { error: string }
 */
export const CreateClassRequest: Sync = (
  { request, session, brontoBoard, className, overview, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/create", session, brontoBoard, className, overview },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [
      BrontoBoard.createClass,
      { owner: user, brontoBoard, className, overview },
      { class: className }, // 'class' is a keyword, use 'className' as output variable for the ID
    ],
  ),
});

export const CreateClassResponse: Sync = ({ request, class: classId }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId }],
  ),
  then: actions(
    [Requesting.respond, { request, class: classId }],
  ),
});

export const CreateClassError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Assignment Management Syncs ---

/**
 * Sync: Handle request to add an Assignment to a Class.
 * Path: POST /brontoboard/assignment/add
 * Input: { session: Session, class: ID, workName: string, dueDate: string (ISO Date) }
 * Output: { assignment: ID } | { error: string }
 */
export const AddAssignmentRequest: Sync = (
  { request, session, class: classId, workName, dueDate: dueDateString, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/assignment/add",
        session,
        class: classId,
        workName,
        dueDate: dueDateString, // dueDate comes as string from request
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Parse dueDate string to Date object
    return frames.map(($) => ({
      ...$,
      dueDate: new Date($[dueDateString]), // Convert to Date object
    }));
  },
  then: actions(
    [
      BrontoBoard.addWork,
      { owner: user, class: classId, workName, dueDate },
      { assignment },
    ],
  ),
});

export const AddAssignmentResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

export const AddAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: Handle request to change an Assignment's due date.
 * Path: PUT /brontoboard/assignment/change
 * Input: { session: Session, work: ID, dueDate: string (ISO Date) }
 * Output: {} | { error: string }
 */
export const ChangeAssignmentRequest: Sync = (
  { request, session, work, dueDate: dueDateString, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/assignment/change",
        session,
        work,
        dueDate: dueDateString, // dueDate comes as string from request
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Parse dueDate string to Date object
    return frames.map(($) => ({
      ...$,
      dueDate: new Date($[dueDateString]), // Convert to Date object
    }));
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work, dueDate }],
  ),
});

export const ChangeAssignmentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // No output variable for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "ok" }], // Respond with a simple success status
  ),
});

export const ChangeAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: Handle request to remove an Assignment.
 * Path: DELETE /brontoboard/assignment/remove
 * Input: { session: Session, work: ID }
 * Output: {} | { error: string }
 */
export const RemoveAssignmentRequest: Sync = (
  { request, session, work, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/remove", session, work },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames;
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work }],
  ),
});

export const RemoveAssignmentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // No output variable for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "ok" }],
  ),
});

export const RemoveAssignmentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Office Hours Management Syncs ---

/**
 * Sync: Handle request to add Office Hours to a Class.
 * Path: POST /brontoboard/officehours/add
 * Input: { session: Session, class: ID, OHTime: string (ISO Date), OHduration: number }
 * Output: { officeHours: ID } | { error: string }
 */
export const AddOfficeHoursRequest: Sync = (
  { request, session, class: classId, OHTime: OHTimeString, OHduration, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/officehours/add",
        session,
        class: classId,
        OHTime: OHTimeString, // OHTime comes as string from request
        OHduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Parse OHTime string to Date object
    return frames.map(($) => ({
      ...$,
      OHTime: new Date($[OHTimeString]), // Convert to Date object
    }));
  },
  then: actions(
    [
      BrontoBoard.addOH,
      { owner: user, class: classId, OHTime, OHduration },
      { officeHours },
    ],
  ),
});

export const AddOfficeHoursResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const AddOfficeHoursError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: Handle request to change Office Hours.
 * Path: PUT /brontoboard/officehours/change
 * Input: { session: Session, oh: ID, newDate: string (ISO Date), newduration: number }
 * Output: {} | { error: string }
 */
export const ChangeOfficeHoursRequest: Sync = (
  { request, session, oh, newDate: newDateString, newduration, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/brontoboard/officehours/change",
        session,
        oh,
        newDate: newDateString, // newDate comes as string from request
        newduration,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Parse newDate string to Date object
    return frames.map(($) => ({
      ...$,
      newDate: new Date($[newDateString]), // Convert to Date object
    }));
  },
  then: actions(
    [BrontoBoard.changeOH, { owner: user, oh, newDate, newduration }],
  ),
});

export const ChangeOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // No output variable for success
  ),
  then: actions(
    [Requesting.respond, { request, status: "ok" }],
  ),
});

export const ChangeOfficeHoursError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query Syncs ---

/**
 * Sync: Get BrontoBoards owned by the current user.
 * Path: GET /brontoboard/my
 * Input: { session: Session }
 * Output: { brontoBoards: BrontoBoardDoc[] } | { error: string }
 */
export const GetMyBrontoBoardsRequest: Sync = (
  { request, session, user, brontoBoard, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/my", session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original request frame for error/empty response
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    frames = await frames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user },
      { brontoBoard },
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([brontoBoard], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

export const GetMyBrontoBoardsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/my" }, { request }],
    [BrontoBoard._getBrontoBoardsForUser, {}, { error }], // Catch errors from the query action itself
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: Get a specific BrontoBoard by ID.
 * Path: GET /brontoboard/:brontoBoardId
 * Input: { session: Session } (from URL params, Requesting maps it as { brontoBoardId: ID })
 * Output: { brontoBoard: BrontoBoardDoc } | { error: string }
 */
export const GetBrontoBoardByIdRequest: Sync = (
  { request, session, brontoBoard: brontoBoardId, user, brontoBoard },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/:brontoBoard", session }, {
      request,
      brontoBoard: brontoBoardId,
    }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed." });
    }

    // Check if user is owner of this specific brontoBoard
    const boardCheck = await frames.query(
      BrontoBoard._getBrontoBoardById,
      { brontoBoard: brontoBoardId },
      { brontoBoard },
    );

    if (boardCheck.length === 0 || boardCheck[0][brontoBoard].owner !== boardCheck[0][user]) {
      return new Frames({ ...originalFrame, error: "BrontoBoard not found or not authorized." });
    }
    return boardCheck;
  },
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

export const GetBrontoBoardByIdError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/:brontoBoard" }, { request }],
    [BrontoBoard._getBrontoBoardById, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: Get Classes for a specific BrontoBoard.
 * Path: GET /brontoboard/:brontoBoardId/classes
 * Input: { session: Session } (from URL params)
 * Output: { classes: ClassDoc[] } | { error: string }
 */
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, session, brontoBoard: brontoBoardId, user, class: classDoc, results },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/:brontoBoard/classes", session },
      { request, brontoBoard: brontoBoardId },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed." });
    }

    // Validate ownership of BrontoBoard
    const board = await BrontoBoard._getBrontoBoardById({ brontoBoard: brontoBoardId as ID });
    if (board.length === 0 || board[0].owner !== frames[0][user]) {
      return new Frames({ ...originalFrame, error: "BrontoBoard not found or not authorized." });
    }

    // Get classes
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard: brontoBoardId },
      { class: classDoc },
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([classDoc], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

// Response syncs for query errors are generally handled by the `where` clause's explicit error returns
// or by a generic error response sync for Requesting if the query itself returns {error: string}.
// For brevity, explicit error syncs for all queries are omitted but can be added if needed.

/**
 * Sync: Get Assignments for a specific Class.
 * Path: GET /brontoboard/class/:classId/assignments
 * Input: { session: Session } (from URL params)
 * Output: { assignments: AssignmentDoc[] } | { error: string }
 */
export const GetAssignmentsForClassRequest: Sync = (
  { request, session, class: classId, user, assignment, results },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/:class/assignments", session },
      { request, class: classId },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed." });
    }

    // Validate ownership of BrontoBoard for this class
    const classInfo = await BrontoBoard._getClassById({ class: classId as ID });
    if (classInfo.length === 0) {
      return new Frames({ ...originalFrame, error: "Class not found." });
    }
    const brontoBoardInfo = await BrontoBoard._getBrontoBoardById({ brontoBoard: classInfo[0].brontoBoardId });
    if (brontoBoardInfo.length === 0 || brontoBoardInfo[0].owner !== frames[0][user]) {
      return new Frames({ ...originalFrame, error: "Not authorized to view this class's assignments." });
    }

    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: classId },
      { assignment },
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([assignment], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

/**
 * Sync: Get Office Hours for a specific Class.
 * Path: GET /brontoboard/class/:classId/officehours
 * Input: { session: Session } (from URL params)
 * Output: { officeHours: OfficeHourDoc[] } | { error: string }
 */
export const GetOfficeHoursForClassRequest: Sync = (
  { request, session, class: classId, user, officeHour, results },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/:class/officehours", session },
      { request, class: classId },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed." });
    }

    // Validate ownership of BrontoBoard for this class
    const classInfo = await BrontoBoard._getClassById({ class: classId as ID });
    if (classInfo.length === 0) {
      return new Frames({ ...originalFrame, error: "Class not found." });
    }
    const brontoBoardInfo = await BrontoBoard._getBrontoBoardById({ brontoBoard: classInfo[0].brontoBoardId });
    if (brontoBoardInfo.length === 0 || brontoBoardInfo[0].owner !== frames[0][user]) {
      return new Frames({ ...originalFrame, error: "Not authorized to view this class's office hours." });
    }

    frames = await frames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: classId },
      { officeHour },
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([officeHour], results);
  },
  then: actions(
    [Requesting.respond, { request, results }],
  ),
});

// You would add similar query syncs for _getClassById, _getAssignmentById, _getOfficeHourById
// if you need direct access to single resources by their ID, with appropriate authorization checks.
```
