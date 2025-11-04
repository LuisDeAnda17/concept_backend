---
timestamp: 'Tue Nov 04 2025 10:16:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_101658.6e087fd1.md]]'
content_id: dfa08efeb9011d815613dbb5c42668ad8de2b11ddb20774d994cd033835536ac
---

# API Specification: BrontoCalendar Concept

**Purpose:** Associate an assignment or Exam to a day on a calendar.

***

## API Endpoints

### POST /api/BrontoCalendar/createCalendar

**Description:** Creates an empty Calendar document for the specified user.

**Requirements:**

* `user`: The ID of a valid user for whom the calendar is to be created.
* A calendar for this user must not already exist in the `calendars` collection.

**Effects:**

* Creates an empty Calendar document for the specified user in the `calendars` collection.
* Returns the ID of the newly created calendar.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "calendarId": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/createAssignment

**Description:** Creates a new assignment object in the `assignments` collection.

**Requirements:**

* `classId`: An ID identifying the class this assignment belongs to.
* `name`: A non-empty string for the assignment's name.
* `dueDate`: A valid Date object representing when the assignment is due.

**Effects:**

* Creates a new assignment object in the `assignments` collection.
* Returns the ID of the newly created assignment.

**Request Body:**

```json
{
  "classId": "ID",
  "name": "string",
  "dueDate": "string (ISO 8601)"
}
```

**Success Response Body (Action):**

```json
{
  "assignmentId": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/assignWork

**Description:** Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.

**Effects:**

* Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
* Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.
* Returns an error if the calendar or assignment is not found.

**Request Body:**

```json
{
  "owner": "ID",
  "assignmentId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/removeWork

**Description:** Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.

**Effects:**

* Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
* If the assignment is not found on the calendar, an error is returned.
* Leaves the `AssignmentDoc` in the `assignments` collection unless `deleteAssignment` is called.

**Request Body:**

```json
{
  "owner": "ID",
  "assignmentId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/updateAssignmentDueDate

**Description:** Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.

**Requirements:**

* `owner`: The ID of the user who owns the calendar associated with the assignment.
* `assignmentId`: The ID of an existing assignment to modify.
* `newDueDate`: A valid Date object for the new due date.

**Effects:**

* Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.
* If the date component of `dueDate` changes, the assignment entry is moved from its old calendar day to the new one.
* Returns an error if the owner's calendar is not found, assignment not found, or input is invalid.

**Request Body:**

```json
{
  "owner": "ID",
  "assignmentId": "ID",
  "newDueDate": "string (ISO 8601)"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/deleteAssignment

**Description:** Deletes the assignment document from the `assignments` collection.

**Requirements:**

* `assignmentId`: The ID of an existing assignment to delete from the concept's state.

**Effects:**

* Deletes the assignment document from the `assignments` collection.
* Atomically removes any references to this assignment from all `calendarDays` documents across all calendars.
* Returns an error if the assignment is not found.

**Request Body:**

```json
{
  "assignmentId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/createOfficeHours

**Description:** Creates a new office hours object in the `officeHours` collection.

**Requirements:**

* `classId`: An ID identifying the class these office hours belong to.
* `startTime`: A valid Date object for when office hours begin.
* `duration`: A non-negative number (in minutes) for the duration.

**Effects:**

* Creates a new office hours object in the `officeHours` collection.
* Returns the ID of the newly created office hours.

**Request Body:**

```json
{
  "classId": "ID",
  "startTime": "string (ISO 8601)",
  "duration": "number"
}
```

**Success Response Body (Action):**

```json
{
  "officeHoursId": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/assignOH

**Description:** Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `officeHoursId`: The ID of an existing office hours object within the concept's `officeHours` state.

**Effects:**

* Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.
* Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.

**Request Body:**

```json
{
  "owner": "ID",
  "officeHoursId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/changeOH

**Description:** Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.

**Requirements:**

* `owner`: The ID of the user who owns the calendar associated with the office hours.
* `officeHoursId`: The ID of an existing office hours object to modify.
* `newDate`: A valid Date object for the new start time (only date component considered for calendar day).
* `newDuration`: A non-negative number for the new duration.

**Effects:**

* Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.
* If the date component of `startTime` changes, the office hours entry is moved from its old calendar day to the new one.
* Returns an error if the owner's calendar is not found, office hours not found, or input is invalid.

**Request Body:**

```json
{
  "owner": "ID",
  "officeHoursId": "ID",
  "newDate": "string (ISO 8601)",
  "newDuration": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/deleteOfficeHours

**Description:** Deletes the office hours document from the `officeHours` collection.

**Requirements:**

* `officeHoursId`: The ID of an existing office hours object to delete from the concept's state.

**Effects:**

* Deletes the office hours document from the `officeHours` collection.
* Atomically removes any references to these office hours from all `calendarDays` documents across all calendars.
* Returns an error if the office hours are not found.

**Request Body:**

```json
{
  "officeHoursId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/\_getCalendarForUser

**Description:** Returns the calendar document for a given user, or null if not found.

**Requirements:**

* None.

**Effects:**

* Returns the calendar document for a given user, or null if not found.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/\_getAssignmentsOnDay

**Description:** Returns a list of assignment documents scheduled for a specific day on a specific calendar.

**Requirements:**

* None.

**Effects:**

* Returns a list of assignment documents scheduled for a specific day on a specific calendar.
* If no assignments or calendar day found, returns an empty array.

**Request Body:**

```json
{
  "calendarId": "ID",
  "date": "string (ISO 8601)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "name": "string",
    "dueDate": "string (ISO 8601)"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/\_getOfficeHoursOnDay

**Description:** Returns a list of office hours documents scheduled for a specific day on a specific calendar.

**Requirements:**

* None.

**Effects:**

* Returns a list of office hours documents scheduled for a specific day on a specific calendar.
* If no office hours or calendar day found, returns an empty array.

**Request Body:**

```json
{
  "calendarId": "ID",
  "date": "string (ISO 8601)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "startTime": "string (ISO 8601)",
    "duration": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/\_getAssignment

**Description:** Returns an assignment document by its ID, or null if not found.

**Requirements:**

* None.

**Effects:**

* Returns an assignment document by its ID, or null if not found.

**Request Body:**

```json
{
  "assignmentId": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "name": "string",
    "dueDate": "string (ISO 8601)"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BrontoCalendar/\_getOfficeHours

**Description:** Returns an office hours document by its ID, or null if not found.

**Requirements:**

* None.

**Effects:**

* Returns an office hours document by its ID, or null if not found.

**Request Body:**

```json
{
  "officeHoursId": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "startTime": "string (ISO 8601)",
    "duration": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
