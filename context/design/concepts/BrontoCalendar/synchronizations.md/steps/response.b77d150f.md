---
timestamp: 'Mon Nov 03 2025 14:38:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_143800.2bff0f12.md]]'
content_id: b77d150ff060bea8e876ed19459a30f22fe2b4904ac0d536390335408a1b20c5
---

# response:

Here are the synchronizations for the `BrontoCalendar` concept, mapping HTTP requests (via the `Requesting` concept) to `BrontoCalendar` actions and queries, and then responding to the client.

For these synchronizations, we will assume that `owner` (of a calendar) is passed directly in the request body or path, or can be derived from a `session` if a `Sessioning` concept were integrated. For simplicity, we'll use `owner` directly from the request for now.

**File: `src/syncs/bronto_calendar.sync.ts`**

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, BrontoCalendar } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is needed for generic IDs

/**
 * --- Calendar Management Syncs ---
 */

// 1. Request to Create a Calendar
export const CreateCalendarRequest: Sync = ({ request, owner }) => ({
  when: actions(
    [Requesting.request, { path: "/calendars/create", owner }, { request }],
  ),
  then: actions(
    [BrontoCalendar.createCalendar, { user: owner }],
  ),
});

// 2. Respond to Calendar Creation (Success)
export const CreateCalendarResponse: Sync = ({ request, calendarId }) => ({
  when: actions(
    [Requesting.request, { path: "/calendars/create" }, { request }],
    [BrontoCalendar.createCalendar, {}, { calendarId }],
  ),
  then: actions(
    [Requesting.respond, { request, calendarId }],
  ),
});

// 2b. Respond to Calendar Creation (Error)
export const CreateCalendarErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/calendars/create" }, { request }],
    [BrontoCalendar.createCalendar, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 3. Request to Get Calendar for User
export const GetCalendarForUserRequest: Sync = ({ request, owner }) => ({
  when: actions(
    // Path parameter for owner: GET /calendars/:owner
    [Requesting.request, { path: `/calendars/${owner}` }, { request }],
  ),
  where: async (frames) => {
    // Query the calendar for the specified owner
    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: owner }, { calendar: "calendarDoc" });
    // Handle case where calendar is not found: return an empty object for `calendar`
    if (frames.length === 0) {
      // If no calendar found, create a frame to respond with null/empty
      return new Frames({ ...frames[0], calendar: null });
    }
    return frames;
  },
  then: actions(
    // Respond with the found calendar document or null
    [Requesting.respond, { request, calendar: "calendarDoc" }],
  ),
});

