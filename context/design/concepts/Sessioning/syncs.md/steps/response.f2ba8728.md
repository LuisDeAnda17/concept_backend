---
timestamp: 'Mon Nov 03 2025 19:41:53 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_194153.f294bfba.md]]'
content_id: f2ba8728b987db83d6c1243d69c355c8618fcdacee26600ce35582614095a3f1
---

# response:

Here are the synchronization implementations for the `BrontoBoard` concept, organized into separate files under `src/syncs/brontoboard/` for clarity and modularity.

Each synchronization follows a pattern:

1. **`when`**: Captures an incoming `Requesting.request` along with its parameters.
2. **`where`**:
   * Authenticates the user by querying `Sessioning._getUser` based on the `session` ID from the request. If authentication fails, it prepares an error frame.
   * Calls the relevant `BrontoBoard` action, passing the authenticated `user` (as `owner`) and other request parameters.
   * Inspects the result of the `BrontoBoard` action. If it's an error, it propagates that error into the frame. If it's successful, it adds the success-specific return value (like `brontoBoard`, `class`, `assignment`, `officeHours`) or a generic `status: "ok"` for actions returning `Empty`.
3. **`then`**: Fires `Requesting.respond` with the prepared `request` ID, the success data/status, or the error message. The `Requesting` concept is assumed to intelligently handle whether `error` or a success field is present in the response object.

***

