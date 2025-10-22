[@BrontoBoard](../../../src/concepts/BrontoBoard/BrontoBoardConcept.ts)

[@BrontoCalendar](../../../src/concepts/BrontoCalendar/BrontoCalendarConcept.ts)

[@UserAuthentication](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

[@API-extraction-from-code](../../tools/api-extraction-from-code.md)

# api-extraction: 
# response:

# API Specification: BrontoBoard Concept

**Purpose:** Associates set of Assignments, an overview, office hours, and a name to a class and that class to a BrontoBoard.

---

## API Endpoints

### POST /api/BrontoBoard/initializeBB

**Description:** Creates an empty BrontoBoard for the user.

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

**Description:** Creates a class object assigned to the BrontoBoard with the given information.

**Requirements:**
- User is the owner of the BrontoBoard.
- The Classname not be an empty String.

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

**Description:** Create an Assignment under the Class of the owner with the given name and due date.

**Requirements:**
- User is the owner of the BrontoBoard.
- Owner and class are valid.
- WorkName and dueDate be not empty.
- DueDate be not before the current date.

**Effects:**
- Create an Assignment under the Class of the owner with the given name and due date.

**Request Body:**
```json
{
  "owner": "ID",
  "class": "ID",
  "workName": "string",
  "dueDate": "string (ISO 8601)"
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

**Description:** Modifies the Assignment to the new date.

**Requirements:**
- User is the owner of the BrontoBoard.
- A valid Assignment of a Class of the owner with a future date.

**Effects:**
- Modifies the Assignment to the new date.

**Request Body:**
```json
{
  "owner": "ID",
  "work": "ID",
  "dueDate": "string (ISO 8601)"
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

**Description:** Removes the Assignment from its class.

**Requirements:**
- User is the owner of the BrontoBoard.
- A valid owner and existing Assignment.

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

**Description:** Creates Office Hours under the Class of the owner with the given start time and duration.

**Requirements:**
- User is the owner of the BrontoBoard associated with the class.
- A valid class of the owner with a future OHTime and non-negative OHDuration.

**Effects:**
- Creates Office Hours under the Class of the owner with the given start time and duration.

**Request Body:**
```json
{
  "owner": "ID",
  "class": "ID",
  "OHTime": "string (ISO 8601)",
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

**Description:** Modifies the office hours to the new date and duration.

**Requirements:**
- User is the owner of the BrontoBoard.
- A valid office hour record, a future newDate and non-negative newduration.

**Effects:**
- Modifies the office hours to the new date and duration.

**Request Body:**
```json
{
  "owner": "ID",
  "oh": "ID",
  "newDate": "string (ISO 8601)",
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

### POST /api/BrontoBoard/_getAssignmentsForClass

**Description:** Returns an array of assignments for the given class.

**Requirements:**
- None explicitly stated, implies class ID is valid.

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

---

### POST /api/BrontoBoard/_getOfficeHoursForClass

**Description:** Returns an array of office hours for the given class.

**Requirements:**
- None explicitly stated, implies class ID is valid.

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

---

### POST /api/BrontoBoard/_getClassesForBrontoBoard

**Description:** Returns an array of classes for the given BrontoBoard.

**Requirements:**
- None explicitly stated, implies BrontoBoard ID is valid.

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

### POST /api/BrontoBoard/_getBrontoBoardsForUser

**Description:** Returns an array of BrontoBoards owned by the given user.

**Requirements:**
- None explicitly stated, implies user ID is valid.

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

# API Specification: BrontoCalendar Concept

**Purpose:** Associate an assignment or Exam to a day on a calendar.

---

## API Endpoints

### POST /api/BrontoCalendar/createCalendar

**Description:** Creates an empty Calendar document for the specified user.

**Requirements:**
- `user`: The ID of a valid user for whom the calendar is to be created.
- A calendar for this user must not already exist in the `calendars` collection.

**Effects:**
- Creates an empty Calendar document for the specified user in the `calendars` collection.
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

**Description:** Creates a new assignment object in the `assignments` collection.

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

---

### POST /api/BrontoCalendar/assignWork

**Description:** Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.

**Effects:**
- Adds the `assignmentId` to the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
- Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.
- Returns an error if the calendar or assignment is not found.

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

**Description:** Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `assignmentId`: The ID of an existing assignment within the concept's `assignments` state.

**Effects:**
- Removes the `assignmentId` from the list of assignments for the day corresponding to its `dueDate` on the `owner`'s calendar.
- If the assignment is not found on the calendar, an error is returned.
- Leaves the `AssignmentDoc` in the `assignments` collection unless `deleteAssignment` is called.

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

**Description:** Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.

**Requirements:**
- `owner`: The ID of the user who owns the calendar associated with the assignment.
- `assignmentId`: The ID of an existing assignment to modify.
- `newDueDate`: A valid Date object for the new due date.

**Effects:**
- Modifies the `dueDate` of the specified `assignmentId` in the `assignments` collection.
- If the date component of `dueDate` changes, the assignment entry is moved from its old calendar day to the new one.
- Returns an error if the owner's calendar is not found, assignment not found, or input is invalid.

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

---

### POST /api/BrontoCalendar/deleteAssignment

**Description:** Deletes the assignment document from the `assignments` collection.

**Requirements:**
- `assignmentId`: The ID of an existing assignment to delete from the concept's state.

**Effects:**
- Deletes the assignment document from the `assignments` collection.
- Atomically removes any references to this assignment from all `calendarDays` documents across all calendars.
- Returns an error if the assignment is not found.

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

**Description:** Creates a new office hours object in the `officeHours` collection.

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

---

### POST /api/BrontoCalendar/assignOH

**Description:** Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.

**Requirements:**
- `owner`: The ID of the user who owns the calendar.
- `officeHoursId`: The ID of an existing office hours object within the concept's `officeHours` state.

**Effects:**
- Adds the `officeHoursId` to the list of office hours for the day corresponding to its `startTime` on the `owner`'s calendar.
- Creates a `CalendarDayDoc` if one doesn't exist for that calendar and day, linking it to the owner's calendar.

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

**Description:** Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.

**Requirements:**
- `owner`: The ID of the user who owns the calendar associated with the office hours.
- `officeHoursId`: The ID of an existing office hours object to modify.
- `newDate`: A valid Date object for the new start time (only date component considered for calendar day).
- `newDuration`: A non-negative number for the new duration.

**Effects:**
- Modifies the `startTime` and `duration` of the specified `officeHoursId` in the `officeHours` collection.
- If the date component of `startTime` changes, the office hours entry is moved from its old calendar day to the new one.
- Returns an error if the owner's calendar is not found, office hours not found, or input is invalid.

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

---

### POST /api/BrontoCalendar/deleteOfficeHours

**Description:** Deletes the office hours document from the `officeHours` collection.

**Requirements:**
- `officeHoursId`: The ID of an existing office hours object to delete from the concept's state.

**Effects:**
- Deletes the office hours document from the `officeHours` collection.
- Atomically removes any references to these office hours from all `calendarDays` documents across all calendars.
- Returns an error if the office hours are not found.

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

**Description:** Returns the calendar document for a given user, or null if not found.

**Requirements:**
- None.

**Effects:**
- Returns the calendar document for a given user, or null if not found.

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

**Description:** Returns a list of assignment documents scheduled for a specific day on a specific calendar.

**Requirements:**
- None.

**Effects:**
- Returns a list of assignment documents scheduled for a specific day on a specific calendar.
- If no assignments or calendar day found, returns an empty array.

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

---

### POST /api/BrontoCalendar/_getOfficeHoursOnDay

**Description:** Returns a list of office hours documents scheduled for a specific day on a specific calendar.

**Requirements:**
- None.

**Effects:**
- Returns a list of office hours documents scheduled for a specific day on a specific calendar.
- If no office hours or calendar day found, returns an empty array.

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

---

### POST /api/BrontoCalendar/_getAssignment

**Description:** Returns an assignment document by its ID, or null if not found.

**Requirements:**
- None.

**Effects:**
- Returns an assignment document by its ID, or null if not found.

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

---

### POST /api/BrontoCalendar/_getOfficeHours

**Description:** Returns an office hours document by its ID, or null if not found.

**Requirements:**
- None.

**Effects:**
- Returns an office hours document by its ID, or null if not found.

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

---

# API Specification: UserAuthentication Concept

**Purpose:** Authenticate users securely.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and a securely hashed password.

**Requirements:**
- The provided `username` must not already be taken.

**Effects:**
- A new User is created.
- The provided `password` is securely salted and hashed using best cryptographic practices.
- Both the resulting hash and the generated salt are stored in the concept's state.
- The ID of the newly registered user is returned.
- If the username is already taken, an error is returned.

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
- The provided `password` is salted with the stored salt corresponding to the given `username` and then hashed.
- If the resulting hash exactly matches the stored `hashedPassword` for that user, the ID of the authenticated user is returned.
- Otherwise, an authentication error is returned (using a generic message to prevent username enumeration).

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