// 3b. Handle case where _getCalendarForUser might return {error: ...}
export const GetCalendarForUserErrorResponse: Sync = ({ request, owner, error }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/${owner}` }, { request }],
    [BrontoCalendar._getCalendarForUser, { user: owner }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * --- Assignment Management Syncs ---
 */

// 4. Request to Create an Assignment
export const CreateAssignmentRequest: Sync = ({ request, classId, name, dueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/create", classId, name, dueDate: "dueDateStr" }, { request }],
  ),
  where: (frames) => {
    // Convert dueDate string to Date object
    return frames.map(($) => ({ ...$, dueDate: new Date($[dueDate]) }));
  },
  then: actions(
    [BrontoCalendar.createAssignment, { classId, name, dueDate }],
  ),
});

// 4b. Respond to Assignment Creation (Success)
export const CreateAssignmentResponse: Sync = ({ request, assignmentId }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/create" }, { request }],
    [BrontoCalendar.createAssignment, {}, { assignmentId }],
  ),
  then: actions(
    [Requesting.respond, { request, assignmentId }],
  ),
});

// 4c. Respond to Assignment Creation (Error)
export const CreateAssignmentErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/create" }, { request }],
    [BrontoCalendar.createAssignment, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 5. Request to Assign Work (Assignment) to Calendar
export const AssignWorkRequest: Sync = ({ request, owner, assignmentId }) => ({
  when: actions(
    // Path parameter for owner: POST /calendars/:owner/assign-work
    [Requesting.request, { path: `/calendars/${owner}/assign-work`, assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.assignWork, { owner, assignmentId }],
  ),
});

// 5b. Respond to Assign Work (Success)
export const AssignWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/assign-work` }, { request }],
    [BrontoCalendar.assignWork, {}, {}], // Empty object for success return
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 5c. Respond to Assign Work (Error)
export const AssignWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/assign-work` }, { request }],
    [BrontoCalendar.assignWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 6. Request to Remove Work (Assignment) from Calendar
export const RemoveWorkRequest: Sync = ({ request, owner, assignmentId }) => ({
  when: actions(
    // Path parameter for owner: POST /calendars/:owner/remove-work
    [Requesting.request, { path: `/calendars/${owner}/remove-work`, assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.removeWork, { owner, assignmentId }],
  ),
});

// 6b. Respond to Remove Work (Success)
export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/remove-work` }, { request }],
    [BrontoCalendar.removeWork, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 6c. Respond to Remove Work (Error)
export const RemoveWorkErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/remove-work` }, { request }],
    [BrontoCalendar.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 7. Request to Delete an Assignment (completely from the concept)
export const DeleteAssignmentRequest: Sync = ({ request, assignmentId }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/delete", assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.deleteAssignment, { assignmentId }],
  ),
});

// 7b. Respond to Delete Assignment (Success)
export const DeleteAssignmentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/delete" }, { request }],
    [BrontoCalendar.deleteAssignment, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 7c. Respond to Delete Assignment (Error)
export const DeleteAssignmentErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/assignments/delete" }, { request }],
    [BrontoCalendar.deleteAssignment, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 8. Request to Get Assignments on a Specific Day
export const GetAssignmentsOnDayRequest: Sync = ({ request, owner, date: dateStr, calendarId }) => ({
  when: actions(
    // Path: GET /calendars/:owner/assignments/:date
    [Requesting.request, { path: `/calendars/${owner}/assignments/${dateStr}` }, { request }],
  ),
  where: async (frames) => {
    // 1. Get the calendar for the owner first
    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: owner }, { calendar: "calendarDoc" });
    if (frames.length === 0 || frames[0].calendar === null) {
      // If no calendar, respond with an empty array of assignments
      return new Frames({ ...frames[0], assignments: [] as any[] }); // Cast to any[] to avoid type issues for empty array
    }

    // Bind calendarId for subsequent queries
    const ownerCalendarId = frames[0].calendar._id;
    frames = frames.map(f => ({ ...f, calendarId: ownerCalendarId }));

    // 2. Convert date string to Date object
    const targetDate = new Date(dateStr);
    frames = frames.map(($) => ({ ...$, date: targetDate }));

    // 3. Query for assignments on that day
    const originalFrame = frames[0]; // Capture for error/empty handling
    let assignmentsFrames = await frames.query(BrontoCalendar._getAssignmentsOnDay, { calendarId, date: targetDate }, { assignment: "assignmentDoc" });

    // Handle case where _getAssignmentsOnDay returns an error
    if (assignmentsFrames.length > 0 && assignmentsFrames[0].error) {
        return new Frames({ ...originalFrame, error: assignmentsFrames[0].error });
    }

    // If no assignments found, ensure a frame is passed with an empty array
    if (assignmentsFrames.length === 0) {
        // If there were no assignments, ensure we still respond with an empty list
        return new Frames({ ...originalFrame, assignments: [] });
    }

    // Collect all assignment documents into a single array
    return assignmentsFrames.collectAs(["assignmentDoc"], "assignments");
  },
  then: actions(
    // Respond with the collected assignments
    [Requesting.respond, { request, assignments: "assignments" }],
  ),
});

// 8b. Get Assignments on Day Error Response (if _getAssignmentsOnDay returns error directly)
export const GetAssignmentsOnDayErrorResponse: Sync = ({ request, owner, error }) => ({
    when: actions(
        [Requesting.request, { path: `/calendars/${owner}/assignments/:date` }, { request }],
        [BrontoCalendar._getAssignmentsOnDay, {}, { error }], // Directly catch error from query
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});


/**
 * --- Office Hours Management Syncs ---
 */

// 9. Request to Create Office Hours
export const CreateOfficeHoursRequest: Sync = ({ request, classId, startTime, duration }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/create", classId, startTime: "startTimeStr", duration }, { request }],
  ),
  where: (frames) => {
    // Convert startTime string to Date object
    return frames.map(($) => ({ ...$, startTime: new Date($[startTime]) }));
  },
  then: actions(
    [BrontoCalendar.createOfficeHours, { classId, startTime, duration }],
  ),
});

// 9b. Respond to Office Hours Creation (Success)
export const CreateOfficeHoursResponse: Sync = ({ request, officeHoursId }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/create" }, { request }],
    [BrontoCalendar.createOfficeHours, {}, { officeHoursId }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHoursId }],
  ),
});

// 9c. Respond to Office Hours Creation (Error)
export const CreateOfficeHoursErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/create" }, { request }],
    [BrontoCalendar.createOfficeHours, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 10. Request to Assign Office Hours to Calendar
export const AssignOfficeHoursRequest: Sync = ({ request, owner, officeHoursId }) => ({
  when: actions(
    // Path parameter for owner: POST /calendars/:owner/assign-oh
    [Requesting.request, { path: `/calendars/${owner}/assign-oh`, officeHoursId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.assignOH, { owner, officeHoursId }],
  ),
});

// 10b. Respond to Assign Office Hours (Success)
export const AssignOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/assign-oh` }, { request }],
    [BrontoCalendar.assignOH, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 10c. Respond to Assign Office Hours (Error)
export const AssignOfficeHoursErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/assign-oh` }, { request }],
    [BrontoCalendar.assignOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 11. Request to Change Office Hours
export const ChangeOfficeHoursRequest: Sync = ({ request, owner, officeHoursId, newDate, newDuration }) => ({
  when: actions(
    // Path parameter for owner: POST /calendars/:owner/change-oh
    [Requesting.request, { path: `/calendars/${owner}/change-oh`, officeHoursId, newDate: "newDateStr", newDuration }, { request }],
  ),
  where: (frames) => {
    // Convert newDate string to Date object
    return frames.map(($) => ({ ...$, newDate: new Date($[newDate]) }));
  },
  then: actions(
    [BrontoCalendar.changeOH, { owner, officeHoursId, newDate, newDuration }],
  ),
});

// 11b. Respond to Change Office Hours (Success)
export const ChangeOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/change-oh` }, { request }],
    [BrontoCalendar.changeOH, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 11c. Respond to Change Office Hours (Error)
export const ChangeOfficeHoursErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: `/calendars/:owner/change-oh` }, { request }],
    [BrontoCalendar.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 12. Request to Delete Office Hours (completely from the concept)
export const DeleteOfficeHoursRequest: Sync = ({ request, officeHoursId }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/delete", officeHoursId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.deleteOfficeHours, { officeHoursId }],
  ),
});

