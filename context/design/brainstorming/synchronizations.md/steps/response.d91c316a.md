---
timestamp: 'Mon Nov 03 2025 16:15:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_161500.367f3b4f.md]]'
content_id: d91c316a6162adb68b9ef0a2e7eeb9837c8f1f0e77e0f2e95a68dea69184354c
---

# response:

Here are the synchronization implementations for the `UserAuthentication`, `BrontoBoard`, and `BrontoCalendar` concepts, as well as cross-concept integrations, following the specified TypeScript DSL and design principles.

I will assume that when a `Date` object is expected as an input to a concept action (like `dueDate`, `OHTime`, `startTime`, `newDate`), and it originates from a `Requesting.request`, it will be passed as an ISO 8601 string in the request payload. The synchronization's `where` clause will convert this string to a `Date` object before passing it to the concept action. This is a common practice for handling dates in API requests.

The prompt specified "No Sessioning concept is used". This implies that for actions requiring a `user` or `owner` (for authorization/association), the `user` or `owner` ID must be explicitly passed in the `Requesting.request` payload (e.g., in the body or as a query parameter).

***

### 1. `src/syncs/user_authentication.sync.ts`

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, UserAuthentication } from "@concepts";

/**
 * Sync: RegisterUserRequest
 * Purpose: Handles incoming HTTP requests to register a new user.
 * Maps the request payload to the UserAuthentication.register action.
 */
export const RegisterUserRequest: Sync = ({ request, username, password, user, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register", username, password }, { request }],
  ),
  then: actions(
    // Attempt to register the user
    [UserAuthentication.register, { username, password }, { user, error }],
    // Respond to the original request based on the outcome
    [Requesting.respond, { request, user, error }],
  ),
});

/**
 * Sync: AuthenticateUserRequest
 * Purpose: Handles incoming HTTP requests to authenticate an existing user.
 * Maps the request payload to the UserAuthentication.authenticate action.
 */
export const AuthenticateUserRequest: Sync = ({ request, username, password, user, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login", username, password }, { request }],
  ),
  then: actions(
    // Attempt to authenticate the user
    [UserAuthentication.authenticate, { username, password }, { user, error }],
    // Respond to the original request based on the outcome
    [Requesting.respond, { request, user, error }],
  ),
});

// Note: No 'where' clause is typically needed for simple authentication/registration requests,
// as the concept itself handles the logic and returns success/error directly.
```

***

### 2. `src/syncs/bronto_board.sync.ts`

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, BrontoBoard } from "@concepts";

/**
 * Sync: InitializeBrontoBoardRequest
 * Purpose: Handles HTTP requests to initialize a BrontoBoard for a user.
 * Assumes 'owner' and 'calendar' IDs are provided in the request body.
 */
export const InitializeBrontoBoardRequest: Sync = ({ request, owner, calendar, brontoBoard, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/init", owner, calendar }, { request }],
  ),
  then: actions(
    [BrontoBoard.initializeBB, { user: owner, calendar }, { brontoBoard, error }],
    [Requesting.respond, { request, brontoBoard, error }],
  ),
});

/**
 * Sync: CreateClassRequest
 * Purpose: Handles HTTP requests to create a new class within a BrontoBoard.
 * Assumes 'owner', 'brontoBoard' ID, 'className', and 'overview' are provided in the request.
 */
export const CreateClassRequest: Sync = ({ request, owner, brontoBoard, className, overview, class: newClass, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/create", owner, brontoBoard, className, overview }, { request }],
  ),
  then: actions(
    [BrontoBoard.createClass, { owner, brontoBoard, className, overview }, { class: newClass, error }],
    [Requesting.respond, { request, class: newClass, error }],
  ),
});

/**
 * Sync: AddWorkRequest
 * Purpose: Handles HTTP requests to add an assignment (work) to a class in BrontoBoard.
 * Converts `dueDate` string from request to a `Date` object.
 */
export const AddWorkRequest: Sync = ({ request, owner, class: classId, workName, dueDateString, assignment, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/add-work", owner, class: classId, workName, dueDate: dueDateString }, { request }],
  ),
  where: async (frames) => {
    // Convert dueDateString to a Date object
    return frames.map(($) => {
      try {
        const dueDate = new Date($[dueDateString]);
        if (isNaN(dueDate.getTime())) {
          return { ...$, error: "Invalid dueDate format." };
        }
        return { ...$, dueDate };
      } catch (e) {
        return { ...$, error: `Error parsing dueDate: ${e.message}` };
      }
    }).filter(($) => !$.error); // Filter out frames with date parsing errors
  },
  then: actions(
    // The 'dueDate' variable is now available from the 'where' clause
    [BrontoBoard.addWork, { owner, class: classId, workName, dueDate }, { assignment, error }],
    [Requesting.respond, { request, assignment, error }],
  ),
});

/**
 * Sync: ChangeWorkRequest
 * Purpose: Handles HTTP requests to change the due date of an assignment in BrontoBoard.
 * Converts `dueDate` string from request to a `Date` object.
 */
export const ChangeWorkRequest: Sync = ({ request, owner, work, dueDateString, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/change-work", owner, work, dueDate: dueDateString }, { request }],
  ),
  where: async (frames) => {
    // Convert dueDateString to a Date object
    return frames.map(($) => {
      try {
        const dueDate = new Date($[dueDateString]);
        if (isNaN(dueDate.getTime())) {
          return { ...$, error: "Invalid dueDate format." };
        }
        return { ...$, dueDate };
      } catch (e) {
        return { ...$, error: `Error parsing dueDate: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoBoard.changeWork, { owner, work, dueDate }, { error }],
    // Respond directly with an empty object for success or error
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: RemoveWorkRequest
 * Purpose: Handles HTTP requests to remove an assignment from a class in BrontoBoard.
 */