### `src/syncs/brontoboard/initialize.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const InitializeBrontoBoardRequest: Sync = (
  { request, session, calendar, user, brontoBoard, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init", session, calendar }, {
      request,
    }],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Capture original request data

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      // Session invalid or user not found, prepare an error response frame
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const userBinding = userFrames[0][user] as ID; // Get the user ID from the authenticated frame

    // 2. Call BrontoBoard.initializeBB action
    let bbResultFrames = await userFrames.query(
      BrontoBoard.initializeBB,
      { user: userBinding, calendar: originalRequestFrame[calendar] as ID },
      { brontoBoard, error }, // Expected outputs from BrontoBoard.initializeBB
    );

    // Expecting one result from initializeBB. Prepare a single response frame.
    const bbResultFrame = bbResultFrames[0];

    if (bbResultFrame && bbResultFrame[brontoBoard]) {
      // Success: Return frame with new brontoBoard ID
      return new Frames({
        ...originalRequestFrame,
        brontoBoard: bbResultFrame[brontoBoard],
      });
    } else if (bbResultFrame && bbResultFrame[error]) {
      // Error from BrontoBoard.initializeBB: Return frame with that error
      return new Frames({
        ...originalRequestFrame,
        error: bbResultFrame[error],
      });
    } else {
      // Unexpected scenario (e.g., concept action didn't return expected keys)
      return new Frames({
        ...originalRequestFrame,
        error: "An unknown error occurred during BrontoBoard initialization.",
      });
    }
  },
  then: actions(
    // Requesting.respond will receive the frame prepared in 'where'.
    // It should prioritize 'error' if present, otherwise use 'brontoBoard'.
    [Requesting.respond, { request, brontoBoard, error }],
  ),
});
```

***

### `src/syncs/brontoboard/create_class.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const CreateClassRequest: Sync = (
  { request, session, brontoBoard: bbId, className, overview, user, class: classResult, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/create", session, brontoBoard: bbId, className, overview },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // 2. Call BrontoBoard.createClass action
    let classResultFrames = await userFrames.query(
      BrontoBoard.createClass,
      {
        owner: ownerBinding,
        brontoBoard: originalRequestFrame[bbId] as ID,
        className: originalRequestFrame[className] as string,
        overview: originalRequestFrame[overview] as string,
      },
      { class: classResult, error }, // Expected outputs from BrontoBoard.createClass
    );

    const classResultFrame = classResultFrames[0];

    if (classResultFrame && classResultFrame[classResult]) {
      // Success
      return new Frames({
        ...originalRequestFrame,
        class: classResultFrame[classResult],
      });
    } else if (classResultFrame && classResultFrame[error]) {
      // Error from BrontoBoard.createClass
      return new Frames({ ...originalRequestFrame, error: classResultFrame[error] });
    } else {
      return new Frames({
        ...originalRequestFrame,
        error: "An unknown error occurred during class creation.",
      });
    }
  },
  then: actions(
    [Requesting.respond, { request, class: classResult, error }],
  ),
});
```

***

### `src/syncs/brontoboard/add_work.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const AddWorkRequest: Sync = (
  { request, session, class: classId, workName, dueDate, user, assignment, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/add-assignment", session, class: classId, workName, dueDate },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // Ensure dueDate is a Date object (Requesting should ideally handle this from ISO string)
    const parsedDueDate = new Date(originalRequestFrame[dueDate] as string | Date);
    if (isNaN(parsedDueDate.getTime())) {
      return new Frames({ ...originalRequestFrame, error: "Invalid due date format." });
    }

    // 2. Call BrontoBoard.addWork action
    let assignmentResultFrames = await userFrames.query(
      BrontoBoard.addWork,
      {
        owner: ownerBinding,
        class: originalRequestFrame[classId] as ID,
        workName: originalRequestFrame[workName] as string,
        dueDate: parsedDueDate,
      },
      { assignment, error }, // Expected outputs from BrontoBoard.addWork
    );

    const assignmentResultFrame = assignmentResultFrames[0];

    if (assignmentResultFrame && assignmentResultFrame[assignment]) {
      // Success
      return new Frames({
        ...originalRequestFrame,
        assignment: assignmentResultFrame[assignment],
      });
    } else if (assignmentResultFrame && assignmentResultFrame[error]) {
      // Error from BrontoBoard.addWork
      return new Frames({
        ...originalRequestFrame,
        error: assignmentResultFrame[error],
      });
    } else {
      return new Frames({
        ...originalRequestFrame,
        error: "An unknown error occurred during assignment creation.",
      });
    }
  },
  then: actions(
    [Requesting.respond, { request, assignment, error }],
  ),
});
```

***

### `src/syncs/brontoboard/change_work.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const ChangeWorkRequest: Sync = (
  { request, session, work, dueDate, user, status, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/change-assignment", session, work, dueDate },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // Ensure dueDate is a Date object
    const parsedDueDate = new Date(originalRequestFrame[dueDate] as string | Date);
    if (isNaN(parsedDueDate.getTime())) {
      return new Frames({ ...originalRequestFrame, error: "Invalid new due date format." });
    }

    // 2. Call BrontoBoard.changeWork action
    let changeResultFrames = await userFrames.query(
      BrontoBoard.changeWork,
      {
        owner: ownerBinding,
        work: originalRequestFrame[work] as ID,
        dueDate: parsedDueDate,
      },
      { error }, // BrontoBoard.changeWork returns Empty | { error }
    );

    const changeResultFrame = changeResultFrames[0];

    if (changeResultFrame && changeResultFrame[error]) {
      // Error from BrontoBoard.changeWork
      return new Frames({ ...originalRequestFrame, error: changeResultFrame[error] });
    } else {
      // Success (Empty return means successful change)
      return new Frames({ ...originalRequestFrame, status: "ok" });
    }
  },
  then: actions(
    // Requesting.respond will receive either status or error
    [Requesting.respond, { request, status, error }],
  ),
});
```

***

### `src/syncs/brontoboard/remove_work.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const RemoveWorkRequest: Sync = (
  { request, session, work, user, status, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/remove-assignment", session, work },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // 2. Call BrontoBoard.removeWork action
    let removeResultFrames = await userFrames.query(
      BrontoBoard.removeWork,
      {
        owner: ownerBinding,
        work: originalRequestFrame[work] as ID,
      },
      { error }, // BrontoBoard.removeWork returns Empty | { error }
    );

    const removeResultFrame = removeResultFrames[0];

    if (removeResultFrame && removeResultFrame[error]) {
      // Error from BrontoBoard.removeWork
      return new Frames({ ...originalRequestFrame, error: removeResultFrame[error] });
    } else {
      // Success
      return new Frames({ ...originalRequestFrame, status: "ok" });
    }
  },
  then: actions(
    [Requesting.respond, { request, status, error }],
  ),
});
```

***

### `src/syncs/brontoboard/add_office_hours.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const AddOfficeHoursRequest: Sync = (
  { request, session, class: classId, OHTime, OHduration, user, officeHours, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/add-office-hours", session, class: classId, OHTime, OHduration },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // Ensure OHTime is a Date object
    const parsedOHTime = new Date(originalRequestFrame[OHTime] as string | Date);
    if (isNaN(parsedOHTime.getTime())) {
      return new Frames({ ...originalRequestFrame, error: "Invalid office hours time format." });
    }
    const parsedOHDuration = originalRequestFrame[OHduration] as number;
    if (typeof parsedOHDuration !== "number") {
      return new Frames({ ...originalRequestFrame, error: "Invalid office hours duration format." });
    }

    // 2. Call BrontoBoard.addOH action
    let ohResultFrames = await userFrames.query(
      BrontoBoard.addOH,
      {
        owner: ownerBinding,
        class: originalRequestFrame[classId] as ID,
        OHTime: parsedOHTime,
        OHduration: parsedOHDuration,
      },
      { officeHours, error }, // Expected outputs from BrontoBoard.addOH
    );

    const ohResultFrame = ohResultFrames[0];

    if (ohResultFrame && ohResultFrame[officeHours]) {
      // Success
      return new Frames({
        ...originalRequestFrame,
        officeHours: ohResultFrame[officeHours],
      });
    } else if (ohResultFrame && ohResultFrame[error]) {
      // Error from BrontoBoard.addOH
      return new Frames({ ...originalRequestFrame, error: ohResultFrame[error] });
    } else {
      return new Frames({
        ...originalRequestFrame,
        error: "An unknown error occurred during office hours creation.",
      });
    }
  },
  then: actions(
    [Requesting.respond, { request, officeHours, error }],
  ),
});
```

***

### `src/syncs/brontoboard/change_office_hours.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, BrontoBoard } from "@concepts";
import { ID } from "@utils/types.ts";