// 12b. Respond to Delete Office Hours (Success)
export const DeleteOfficeHoursResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/delete" }, { request }],
    [BrontoCalendar.deleteOfficeHours, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, status: "success" }],
  ),
});

// 12c. Respond to Delete Office Hours (Error)
export const DeleteOfficeHoursErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/office-hours/delete" }, { request }],
    [BrontoCalendar.deleteOfficeHours, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// 13. Request to Get Office Hours on a Specific Day
export const GetOfficeHoursOnDayRequest: Sync = ({ request, owner, date: dateStr, calendarId }) => ({
  when: actions(
    // Path: GET /calendars/:owner/office-hours/:date
    [Requesting.request, { path: `/calendars/${owner}/office-hours/${dateStr}` }, { request }],
  ),
  where: async (frames) => {
    // 1. Get the calendar for the owner first
    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: owner }, { calendar: "calendarDoc" });
    if (frames.length === 0 || frames[0].calendar === null) {
      // If no calendar, respond with an empty array of office hours
      return new Frames({ ...frames[0], officeHours: [] as any[] });
    }

    // Bind calendarId for subsequent queries
    const ownerCalendarId = frames[0].calendar._id;
    frames = frames.map(f => ({ ...f, calendarId: ownerCalendarId }));

    // 2. Convert date string to Date object
    const targetDate = new Date(dateStr);
    frames = frames.map(($) => ({ ...$, date: targetDate }));

    // 3. Query for office hours on that day
    const originalFrame = frames[0]; // Capture for error/empty handling
    let officeHoursFrames = await frames.query(BrontoCalendar._getOfficeHoursOnDay, { calendarId, date: targetDate }, { officeHour: "officeHourDoc" });

    // Handle case where _getOfficeHoursOnDay returns an error
    if (officeHoursFrames.length > 0 && officeHoursFrames[0].error) {
        return new Frames({ ...originalFrame, error: officeHoursFrames[0].error });
    }

    // If no office hours found, ensure a frame is passed with an empty array
    if (officeHoursFrames.length === 0) {
        return new Frames({ ...originalFrame, officeHours: [] });
    }

    // Collect all office hours documents into a single array
    return officeHoursFrames.collectAs(["officeHourDoc"], "officeHours");
  },
  then: actions(
    // Respond with the collected office hours
    [Requesting.respond, { request, officeHours: "officeHours" }],
  ),
});