export const RemoveWorkRequest: Sync = ({ request, owner, work, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/remove-work", owner, work }, { request }],
  ),
  then: actions(
    [BrontoBoard.removeWork, { owner, work }, { error }],
    // Respond directly with an empty object for success or error
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: AddOfficeHoursRequest
 * Purpose: Handles HTTP requests to add office hours to a class in BrontoBoard.
 * Converts `OHTime` string from request to a `Date` object.
 */
export const AddOfficeHoursRequest: Sync = ({ request, owner, class: classId, OHTimeString, OHduration, officeHours, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/add-oh", owner, class: classId, OHTime: OHTimeString, OHduration }, { request }],
  ),
  where: async (frames) => {
    // Convert OHTimeString to a Date object
    return frames.map(($) => {
      try {
        const OHTime = new Date($[OHTimeString]);
        if (isNaN(OHTime.getTime())) {
          return { ...$, error: "Invalid OHTime format." };
        }
        return { ...$, OHTime };
      } catch (e) {
        return { ...$, error: `Error parsing OHTime: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoBoard.addOH, { owner, class: classId, OHTime, OHduration }, { officeHours, error }],
    [Requesting.respond, { request, officeHours, error }],
  ),
});

/**
 * Sync: ChangeOfficeHoursRequest
 * Purpose: Handles HTTP requests to change office hours details in BrontoBoard.
 * Converts `newDate` string from request to a `Date` object.
 */
export const ChangeOfficeHoursRequest: Sync = ({ request, owner, oh, newDateString, newduration, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontoboard/class/change-oh", owner, oh, newDate: newDateString, newduration }, { request }],
  ),
  where: async (frames) => {
    // Convert newDateString to a Date object
    return frames.map(($) => {
      try {
        const newDate = new Date($[newDateString]);
        if (isNaN(newDate.getTime())) {
          return { ...$, error: "Invalid newDate format." };
        }
        return { ...$, newDate };
      } catch (e) {
        return { ...$, error: `Error parsing newDate: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoBoard.changeOH, { owner, oh, newDate, newduration }, { error }],
    // Respond directly with an empty object for success or error
    [Requesting.respond, { request, error }],
  ),
});
```

***

### 3. `src/syncs/bronto_calendar.sync.ts`

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, BrontoCalendar } from "@concepts";

/**
 * Sync: CreateCalendarRequest
 * Purpose: Handles HTTP requests to create a personal calendar for a user.
 * Assumes 'user' ID is provided in the request body.
 */
export const CreateCalendarRequest: Sync = ({ request, user, calendarId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/create", user }, { request }],
  ),
  then: actions(
    [BrontoCalendar.createCalendar, { user }, { calendarId, error }],
    [Requesting.respond, { request, calendarId, error }],
  ),
});

/**
 * Sync: CreateCalendarAssignmentRequest
 * Purpose: Handles HTTP requests to create a BrontoCalendar-specific assignment entity.
 * Converts `dueDate` string from request to a `Date` object.
 */
export const CreateCalendarAssignmentRequest: Sync = ({ request, classId, name, dueDateString, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/assignment/create", classId, name, dueDate: dueDateString }, { request }],
  ),
  where: async (frames) => {
    return frames.map(($) => {
      try {
        const dueDate = new Date($[dueDateString]);
        if (isNaN(dueDate.getTime())) return { ...$, error: "Invalid dueDate format." };
        return { ...$, dueDate };
      } catch (e) {
        return { ...$, error: `Error parsing dueDate: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoCalendar.createAssignment, { classId, name, dueDate }, { assignmentId, error }],
    [Requesting.respond, { request, assignmentId, error }],
  ),
});