export const ChangeOfficeHoursRequest: Sync = (
  { request, session, oh, newDate, newduration, user, status, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/brontoboard/class/change-office-hours", session, oh, newDate, newduration },
      { request },
    ],
  ),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user via session
    let userFrames = await frames.query(
      Sessioning._getUser,
      { session: originalRequestFrame[session] as ID },
      { user },
    );

    if (userFrames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        error: "Authentication required or session invalid.",
      });
    }

    const ownerBinding = userFrames[0][user] as ID;

    // Ensure newDate is a Date object
    const parsedNewDate = new Date(originalRequestFrame[newDate] as string | Date);
    if (isNaN(parsedNewDate.getTime())) {
      return new Frames({ ...originalRequestFrame, error: "Invalid new date format for office hours." });
    }
    const parsedNewDuration = originalRequestFrame[newduration] as number;
    if (typeof parsedNewDuration !== "number") {
      return new Frames({ ...originalRequestFrame, error: "Invalid new duration format for office hours." });
    }

    // 2. Call BrontoBoard.changeOH action
    let changeResultFrames = await userFrames.query(
      BrontoBoard.changeOH,
      {
        owner: ownerBinding,
        oh: originalRequestFrame[oh] as ID,
        newDate: parsedNewDate,
        newduration: parsedNewDuration,
      },
      { error }, // BrontoBoard.changeOH returns Empty | { error }
    );

    const changeResultFrame = changeResultFrames[0];

    if (changeResultFrame && changeResultFrame[error]) {
      // Error from BrontoBoard.changeOH
      return new Frames({ ...originalRequestFrame, error: changeResultFrame[error] });
    } else {
      // Success
      return new Frames({ ...originalRequestFrame, status: "ok" });
    }
  },
  then: actions(
    [Requesting.respond, { request, status, error }],
  ),
});
```

***

### Import all syncs in `src/syncs/syncs.ts`

For `deno run build` to pick up these syncs, you'll need an `src/syncs/syncs.ts` file that re-exports them all:

```typescript
// src/syncs/syncs.ts

export * from "./brontoboard/initialize.sync.ts";
export * from "./brontoboard/create_class.sync.ts";
export * from "./brontoboard/add_work.sync.ts";
export * from "./brontoboard/change_work.sync.ts";
export * from "./brontoboard/remove_work.sync.ts";
export * from "./brontoboard/add_office_hours.sync.ts";
export * from "./brontoboard/change_office_hours.sync.ts";
```

### Important Considerations:

* **`@concepts` Import:** The code assumes that `BrontoBoard` and `Sessioning` are correctly exposed through the `@concepts` alias after running `deno run build`.
* **Type Assertions (`as ID`, `as string`, `as number`, `as Date`):** These are used to guide TypeScript, assuming that the data coming from `Requesting.request` will conform to the expected types based on your API design (e.g., `brontoBoard` will be an `ID`, `className` a `string`, `dueDate` will be a `Date` object or an ISO string parseable to a `Date`). If `Requesting` doesn't automatically parse date strings to `Date` objects, a `frames.map` or additional logic in the `where` clause might be needed to perform this conversion before passing to concept actions.
* **Error Handling in `Requesting.respond`:** The `then` clauses pass an object like `{ request, success_value, error }` to `Requesting.respond`. It is critical that the `Requesting` concept's `respond` action correctly interprets this: if `error` is present, it should generate an error response (e.g., HTTP 4xx/5xx with the error message); otherwise, it should generate a success response (e.g., HTTP 200 with `success_value` or `status`).
* **`Date` Handling:** The `Requesting` concept (which processes incoming HTTP requests) typically passes primitive types (strings, numbers, booleans) from the JSON body. If your `BrontoBoardConcept` actions expect `Date` objects, you'll need to explicitly parse date strings (e.g., `new Date(originalRequestFrame[dueDate] as string)`) within the `where` clause, as demonstrated in `add_work.sync.ts` and `change_work.sync.ts`.