// 13b. Get Office Hours on Day Error Response (if _getOfficeHoursOnDay returns error directly)
export const GetOfficeHoursOnDayErrorResponse: Sync = ({ request, owner, error }) => ({
    when: actions(
        [Requesting.request, { path: `/calendars/${owner}/office-hours/:date` }, { request }],
        [BrontoCalendar._getOfficeHoursOnDay, {}, { error }], // Directly catch error from query
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});
```

### Explanation and Usage Notes:

1. **Imports**: We import `actions`, `Sync`, `Frames` from `@engine` and `Requesting`, `BrontoCalendar` from `@concepts`. `ID` is imported from `@utils/types.ts` for type consistency.
2. **`Requesting.request` Pattern**:
   * `path`: Matches the URL path.
     * For `POST` requests, additional parameters like `owner`, `classId`, `name`, `dueDate`, `assignmentId`, `officeHoursId`, `newDate`, `newDuration` are expected in the request body (parsed by the `Requesting` concept).
     * For `GET` requests involving path parameters (e.g., `/calendars/:owner`), the framework automatically extracts these into variables (e.g., `owner` will be available directly).
   * `request`: This is the output variable for the `Requesting.request` action, which binds the unique ID of the incoming HTTP request. This ID is crucial for `Requesting.respond` to send the response back to the correct client.
3. **`where` Clause for Date Conversion**: The `BrontoCalendar` concept methods expect `Date` objects for `dueDate`, `startTime`, and `newDate`. The `Requesting.request` often receives these as string representations (e.g., from JSON bodies or URL path). The `where` clause is used to parse these strings into `Date` objects using `new Date($[variableName])`.
4. **Querying and `Frames`**:
   * Queries like `_getCalendarForUser`, `_getAssignmentsOnDay`, `_getOfficeHoursOnDay` return arrays of objects.
   * The `where` clause chains `frames.query()` calls. Each `.query()` takes the current set of frames, performs the query, and potentially adds new bindings (or new frames for multi-result queries).
   * **Handling Empty Query Results**:
     * For queries like `_getCalendarForUser` that might return `null` (no calendar found), the `frames.query` will result in `frames.length === 0`. The code explicitly checks for this and creates a new `Frames` object with `calendar: null` to ensure a response is always sent, preventing a timeout.
     * For queries like `_getAssignmentsOnDay` or `_getOfficeHoursOnDay` that return an empty array if no items are found, the `collectAs` helper would normally result in `frames.length === 0`. The explicit `if (assignmentsFrames.length === 0)` check ensures an empty `assignments: []` or `officeHours: []` array is returned in the response.
   * **`collectAs`**: Used in `GetAssignmentsOnDayRequest` and `GetOfficeHoursOnDayRequest` to transform multiple frames (each representing one assignment/office hour) back into a single frame containing an array of these items, suitable for a JSON response.
5. **Error Handling**:
   * Each action and query method in `BrontoCalendarConcept` returns an object with `{ error: string }` on failure.
   * Separate synchronizations are created (e.g., `CreateCalendarErrorResponse`) to catch these error outputs and respond with the error message.
   * The `Get...OnDayRequest` syncs also include checks for errors returned directly by the queries.
6. **Path Parameters in `Requesting.request`**: Deno's `Requesting` concept automatically parses path parameters. For example, in `Requesting.request, { path: `/calendars/${owner}` }, { request }`, the `owner` variable will be bound to the value from the URL (e.g., `123` if the path was `/calendars/123`). This allows these variables to be directly used in the `then` or `where` clauses.
7. **Generic `ID` types**: The `ID` type from `@utils/types.ts` is used for consistency with concept design's polymorphic type parameters, which are treated as opaque identifiers.

These synchronizations cover the full request-response cycle for the `BrontoCalendar` concept, from handling incoming HTTP requests to invoking concept logic and sending back structured responses (or errors).
