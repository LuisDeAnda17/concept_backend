[@BrontoBoard](../../../src/concepts/BrontoBoard/BrontoBoardConcept.ts)

[@BrontoCalendar](../../../src/concepts/BrontoCalendar/BrontoCalendarConcept.ts)

[@UserAuthentication](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

[@Sessioning](../../../src/concepts/Sessioning/SessioningConcept.ts)

[Authentication-syncs](../../../src/syncs/auth.sync.ts)

[BrontoBoard-syncs](../../../src/syncs/brontoboard.sync.ts)

[@API-extraction-from-code](../../tools/api-extraction-from-code.md)

# api-extraction: 
# response:

# response:


# response:

# API Specification: BrontoBoard Concept

**Purpose:** Associates set of Assignments, an overview, office hours, and a name to a class and that class to a BrontoBoard.

---

## API Endpoints

### POST /api/BrontoBoard/initializeBB

**Description:** Creates an empty BrontoBoard for a user.

**Requirements:**
- A valid user and their calendar.

**Effects:**
- Creates an empty BrontoBoard for the user.

**Request Body:**
```json
{
  "user": "ID",
  "calendar": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "brontoBoard": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/createClass

**Description:** Creates a new class within a specified BrontoBoard.

**Requirements:**
- User is the owner of the BrontoBoard.
- Classname must not be an empty String.

**Effects:**
- Creates a class object assigned to the BrontoBoard with the given information.

**Request Body:**
```json
{
  "owner": "ID",
  "brontoBoard": "ID",
  "className": "string",
  "overview": "string"
}
```

**Success Response Body (Action):**
```json
{
  "class": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/addWork

**Description:** Creates a new assignment for a class.

**Requirements:**
- User is the owner of the BrontoBoard.
- Owner and class are valid.
- `workName` is not empty.
- `dueDate` is not empty and is not before the current date.

**Effects:**
- Creates an Assignment under the Class of the owner with the given name and due date.

**Request Body:**
```json
{
  "owner": "ID",
  "class": "ID",
  "workName": "string",
  "dueDate": "Date"
}
```

**Success Response Body (Action):**
```json
{
  "assignment": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/changeWork

**Description:** Modifies the due date of an existing assignment.

**Requirements:**
- User is the owner of the BrontoBoard associated with the assignment.
- The assignment is valid and belongs to a class owned by the user.
- The new `dueDate` is a future date.

**Effects:**
- Modifies the Assignment to the new date.

**Request Body:**
```json
{
  "owner": "ID",
  "work": "ID",
  "dueDate": "Date"
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
---
### POST /api/BrontoBoard/removeWork

**Description:** Removes an assignment from its class.

**Requirements:**
- User is the owner of the BrontoBoard associated with the assignment.
- The owner and assignment are valid.

**Effects:**
- Removes the Assignment from its class.

**Request Body:**
```json
{
  "owner": "ID",
  "work": "ID"
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
---
### POST /api/BrontoBoard/addOH

**Description:** Creates a new Office Hours record for a class.

**Requirements:**
- User is the owner of the BrontoBoard associated with the class.
- The class is valid and belongs to the owner.
- `OHTime` is a future date.
- `OHduration` is a non-negative number.

**Effects:**
- Creates Office Hours under the Class of the owner with the given start time and duration.

**Request Body:**
```json
{
  "owner": "ID",
  "class": "ID",
  "OHTime": "Date",
  "OHduration": "number"
}
```

**Success Response Body (Action):**
```json
{
  "officeHours": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/changeOH

**Description:** Modifies the time and duration of an existing Office Hours record.

**Requirements:**
- User is the owner of the BrontoBoard associated with the office hours.
- The office hour record is valid.
- `newDate` is a future date.
- `newduration` is a non-negative number.

**Effects:**
- Modifies the office hours to the new date and duration.

**Request Body:**
```json
{
  "owner": "ID",
  "oh": "ID",
  "newDate": "Date",
  "newduration": "number"
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
---
### POST /api/BrontoBoard/getAssignmentsForClass

**Description:** Retrieves all assignments for a given class.

**Requirements:**
- N/A

**Effects:**
- Returns an array of assignments for the given class.

**Request Body:**
```json
{
  "class": "ID"
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
---
### POST /api/BrontoBoard/getOfficeHoursForClass

**Description:** Retrieves all office hours for a given class.

**Requirements:**
- N/A

**Effects:**
- Returns an array of office hours for the given class.

**Request Body:**
```json
{
  "class": "ID"
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
---
### POST /api/BrontoBoard/getClassesForBrontoBoard

**Description:** Retrieves all classes for a given BrontoBoard.

**Requirements:**
- N/A

**Effects:**
- Returns an array of classes for the given BrontoBoard.

**Request Body:**
```json
{
  "brontoBoard": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "ID",
    "brontoBoardId": "ID",
    "name": "string",
    "overview": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/getBrontoBoardsForUser

**Description:** Retrieves all BrontoBoards owned by a given user.

**Requirements:**
- N/A

**Effects:**
- Returns an array of BrontoBoards owned by the given user.

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
    "owner": "ID",
    "calendar": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/getBrontoBoardById

**Description:** Retrieves a single BrontoBoard by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an array containing the BrontoBoard document if found, otherwise an empty array.

**Request Body:**
```json
{
  "brontoBoard": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "calendar": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/getClassById

**Description:** Retrieves a single class by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an array containing the Class document if found, otherwise an empty array.

**Request Body:**
```json
{
  "class": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "ID",
    "brontoBoardId": "ID",
    "name": "string",
    "overview": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/BrontoBoard/getAssignmentById

**Description:** Retrieves a single assignment by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an array containing the Assignment document if found, otherwise an empty array.

**Request Body:**
```json
{
  "assignment": "ID"
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
---
### POST /api/BrontoBoard/getOfficeHourById

**Description:** Retrieves a single office hour record by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an array containing the OfficeHour document if found, otherwise an empty array.

**Request Body:**
```json
{
  "officeHour": "ID"
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
---
# API Specification: BrontoCalendar Concept

**Purpose:** Associate an assignment or Exam to a day on a calendar.

---

## API Endpoints

### POST /api/BrontoCalendar/createCalendar

**Description:** Creates a new calendar for a user.

**Requirements:**
- `user`: The ID of a valid user for whom the calendar is to be created.
- A calendar for this user must not already exist.

**Effects:**
- Creates an empty Calendar document for the specified user.
- Returns the ID of the newly created calendar.

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
---
### POST /api/BrontoCalendar/createAssignment

**Description:** Creates a new assignment record within the calendar concept.

**Requirements:**
- `classId`: An ID identifying the class this assignment belongs to.
- `name`: A non-empty string for the assignment's name.
- `dueDate`: A valid Date object representing when the assignment is due.

**Effects:**
- Creates a new assignment object in the `assignments` collection.
- Returns the ID of the newly created assignment.

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
---
### POST /api/BrontoCalendar/assignWork

**Description:** Assigns an existing assignment to a user's calendar on its due date.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `assignmentId`: The ID of an existing assignment.

**Effects:**
- Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
- Creates a calendar day entry if one doesn't exist for that calendar and day.

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
---
### POST /api/BrontoCalendar/removeWork

**Description:** Removes an assignment from a user's calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `assignmentId`: The ID of an existing assignment.

**Effects:**
- Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

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
---
### POST /api/BrontoCalendar/updateAssignmentDueDate

**Description:** Updates an assignment's due date and moves its entry on the calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar associated with the assignment.
- `assignmentId`: The ID of an existing assignment to modify.
- `newDueDate`: A valid Date object for the new due date.

**Effects:**
- Modifies the `dueDate` of the specified assignment.
- If the date changes, the assignment entry is moved from its old calendar day to the new one.

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
---
### POST /api/BrontoCalendar/deleteAssignment

**Description:** Deletes an assignment record and removes all references to it from calendars.

**Requirements:**
- `assignmentId`: The ID of an existing assignment to delete.

**Effects:**
- Deletes the assignment document from the `assignments` collection.
- Atomically removes any references to this assignment from all `calendarDays` documents.

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
---
### POST /api/BrontoCalendar/createOfficeHours

**Description:** Creates a new office hours record within the calendar concept.

**Requirements:**
- `classId`: An ID identifying the class these office hours belong to.
- `startTime`: A valid Date object for when office hours begin.
- `duration`: A non-negative number (in minutes) for the duration.

**Effects:**
- Creates a new office hours object in the `officeHours` collection.
- Returns the ID of the newly created office hours.

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
---
### POST /api/BrontoCalendar/assignOH

**Description:** Assigns existing office hours to a user's calendar on its start date.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `officeHoursId`: The ID of an existing office hours object.

**Effects:**
- Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.

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
---
### POST /api/BrontoCalendar/changeOH

**Description:** Updates office hours' time and duration, and moves its entry on the calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar associated with the office hours.
- `officeHoursId`: The ID of an existing office hours object to modify.
- `newDate`: A valid Date object for the new start time.
- `newDuration`: A non-negative number for the new duration.

**Effects:**
- Modifies the `startTime` and `duration` of the specified office hours.
- If the date changes, the office hours entry is moved from its old calendar day to the new one.

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
---
### POST /api/BrontoCalendar/deleteOfficeHours

**Description:** Deletes an office hours record and removes all references to it from calendars.

**Requirements:**
- `officeHoursId`: The ID of an existing office hours object to delete.

**Effects:**
- Deletes the office hours document from the `officeHours` collection.
- Atomically removes any references to these office hours from all `calendarDays` documents.

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
---
### POST /api/BrontoCalendar/_getCalendarForUser

**Description:** Retrieves the calendar document for a given user.

**Requirements:**
- N/A

**Effects:**
- Returns the calendar document for a given user, or null if not found (resulting in an empty array).

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
---
### POST /api/BrontoCalendar/_getAssignmentsOnDay

**Description:** Retrieves a list of assignment documents scheduled for a specific day on a specific calendar.

**Requirements:**
- N/A

**Effects:**
- Returns a list of assignment documents scheduled for a specific day.

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
---
### POST /api/BrontoCalendar/_getOfficeHoursOnDay

**Description:** Retrieves a list of office hours documents scheduled for a specific day on a specific calendar.

**Requirements:**
- N/A

**Effects:**
- Returns a list of office hours documents scheduled for a specific day.

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
---
### POST /api/BrontoCalendar/_getAssignment

**Description:** Retrieves an assignment document by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an assignment document by its ID, or null if not found (resulting in an empty array).

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
---
### POST /api/BrontoCalendar/_getOfficeHours

**Description:** Retrieves an office hours document by its ID.

**Requirements:**
- N/A

**Effects:**
- Returns an office hours document by its ID, or null if not found (resulting in an empty array).

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
---
# API Specification: UserAuthentication Concept

**Purpose:** To register new users and authenticate existing users with secure password handling.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and a securely hashed password.

**Requirements:**
- The provided `username` must not already be taken.

**Effects:**
- A new User is created.
- The provided `password` is securely salted and hashed.
- The resulting hash and the generated salt are stored.
- The ID of the newly registered user is returned.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user by verifying their username and password.

**Requirements:**
- A user with the given `username` must exist in the system.

**Effects:**
- The provided `password` is hashed using the user's stored salt.
- If the hash matches the stored hash, the ID of the authenticated user is returned.
- Otherwise, an authentication error is returned.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: Sessioning Concept

**Purpose:** To maintain a user's logged-in state across multiple requests without re-sending credentials.

---

## API Endpoints

### POST /api/Sessioning/create

**Description:** Creates a new session for a given user, effectively logging them in.

**Requirements:**
- true (can always be called).

**Effects:**
- Creates a new Session `s`.
- Associates `s` with the given `user`.
- Returns `s` as `session`.

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "session": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Sessioning/delete

**Description:** Deletes an existing session, effectively logging a user out.

**Requirements:**
- The given `session` exists.

**Effects:**
- Removes the session `s`.

**Request Body:**
```json
{
  "session": "ID"
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
---
### POST /api/Sessioning/_getUser

**Description:** Retrieves the user associated with a given session.

**Requirements:**
- The given `session` exists.

**Effects:**
- Returns the user associated with the session.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---