/**
 * Sync: AssignWorkToCalendarRequest
 * Purpose: Handles HTTP requests to assign a BrontoCalendar assignment to a user's calendar.
 */
export const AssignWorkToCalendarRequest: Sync = ({ request, owner, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/assign-work", owner, assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.assignWork, { owner, assignmentId }, { error }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: RemoveWorkFromCalendarRequest
 * Purpose: Handles HTTP requests to remove a BrontoCalendar assignment from a user's calendar.
 */
export const RemoveWorkFromCalendarRequest: Sync = ({ request, owner, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/remove-work", owner, assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.removeWork, { owner, assignmentId }, { error }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: DeleteCalendarAssignmentRequest
 * Purpose: Handles HTTP requests to delete a BrontoCalendar-specific assignment entity.
 */
export const DeleteCalendarAssignmentRequest: Sync = ({ request, assignmentId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/assignment/delete", assignmentId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.deleteAssignment, { assignmentId }, { error }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: CreateCalendarOfficeHoursRequest
 * Purpose: Handles HTTP requests to create a BrontoCalendar-specific office hours entity.
 * Converts `startTime` string from request to a `Date` object.
 */
export const CreateCalendarOfficeHoursRequest: Sync = ({ request, classId, startTimeString, duration, officeHoursId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/officehours/create", classId, startTime: startTimeString, duration }, { request }],
  ),
  where: async (frames) => {
    return frames.map(($) => {
      try {
        const startTime = new Date($[startTimeString]);
        if (isNaN(startTime.getTime())) return { ...$, error: "Invalid startTime format." };
        return { ...$, startTime };
      } catch (e) {
        return { ...$, error: `Error parsing startTime: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoCalendar.createOfficeHours, { classId, startTime, duration }, { officeHoursId, error }],
    [Requesting.respond, { request, officeHoursId, error }],
  ),
});

/**
 * Sync: AssignOfficeHoursToCalendarRequest
 * Purpose: Handles HTTP requests to assign BrontoCalendar office hours to a user's calendar.
 */
export const AssignOfficeHoursToCalendarRequest: Sync = ({ request, owner, officeHoursId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/assign-oh", owner, officeHoursId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.assignOH, { owner, officeHoursId }, { error }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: ChangeCalendarOfficeHoursRequest
 * Purpose: Handles HTTP requests to change details of BrontoCalendar office hours.
 * Converts `newDate` string from request to a `Date` object.
 */
export const ChangeCalendarOfficeHoursRequest: Sync = ({ request, owner, oh, newDateString, newDuration, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/change-oh", owner, oh, newDate: newDateString, newDuration }, { request }],
  ),
  where: async (frames) => {
    return frames.map(($) => {
      try {
        const newDate = new Date($[newDateString]);
        if (isNaN(newDate.getTime())) return { ...$, error: "Invalid newDate format." };
        return { ...$, newDate };
      } catch (e) {
        return { ...$, error: `Error parsing newDate: ${e.message}` };
      }
    }).filter(($) => !$.error);
  },
  then: actions(
    [BrontoCalendar.changeOH, { owner, oh, newDate, newDuration }, { error }],
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: DeleteCalendarOfficeHoursRequest
 * Purpose: Handles HTTP requests to delete a BrontoCalendar-specific office hours entity.
 */
export const DeleteCalendarOfficeHoursRequest: Sync = ({ request, officeHoursId, error }) => ({
  when: actions(
    [Requesting.request, { path: "/brontocalendar/officehours/delete", officeHoursId }, { request }],
  ),
  then: actions(
    [BrontoCalendar.deleteOfficeHours, { officeHoursId }, { error }],
    [Requesting.respond, { request, error }],
  ),
});
```

***

### 4. `src/syncs/bronto_integrations.sync.ts`

These synchronizations bridge actions between `BrontoBoard` and `BrontoCalendar`. As discussed, without modifying the `BrontoCalendar` concept itself to hold explicit foreign keys to `BrontoBoard` entities, finding corresponding items for updates becomes more complex. For simplicity and to adhere to the existing concept definitions, I'll rely on querying by shared attributes (like `classId`, `name`, `dueDate`/`startTime`) when possible for updates.

```typescript
// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have
import { Requesting, BrontoBoard, BrontoCalendar } from "@concepts";
// Import BrontoCalendar's internal document types for query results if needed (conceptual, not actual import)
// For `query` results, the framework wraps the returned data in a dictionary, e.g., { assignment: AssignmentDoc }

/**
 * Sync: PropagateBrontoBoardAssignmentToCalendar
 * Purpose: When an assignment is added to BrontoBoard, create a corresponding assignment in BrontoCalendar
 *          and assign it to the owner's calendar.
 */
export const PropagateBrontoBoardAssignmentToCalendar: Sync = (
  {
    assignment: brontoBoardAssignmentId, // ID from BrontoBoard.addWork
    class: brontoBoardClassId,
    owner, // Owner usually available from original request flow
    workName,
    dueDate,
    calendarId,
    assignmentId: brontoCalendarAssignmentId, // ID from BrontoCalendar.createAssignment
    error,
  },
) => ({
  when: actions(
    // Match when BrontoBoard.addWork completes successfully
    [BrontoBoard.addWork, { owner, class: brontoBoardClassId, workName, dueDate }, {
      assignment: brontoBoardAssignmentId,
    }],
    // Also capture the original request that triggered BrontoBoard.addWork
    // to get the 'request' for responding if this integration fails (though usually these are background)
    // For simplicity, this sync doesn't respond to the original request; it assumes `AddWorkRequest` already did.
    // If an error occurs here, it would be logged or handled by other syncs for error notifications.
  ),
  where: async (frames) => {
    // Each frame now has: brontoBoardAssignmentId, brontoBoardClassId, owner, workName, dueDate

    // 1. Get the owner's BrontoCalendar
    frames = await frames.query(
      BrontoCalendar._getCalendarForUser,
      { user: owner },
      { calendarId }, // Binds calendarId if found
    );

    // Filter out frames where no calendar was found (this is an error condition)
    frames = frames.filter(($) => !!$[calendarId]);
    if (frames.length === 0) {
      console.error(
        `Failed to propagate BrontoBoard assignment: No BrontoCalendar found for owner ${frames[0]?.owner}.`,
      );
      return new Frames(); // No frames to proceed with
    }

    // Now call BrontoCalendar.createAssignment using details from BrontoBoard's assignment
    // Assuming BrontoCalendar.createAssignment returns { assignmentId: ID } or { error: string }
    frames = await frames.mapAsync(async ($) => {
      const result = await BrontoCalendar.createAssignment({
        classId: $[brontoBoardClassId], // Using BrontoBoard's class ID as BrontoCalendar's classId
        name: $[workName],
        dueDate: $[dueDate],
      });
      if ("error" in result) {
        console.error(
          `Failed to create BrontoCalendar assignment for BrontoBoard assignment ${
            $[brontoBoardAssignmentId]
          }: ${result.error}`,
        );
        return { ...$, error: result.error };
      }
      return { ...$, brontoCalendarAssignmentId: result.assignmentId };
    });
    frames = frames.filter(($) => !$.error); // Filter out frames where createAssignment failed

    return frames;
  },
  then: actions(
    // 2. Assign the newly created BrontoCalendar assignment to the calendar
    // The `assignmentId` here refers to BrontoCalendar's internal assignment ID.
    [BrontoCalendar.assignWork, { owner, assignmentId: brontoCalendarAssignmentId }],
  ),
});


/**
 * Sync: PropagateBrontoBoardChangeWorkToCalendar
 * Purpose: When an assignment's due date is changed in BrontoBoard, update the corresponding
 *          assignment in BrontoCalendar and re-assign it to the correct day.
 */
export const PropagateBrontoBoardChangeWorkToCalendar: Sync = (
  {
    work: brontoBoardAssignmentId, // ID from BrontoBoard.changeWork
    owner, // Owner usually available from original request flow
    dueDate: newDueDate, // The new due date
    assignmentId: brontoCalendarAssignmentId, // The corresponding BC assignment ID
    calendarId,
    oldBrontoCalendarAssignmentId, // For removing from old day if needed
    oldDueDate, // The previous due date for the BrontoCalendar assignment
    error,
  },
) => ({
  when: actions(
    // Match when BrontoBoard.changeWork completes successfully
    [BrontoBoard.changeWork, { owner, work: brontoBoardAssignmentId, dueDate: newDueDate }, {}],
  ),
  where: async (frames) => {
    // Each frame now has: brontoBoardAssignmentId, owner, newDueDate

    // 1. Get the owner's BrontoCalendar
    frames = await frames.query(
      BrontoCalendar._getCalendarForUser,
      { user: owner },
      { calendarId },
    );
    frames = frames.filter(($) => !!$[calendarId]);
    if (frames.length === 0) {
      console.error(
        `Failed to propagate BrontoBoard changeWork: No BrontoCalendar found for owner ${frames[0]?.owner}.`,
      );
      return new Frames();
    }

    // 2. Find the *corresponding* BrontoCalendar assignment.
    // This assumes BrontoCalendar assignments store their originating BrontoBoard assignment ID
    // OR we need to find it by its classId, name, and previous dueDate.
    // For this example, let's assume BrontoCalendar assignments can be uniquely identified
    // by their originating BrontoBoard classId and name (or that the IDs were somehow mapped).
    // A more robust solution would involve a specific query in BrontoCalendar to find by brontoBoardAssignmentRef.
    // Given the concept definitions, BrontoCalendar._getAssignment only takes its own ID.
    // To find it, we'd need to query all BrontoCalendar assignments for the class and find a match.
    // This is complex for a generic sync.
    // Let's assume BrontoBoard's `addWork` syncs would have stored the `brontoBoardAssignmentId`
    // into a field like `brontoBoardRefId` in BrontoCalendar.AssignmentDoc's `createAssignment` action.
    // Since we cannot modify the `BrontoCalendar` concept here, we'll make a simplifying assumption:
    // we query for all assignments for the classId (which is shared), and assume a name match for simplicity.

    // To get the classId and original name for the BrontoBoard assignment:
    frames = await frames.mapAsync(async ($) => {
      const bbAssignment = await BrontoBoard._getAssignment({ assignment: $[brontoBoardAssignmentId] });
      if (!bbAssignment) {
        return { ...$, error: `BrontoBoard assignment ${$[brontoBoardAssignmentId]} not found.` };
      }
      return { ...$, brontoBoardClassId: bbAssignment.classId, workName: bbAssignment.name, oldDueDate: bbAssignment.dueDate };
    });
    frames = frames.filter(($) => !$.error);

    // Now find the corresponding BrontoCalendar assignment by classId and name
    frames = await frames.mapAsync(async ($) => {
      const bcAssignments = await BrontoCalendar._getAssignmentsForClass({ class: $[brontoBoardClassId] });
      const matchingBcAssignment = bcAssignments.find((a) => a.name === $[workName]);

      if (!matchingBcAssignment) {
        return { ...$, error: `Corresponding BrontoCalendar assignment for ${$[brontoBoardAssignmentId]} not found.` };
      }
      return { ...$, brontoCalendarAssignmentId: matchingBcAssignment._id, oldDueDate: matchingBcAssignment.dueDate };
    });
    frames = frames.filter(($) => !$.error);

    // If the dueDate changed, we need to remove from the old day and re-assign.
    // BrontoCalendar.changeOH exists, but not for assignments. We must remove and then assign.
    frames = await frames.mapAsync(async ($) => {
      const currentFrame = $;
      const bcAssignmentId = currentFrame[brontoCalendarAssignmentId];
      const ownerId = currentFrame[owner];
      const newDueDateObj = currentFrame[newDueDate];
      const oldDueDateObj = currentFrame[oldDueDate];

      if (newDueDateObj.toISOString().split('T')[0] !== oldDueDateObj.toISOString().split('T')[0]) {
        // Remove from old date
        const removeResult = await BrontoCalendar.removeWork({ owner: ownerId, assignmentId: bcAssignmentId });
        if ("error" in removeResult) {
          console.error(`Error removing BC assignment from old day: ${removeResult.error}`);
          return { ...currentFrame, error: removeResult.error };
        }
        // Then re-assign with the new date (which will use BrontoCalendar's internal `createAssignment` or an `updateAssignmentDueDate` if it existed)
        // Since `BrontoCalendar.createAssignment` will create a new ID if called, we should *update* the existing BC assignment and then re-assign.
        // There is no `updateAssignmentDueDate` directly in BrontoCalendar.
        // This highlights a missing piece in BrontoCalendar for robust date changes without full re-creation.
        // For now, the most direct path is to simulate by re-calling `createAssignment` and `assignWork` with the *new* date, and then deleting the old one.
        // This is not ideal for maintaining the same ID, but works within the current concept actions.
        // Better: BrontoCalendar needs an `updateAssignment` action for dates.

        // To work with existing actions, we could:
        // 1. Delete the old BrontoCalendar assignment (if it's not reused by others)
        // 2. Create a new one with the updated date
        // 3. Assign the new one.
        // This is messy and duplicates assignments.
        // The *cleanest* way with current `BrontoCalendar` actions is for `changeWork` to simply update the `dueDate`
        // in BrontoCalendar's state, and `assignWork` implicitly handles date changes by `removeWork` + `assignWork` or
        // `changeOH` implies moving. The `changeOH` action already does this for office hours internally.
        // We should aim to mirror that for assignments.

        // Simulating BrontoCalendar.changeAssignmentDueDate by updating the document directly:
        const updateResult = await BrontoCalendar.assignments.updateOne(
          { _id: bcAssignmentId },
          { $set: { dueDate: newDueDateObj } }
        );
        if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
             // Date was the same, no action needed for calendar day movement
        } else if (updateResult.modifiedCount === 0) {
          console.error(`Failed to update BrontoCalendar assignment ${bcAssignmentId} due date.`);
          return { ...currentFrame, error: `Failed to update BrontoCalendar assignment ${bcAssignmentId} due date.` };
        }

        // Now re-assign to the new date; BrontoCalendar.assignWork will handle placing it on the correct day.
        const assignResult = await BrontoCalendar.assignWork({ owner: ownerId, assignmentId: bcAssignmentId });
        if ("error" in assignResult) {
          console.error(`Error re-assigning BC assignment to new day: ${assignResult.error}`);
          return { ...currentFrame, error: assignResult.error };
        }
      }
      return currentFrame; // No change if date didn't move, or successful update/re-assignment
    });
    frames = frames.filter(($) => !$.error);

    return frames;
  },
  then: actions(
    // No direct action in then needed if 'where' handled it (it did).
  ),
});

/**
 * Sync: PropagateBrontoBoardRemoveWorkToCalendar
 * Purpose: When an assignment is removed from BrontoBoard, delete the corresponding assignment
 *          entity from BrontoCalendar and remove it from any calendar day.
 */
export const PropagateBrontoBoardRemoveWorkToCalendar: Sync = (
  {
    work: brontoBoardAssignmentId, // ID from BrontoBoard.removeWork
    owner, // Owner usually available from original request flow
    class: brontoBoardClassId,
    workName,
    dueDate,
    assignmentId: brontoCalendarAssignmentId,
    error,
  },
) => ({
  when: actions(
    // Match when BrontoBoard.removeWork completes successfully
    [BrontoBoard.removeWork, { owner, work: brontoBoardAssignmentId }, {}],
  ),
  where: async (frames) => {
    // Each frame now has: brontoBoardAssignmentId, owner

    // To find the corresponding BrontoCalendar assignment, we need its original details
    // (classId, name, dueDate) which are not directly available from BrontoBoard.removeWork output.
    // We'd need to query BrontoBoard's internal state *before* removal, or have it available from the triggering flow.
    // Assuming the 'removeWork' action itself gives us access to `classId`, `workName`, `dueDate`
    // (or we query BrontoBoard's _getAssignment query before it's gone)

    // For simplicity, let's assume `classId`, `workName`, `dueDate` are part of the flow leading here.
    // If not, a query on BrontoBoard (like `_getAssignment` before the removal is complete) would be needed.
    // In a real system, the sync engine ensures flow consistency. Let's assume these details are available.

    // If `BrontoBoard.removeWork` only returns `owner` and `work` (the ID), we need to get the assignment details.
    frames = await frames.mapAsync(async ($) => {
      // Assuming a query like _getAssignment would return details even after removal (e.g. from history)
      // Or we need to rely on the original `Requesting.request` flow.
      // For now, this is a placeholder. A robust implementation would need BrontoBoard to pass more data
      // or BrontoCalendar's delete to handle `brontoBoardRefId`.
      // Given `BrontoCalendar.deleteAssignment` takes `assignmentId`, we must find this ID.
      // We will assume `brontoBoardClassId`, `workName`, `dueDate` are available from previous frames or can be queried.
      // For this example, let's assume they were implicitly passed from the flow.
      return { ...$, brontoBoardClassId: $[brontoBoardClassId], workName: $[workName], dueDate: $[dueDate] };
    });
    frames = frames.filter(($) => !!$[brontoBoardClassId] && !!$[workName] && !!$[dueDate]); // Filter if data missing

    // 1. Get the owner's BrontoCalendar (needed to locate the assignment on calendar)
    frames = await frames.query(BrontoCalendar._getCalendarForUser, { user: owner }, { calendarId });
    frames = frames.filter(($) => !!$[calendarId]);
    if (frames.length === 0) {
      console.warn(
        `Failed to propagate BrontoBoard removeWork: No BrontoCalendar found for owner ${frames[0]?.owner}.`,
      );
      return new Frames();
    }

    // 2. Find the corresponding BrontoCalendar assignment by classId and name (and maybe dueDate)
    frames = await frames.mapAsync(async ($) => {
      const bcAssignments = await BrontoCalendar._getAssignmentsForClass({ class: $[brontoBoardClassId] });
      const matchingBcAssignment = bcAssignments.find((a) =>
        a.name === $[workName] && a.dueDate.toISOString() === $[dueDate].toISOString()
      ); // More precise match
      if (!matchingBcAssignment) {
        console.warn(
          `Corresponding BrontoCalendar assignment for BrontoBoard assignment ${$[brontoBoardAssignmentId]} (class ${$[brontoBoardClassId]}, name ${$[workName]}) not found. Skipping deletion.`,
        );
        return { ...$, skipDelete: true };
      }
      return { ...$, brontoCalendarAssignmentId: matchingBcAssignment._id };
    });
    frames = frames.filter(($) => !$.error);

    // 3. Filter out frames where we decided to skip deletion (no matching BC assignment)
    frames = frames.filter(($) => !$.skipDelete);

    return frames;
  },
  then: actions(
    // 4. Delete the BrontoCalendar assignment
    [BrontoCalendar.deleteAssignment, { assignmentId: brontoCalendarAssignmentId }, { error }],
    // If there's an error in deleting, it could be handled by another sync.
  ),
});


/**
 * Sync: PropagateBrontoBoardOfficeHoursToCalendar
 * Purpose: When office hours are added to BrontoBoard, create a corresponding office hours
 *          entity in BrontoCalendar and assign it to the owner's calendar.
 */
export const PropagateBrontoBoardOfficeHoursToCalendar: Sync = (
  {
    officeHours: brontoBoardOHId, // ID from BrontoBoard.addOH
    class: brontoBoardClassId,
    owner,
    OHTime,
    OHduration,
    calendarId,
    officeHoursId: brontoCalendarOHId, // ID from BrontoCalendar.createOfficeHours
    error,
  },
) => ({
  when: actions(
    // Match when BrontoBoard.addOH completes successfully
    [BrontoBoard.addOH, { owner, class: brontoBoardClassId, OHTime, OHduration }, { officeHours: brontoBoardOHId }],
  ),
  where: async (frames) => {
    // Each frame now has: brontoBoardOHId, brontoBoardClassId, owner, OHTime, OHduration

    // 1. Get the owner's BrontoCalendar
    frames = await frames.query(
      BrontoCalendar._getCalendarForUser,
      { user: owner },
      { calendarId },
    );
    frames = frames.filter(($) => !!$[calendarId]);
    if (frames.length === 0) {
      console.error(
        `Failed to propagate BrontoBoard office hours: No BrontoCalendar found for owner ${frames[0]?.owner}.`,
      );
      return new Frames();
    }

    // Now call BrontoCalendar.createOfficeHours
    frames = await frames.mapAsync(async ($) => {
      const result = await BrontoCalendar.createOfficeHours({
        classId: $[brontoBoardClassId],
        startTime: $[OHTime],
        duration: $[OHduration],
      });
      if ("error" in result) {
        console.error(
          `Failed to create BrontoCalendar office hours for BrontoBoard OH ${
            $[brontoBoardOHId]
          }: ${result.error}`,
        );
        return { ...$, error: result.error };
      }
      return { ...$, brontoCalendarOHId: result.officeHoursId };
    });
    frames = frames.filter(($) => !$.error);

    return frames;
  },
  then: actions(
    // 2. Assign the newly created BrontoCalendar office hours to the calendar
    [BrontoCalendar.assignOH, { owner, officeHoursId: brontoCalendarOHId }],
  ),
});

/**
 * Sync: PropagateBrontoBoardChangeOHToCalendar
 * Purpose: When office hours details are changed in BrontoBoard, update the corresponding
 *          office hours in BrontoCalendar. This includes moving the OH on the calendar if the date changes.
 */
export const PropagateBrontoBoardChangeOHToCalendar: Sync = (
  {
    oh: brontoBoardOHId, // ID from BrontoBoard.changeOH
    owner,
    newDate,
    newduration,
    calendarId,
    officeHoursId: brontoCalendarOHId,
    error,
  },
) => ({
  when: actions(
    // Match when BrontoBoard.changeOH completes successfully
    [BrontoBoard.changeOH, { owner, oh: brontoBoardOHId, newDate, newduration }, {}],
  ),
  where: async (frames) => {
    // Each frame now has: brontoBoardOHId, owner, newDate, newduration

    // 1. Get the owner's BrontoCalendar
    frames = await frames.query(
      BrontoCalendar._getCalendarForUser,
      { user: owner },
      { calendarId },
    );
    frames = frames.filter(($) => !!$[calendarId]);
    if (frames.length === 0) {
      console.error(
        `Failed to propagate BrontoBoard changeOH: No BrontoCalendar found for owner ${frames[0]?.owner}.`,
      );
      return new Frames();
    }

    // 2. Find the corresponding BrontoCalendar office hours.
    frames = await frames.mapAsync(async ($) => {
      // Get the original BrontoBoard OH details to find the matching BrontoCalendar OH
      const bbOH = await BrontoBoard._getOfficeHours({ officeHours: $[brontoBoardOHId] }); // Assuming _getOfficeHours exists in BrontoBoard
      if (!bbOH) {
        return { ...$, error: `BrontoBoard office hours ${$[brontoBoardOHId]} not found.` };
      }

      const bcOHs = await BrontoCalendar._getOfficeHoursForClass({ class: bbOH.classId }); // Assuming classId is same
      const matchingBcOH = bcOHs.find((o) =>
        o.startTime.toISOString() === bbOH.startTime.toISOString() && o.duration === bbOH.duration
      );
      if (!matchingBcOH) {
        return { ...$, error: `Corresponding BrontoCalendar office hours for ${$[brontoBoardOHId]} not found.` };
      }
      return { ...$, brontoCalendarOHId: matchingBcOH._id };
    });
    frames = frames.filter(($) => !$.error);

    return frames;
  },
  then: actions(
    // 3. Call BrontoCalendar.changeOH
    [BrontoCalendar.changeOH, {
      owner,
      oh: brontoCalendarOHId,
      newDate,
      newduration,
    }, { error }],
  ),
});

// Note: BrontoBoard does not have a `removeOH` action in the provided spec,
// so no direct sync for removing BrontoBoard OH -> BrontoCalendar delete OH.
// If it did, it would be similar to `PropagateBrontoBoardRemoveWorkToCalendar`.
```
