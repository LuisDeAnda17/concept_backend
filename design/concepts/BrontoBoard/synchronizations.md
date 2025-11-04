[@implementating-synchronizations](../../background/implementing-synchronizations.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@architecture](../../background/architecture.md)

[@BrontoBoard-implementation](./implementation.md)

[@userAuthentication-implementation](../UserAuthenticator/implementation.md)


# Implement: Syncs for BrontoBoard, No Sessioning Concept is being used.

# response:

```typescript
// file: src/syncs/brontoboard.sync.ts

// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";

// Choose whatever concepts you have (assuming @concepts includes BrontoBoard and Requesting)
import { BrontoBoard, Requesting } from "@concepts";

// --- Helper Functions for Where Clauses ---

/**
 * Parses a date string from a frame and binds it as a Date object.
 * If parsing fails, it adds an 'error' binding to the frame.
 * @param frames The input Frames.
 * @param dateStringVariable The symbol for the variable holding the date string (e.g., Symbol.for('dueDateStr')).
 * @param dateObjectVariable The symbol for the variable to bind the parsed Date object (e.g., Symbol.for('dueDate')).
 * @param errorMessage The error message to use if parsing fails.
 * @returns Frames with parsed dates or error bindings.
 */
function parseDateInFrames(
  frames: Frames,
  dateStringVariable: symbol,
  dateObjectVariable: symbol,
  errorMessage: string,
): Frames {
  return new Frames(...frames.flatMap(($) => {
    const dateString = $[dateStringVariable];
    // Check if the date string is actually a string before attempting parsing
    if (typeof dateString !== 'string') {
      return [{ ...$, [Symbol.for('error')]: `Invalid date format: ${dateStringVariable.description} must be a string.` }];
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Return a new frame with an error if parsing failed
      return [{ ...$, [Symbol.for('error')]: errorMessage }];
    }
    // Return a new frame with the parsed date if successful
    return [{ ...$, [dateObjectVariable]: date }];
  }));
}

// --- General Error Handling Sync ---
// This sync will catch any Requesting.request that results in a frame
// having an 'error' binding, typically set by a query or a where clause's internal validation.
// This is a common pattern to centralize error responses.
export const BrontoBoardRequestError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, {}, { request }], // Any Requesting.request
  ),
  where: (frames) => {
    // Filter for frames where an error was explicitly bound
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions(
    // Respond to the original request with the captured error
    [Requesting.respond, { request, error }],
  ),
});

// --- initializeBB Syncs ---

// Sync to trigger the BrontoBoard.initializeBB action from a Requesting.request
export const InitializeBBRequest: Sync = (
  { request, user, calendar },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/initialize", user, calendar },
      { request },
    ],
  ),
  then: actions(
    // The output `request` is passed to link this action to its response syncs
    [BrontoBoard.initializeBB, { user, calendar }, { request }],
  ),
});

// Sync to respond to a successful BrontoBoard.initializeBB action
export const InitializeBBResponse: Sync = ({ request, brontoBoard }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

// Sync to respond to an error during BrontoBoard.initializeBB action
export const InitializeBBResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/initialize" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- createClass Syncs ---

// Sync to trigger the BrontoBoard.createClass action from a Requesting.request
export const CreateClassRequest: Sync = (
  { request, owner, brontoBoard, className, overview },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/create", owner, brontoBoard, className, overview },
      { request },
    ],
  ),
  then: actions(
    // The output `request` is passed to link this action to its response syncs
    [BrontoBoard.createClass, { owner, brontoBoard, className, overview }, {
      request,
    }],
  ),
});

// Sync to respond to a successful BrontoBoard.createClass action
export const CreateClassResponse: Sync = ({ request, class: classId }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId }], // `class` is aliased to `classId`
  ),
  then: actions(
    [Requesting.respond, { request, class: classId }],
  ),
});

// Sync to respond to an error during BrontoBoard.createClass action
export const CreateClassResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- addWork Syncs ---

// Sync to trigger the BrontoBoard.addWork action from a Requesting.request
export const AddWorkRequest: Sync = (
  { request, owner, class: classId, workName, dueDateStr, dueDate },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/add", owner, class: classId, workName, dueDate: dueDateStr },
      { request },
    ],
  ),
  where: async (frames) => {
    // Attempt to parse the date string from the request into a Date object
    frames = parseDateInFrames(
      frames,
      Symbol.for('dueDateStr'), // The variable holding the date string from the request
      Symbol.for('dueDate'),    // The variable to bind the parsed Date object
      "Invalid due date format. Please provide a valid date string (e.g., 'YYYY-MM-DDTHH:MM:SSZ').",
    );

    // If parsing failed for any frame (indicated by an 'error' binding),
    // ensure those error frames are propagated so the BrontoBoardRequestError sync can handle them.
    // Frames with errors should not proceed to the 'then' clause of this sync.
    return frames.filter(($) => $[Symbol.for('error')] === undefined);
  },
  then: actions(
    // Use the parsed `dueDate` variable in the concept action
    [BrontoBoard.addWork, { owner, class: classId, workName, dueDate }, {
      request,
    }],
  ),
});

// Sync to respond to a successful BrontoBoard.addWork action
export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

// Sync to respond to an error during BrontoBoard.addWork action
export const AddWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/add" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- changeWork Syncs ---

// Sync to trigger the BrontoBoard.changeWork action from a Requesting.request
export const ChangeWorkRequest: Sync = (
  { request, owner, work, newDueDateStr, dueDate },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/change", owner, work, newDueDate: newDueDateStr },
      { request },
    ],
  ),
  where: async (frames) => {
    // Attempt to parse the new due date string
    frames = parseDateInFrames(
      frames,
      Symbol.for('newDueDateStr'),
      Symbol.for('dueDate'),
      "Invalid new due date format. Please provide a valid date string (e.g., 'YYYY-MM-DDTHH:MM:SSZ').",
    );

    return frames.filter(($) => $[Symbol.for('error')] === undefined);
  },
  then: actions(
    // Use the parsed `dueDate` variable in the concept action
    [BrontoBoard.changeWork, { owner, work, dueDate }, { request }],
  ),
});

// Sync to respond to a successful BrontoBoard.changeWork action (returns Empty)
export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, {}], // Empty output pattern for Empty return
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Respond with a generic success status
  ),
});

// Sync to respond to an error during BrontoBoard.changeWork action
export const ChangeWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/change" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- removeWork Syncs ---

// Sync to trigger the BrontoBoard.removeWork action from a Requesting.request
export const RemoveWorkRequest: Sync = ({ request, owner, work }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/assignment/remove", owner, work },
      { request },
    ],
  ),
  then: actions(
    [BrontoBoard.removeWork, { owner, work }, { request }],
  ),
});

// Sync to respond to a successful BrontoBoard.removeWork action (returns Empty)
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, {}], // Empty output pattern for Empty return
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Respond with a generic success status
  ),
});

// Sync to respond to an error during BrontoBoard.removeWork action
export const RemoveWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/assignment/remove" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- addOH Syncs ---

// Sync to trigger the BrontoBoard.addOH action from a Requesting.request
export const AddOHRequest: Sync = (
  { request, owner, class: classId, OHTimeStr, OHTime, OHduration },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/officehours/add", owner, class: classId, OHTime: OHTimeStr, OHduration },
      { request },
    ],
  ),
  where: async (frames) => {
    // Attempt to parse the OHTime string
    frames = parseDateInFrames(
      frames,
      Symbol.for('OHTimeStr'),
      Symbol.for('OHTime'),
      "Invalid office hours start time format. Please provide a valid date string (e.g., 'YYYY-MM-DDTHH:MM:SSZ').",
    );

    return frames.filter(($) => $[Symbol.for('error')] === undefined);
  },
  then: actions(
    // Use the parsed `OHTime` variable in the concept action
    [BrontoBoard.addOH, { owner, class: classId, OHTime, OHduration }, {
      request,
    }],
  ),
});

// Sync to respond to a successful BrontoBoard.addOH action
export const AddOHResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

// Sync to respond to an error during BrontoBoard.addOH action
export const AddOHResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/add" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- changeOH Syncs ---

// Sync to trigger the BrontoBoard.changeOH action from a Requesting.request
export const ChangeOHRequest: Sync = (
  { request, owner, oh, newDateStr, newDate, newduration },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/officehours/change", owner, oh, newDate: newDateStr, newduration },
      { request },
    ],
  ),
  where: async (frames) => {
    // Attempt to parse the new date string
    frames = parseDateInFrames(
      frames,
      Symbol.for('newDateStr'),
      Symbol.for('newDate'),
      "Invalid new office hours start time format. Please provide a valid date string (e.g., 'YYYY-MM-DDTHH:MM:SSZ').",
    );

    return frames.filter(($) => $[Symbol.for('error')] === undefined);
  },
  then: actions(
    // Use the parsed `newDate` variable in the concept action
    [BrontoBoard.changeOH, { owner, oh, newDate, newduration }, { request }],
  ),
});

// Sync to respond to a successful BrontoBoard.changeOH action (returns Empty)
export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, {}], // Empty output pattern for Empty return
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }], // Respond with a generic success status
  ),
});

// Sync to respond to an error during BrontoBoard.changeOH action
export const ChangeOHResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/officehours/change" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Query Syncs ---

// Sync to handle request for all assignments associated with a specific class
export const GetAssignmentsForClassRequest: Sync = (
  { request, class: classId, assignments, assignmentItem },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/assignments", class: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture the original frame for potential empty results

    // Query for assignments. Each result will create a new frame with an 'assignmentItem' binding.
    frames = await frames.query(
      BrontoBoard._getAssignmentsForClass,
      { class: classId },
      { assignment: assignmentItem }, // Map the 'assignment' query output to 'assignmentItem' in the frame
    );

    // If no assignments are found, create a single frame with an empty array for 'assignments'
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [assignments]: [] });
    }

    // Collect all 'assignmentItem' bindings from the multiple frames into a single array
    // and bind it to the 'assignments' variable in a new frame.
    // Grouping by non-collected variables (which are just 'request' and 'classId' here)
    // usually results in one frame if those are unique per request.
    return frames.collectAs([assignmentItem], assignments);
  },
  then: actions(
    [Requesting.respond, { request, assignments }],
  ),
});

// Sync to handle request for all office hours associated with a specific class
export const GetOfficeHoursForClassRequest: Sync = (
  { request, class: classId, officeHours, officeHourItem },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/officehours", class: classId },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Query for office hours
    frames = await frames.query(
      BrontoBoard._getOfficeHoursForClass,
      { class: classId },
      { officeHour: officeHourItem }, // Map 'officeHour' query output to 'officeHourItem'
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [officeHours]: [] });
    }

    return frames.collectAs([officeHourItem], officeHours);
  },
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

// Sync to handle request for all classes associated with a specific BrontoBoard
export const GetClassesForBrontoBoardRequest: Sync = (
  { request, brontoBoard, classes, classItem },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/brontoboard/classes", brontoBoard },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Query for classes
    frames = await frames.query(
      BrontoBoard._getClassesForBrontoBoard,
      { brontoBoard },
      { class: classItem }, // Map 'class' query output to 'classItem'
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [classes]: [] });
    }

    return frames.collectAs([classItem], classes);
  },
  then: actions(
    [Requesting.respond, { request, classes }],
  ),
});

// Sync to handle request for all BrontoBoards owned by a specific user
export const GetBrontoBoardsForUserRequest: Sync = (
  { request, user, brontoBoards, brontoBoardItem },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/user/brontoboards", user },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Query for BrontoBoards
    frames = await frames.query(
      BrontoBoard._getBrontoBoardsForUser,
      { user },
      { brontoBoard: brontoBoardItem }, // Map 'brontoBoard' query output to 'brontoBoardItem'
    );

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [brontoBoards]: [] });
    }

    return frames.collectAs([brontoBoardItem], brontoBoards);
  },
  then: actions(
    [Requesting.respond, { request, brontoBoards }],
  ),
});
```