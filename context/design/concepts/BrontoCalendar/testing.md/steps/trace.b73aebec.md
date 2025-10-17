---
timestamp: 'Thu Oct 16 2025 11:02:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_110209.58f5a961.md]]'
content_id: b73aebeca1accd7006870c669573fea726fde4b6c82e7885472ab2ce53e5145a
---

# trace:

The principle for BrontoCalendar is: "Each assignment has one associated day. If you create a calendar for a user, then create and add an assignment to it, and later query that day, you will find the assignment listed. If you then change the assignment's due date, it will move to the new day on the calendar. The ability to manage office hours similarly, including changing their scheduled time, is also central to the calendar's utility."

Here's a trace of actions that demonstrates this principle:

1. **`createCalendar({ user: "user:PrincipleTestUser" })`**:
   * **Requires**: No existing calendar for "user:PrincipleTestUser".
   * **Effects**: A new calendar document is created in the `calendars` collection for `user:PrincipleTestUser`. Let's say it returns `calendarId: "calendar:xyz"`.

2. **`createAssignment({ classId: "class:Math101", name: "Principle Assignment", dueDate: new Date("2024-04-01T10:00:00Z") })`**:
   * **Requires**: Valid input for classId, name, dueDate.
   * **Effects**: A new assignment document is created in the `assignments` collection. Let's say it returns `assignmentId: "assignment:abc"`.

3. **`assignWork({ owner: "user:PrincipleTestUser", assignmentId: "assignment:abc" })`**:
   * **Requires**: A calendar exists for "user:PrincipleTestUser" (`calendar:xyz`), and the assignment `assignment:abc` exists in the `assignments` state.
   * **Effects**: The `assignment:abc` ID is added to the `assignments` array of the `calendarDays` document corresponding to `calendar:xyz` and the date `2024-04-01`. If this `calendarDays` document didn't exist, it's created.

4. **`_getAssignmentsOnDay({ calendarId: "calendar:xyz", date: new Date("2024-04-01T12:00:00Z") })`**:
   * **Effects**: Returns an array containing the assignment document for `assignment:abc`, confirming it's listed on that day.

5. **`updateAssignmentDueDate({ owner: "user:PrincipleTestUser", assignmentId: "assignment:abc", newDueDate: new Date("2024-04-05T14:30:00Z") })`**:
   * **Requires**: A calendar exists for "user:PrincipleTestUser" (`calendar:xyz`), the assignment `assignment:abc` exists, and the `newDueDate` is valid.
   * **Effects**: The `dueDate` in the `assignment:abc` document in the `assignments` collection is updated to `2024-04-05T14:30:00Z`. The `assignment:abc` ID is removed from the `assignments` array of the `calendarDays` document for `calendar:xyz` and `2024-04-01`. It is then added to (or a new document is created for) the `calendarDays` document for `calendar:xyz` and `2024-04-05`.

6. **`_getAssignmentsOnDay({ calendarId: "calendar:xyz", date: new Date("2024-04-01T12:00:00Z") })`**:
   * **Effects**: Returns an empty array, confirming the assignment is no longer on the old date.

7. **`_getAssignmentsOnDay({ calendarId: "calendar:xyz", date: new Date("2024-04-05T12:00:00Z") })`**:
   * **Effects**: Returns an array containing the assignment document for `assignment:abc`, confirming it has moved to the new date.

This trace fully demonstrates the core functionality described in the `BrontoCalendar` principle, showing the lifecycle of an assignment from creation, assignment to a calendar, querying, and moving between dates. The accompanying test file includes a dedicated test step to execute this exact sequence and assert the expected outcomes.
