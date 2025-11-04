---
timestamp: 'Tue Nov 04 2025 10:19:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_101957.6a796a09.md]]'
content_id: f2dfa59ff8449178f82e96611eb842d832d8861739948ebf2928dd916c081fd8
---

# API Specification: BrontoCalendar Concept

**Purpose:** Associate an assignment or Exam to a day on a calendar.

***

## API Endpoints

### POST /api/BrontoCalendar/createCalendar

**Description:** Creates a new calendar for a user.

**Requirements:**

* `user`: The ID of a valid user for whom the calendar is to be created.
* A calendar for this user must not already exist.

**Effects:**

* Creates an empty Calendar document for the specified user.
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

**Description:** Creates a new assignment record within the calendar concept.

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
  "dueDate": "Date"
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

**Description:** Assigns an existing assignment to a user's calendar on its due date.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `assignmentId`: The ID of an existing assignment.

**Effects:**

* Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
* Creates a calendar day entry if one doesn't exist for that calendar and day.

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

**Description:** Removes an assignment from a user's calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `assignmentId`: The ID of an existing assignment.

**Effects:**

* Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

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

**Description:** Updates an assignment's due date and moves its entry on the calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar associated with the assignment.
* `assignmentId`: The ID of an existing assignment to modify.
* `newDueDate`: A valid Date object for the new due date.

**Effects:**

* Modifies the `dueDate` of the specified assignment.
* If the date changes, the assignment entry is moved from its old calendar day to the new one.

**Request Body:**

```json
{
  "owner": "ID",
  "assignmentId": "ID",
  "newDueDate": "Date"
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

**Description:** Deletes an assignment record and removes all references to it from calendars.

**Requirements:**

* `assignmentId`: The ID of an existing assignment to delete.

**Effects:**

* Deletes the assignment document from the `assignments` collection.
* Atomically removes any references to this assignment from all `calendarDays` documents.

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

**Description:** Creates a new office hours record within the calendar concept.

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
  "startTime": "Date",
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

**Description:** Assigns existing office hours to a user's calendar on its start date.

**Requirements:**

* `owner`: The ID of the user who owns the calendar.
* `officeHoursId`: The ID of an existing office hours object.

**Effects:**

* Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.

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

**Description:** Updates office hours' time and duration, and moves its entry on the calendar.

**Requirements:**

* `owner`: The ID of the user who owns the calendar associated with the office hours.
* `officeHoursId`: The ID of an existing office hours object to modify.
* `newDate`: A valid Date object for the new start time.
* `newDuration`: A non-negative number for the new duration.

**Effects:**

* Modifies the `startTime` and `duration` of the specified office hours.
* If the date changes, the office hours entry is moved from its old calendar day to the new one.

**Request Body:**

```json
{
  "owner": "ID",
  "officeHoursId": "ID",
  "newDate": "Date",
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

**Description:** Deletes an office hours record and removes all references to it from calendars.

**Requirements:**

* `officeHoursId`: The ID of an existing office hours object to delete.

**Effects:**

* Deletes the office hours document from the `officeHours` collection.
* Atomically removes any references to these office hours from all `calendarDays` documents.

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

**Description:** Retrieves the calendar document for a given user.

**Requirements:**

* N/A

**Effects:**

* Returns the calendar document for a given user, or null if not found (resulting in an empty array).

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

**Description:** Retrieves a list of assignment documents scheduled for a specific day on a specific calendar.

**Requirements:**

* N/A

**Effects:**

* Returns a list of assignment documents scheduled for a specific day.

**Request Body:**

```json
{
  "calendarId": "ID",
  "date": "Date"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "name": "string",
    "dueDate": "Date"
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

**Description:** Retrieves a list of office hours documents scheduled for a specific day on a specific calendar.

**Requirements:**

* N/A

**Effects:**

* Returns a list of office hours documents scheduled for a specific day.

**Request Body:**

```json
{
  "calendarId": "ID",
  "date": "Date"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "classId": "ID",
    "startTime": "Date",
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

**Description:** Retrieves an assignment document by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an assignment document by its ID, or null if not found (resulting in an empty array).

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
    "dueDate": "Date"
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

**Description:** Retrieves an office hours document by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an office hours document by its ID, or null if not found (resulting in an empty array).

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
    "startTime": "Date",
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
