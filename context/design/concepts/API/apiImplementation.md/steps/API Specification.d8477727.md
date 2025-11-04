---
timestamp: 'Tue Nov 04 2025 10:19:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_101957.6a796a09.md]]'
content_id: d84777278ec7d4d2b11ffccb01b6a9fe04aee84e762ed9b31b0847dc4b2f7e66
---

# API Specification: BrontoBoard Concept

**Purpose:** Associates set of Assignments, an overview, office hours, and a name to a class and that class to a BrontoBoard.

***

## API Endpoints

### POST /api/BrontoBoard/initializeBB

**Description:** Creates an empty BrontoBoard for a user.

**Requirements:**

* A valid user and their calendar.

**Effects:**

* Creates an empty BrontoBoard for the user.

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

***

### POST /api/BrontoBoard/createClass

**Description:** Creates a new class within a specified BrontoBoard.

**Requirements:**

* User is the owner of the BrontoBoard.
* Classname must not be an empty String.

**Effects:**

* Creates a class object assigned to the BrontoBoard with the given information.

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

***

### POST /api/BrontoBoard/addWork

**Description:** Creates a new assignment for a class.

**Requirements:**

* User is the owner of the BrontoBoard.
* Owner and class are valid.
* `workName` is not empty.
* `dueDate` is not empty and is not before the current date.

**Effects:**

* Creates an Assignment under the Class of the owner with the given name and due date.

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

***

### POST /api/BrontoBoard/changeWork

**Description:** Modifies the due date of an existing assignment.

**Requirements:**

* User is the owner of the BrontoBoard associated with the assignment.
* The assignment is valid and belongs to a class owned by the user.
* The new `dueDate` is a future date.

**Effects:**

* Modifies the Assignment to the new date.

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

***

### POST /api/BrontoBoard/removeWork

**Description:** Removes an assignment from its class.

**Requirements:**

* User is the owner of the BrontoBoard associated with the assignment.
* The owner and assignment are valid.

**Effects:**

* Removes the Assignment from its class.

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

***

### POST /api/BrontoBoard/addOH

**Description:** Creates a new Office Hours record for a class.

**Requirements:**

* User is the owner of the BrontoBoard associated with the class.
* The class is valid and belongs to the owner.
* `OHTime` is a future date.
* `OHduration` is a non-negative number.

**Effects:**

* Creates Office Hours under the Class of the owner with the given start time and duration.

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

***

### POST /api/BrontoBoard/changeOH

**Description:** Modifies the time and duration of an existing Office Hours record.

**Requirements:**

* User is the owner of the BrontoBoard associated with the office hours.
* The office hour record is valid.
* `newDate` is a future date.
* `newduration` is a non-negative number.

**Effects:**

* Modifies the office hours to the new date and duration.

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

***

### POST /api/BrontoBoard/getAssignmentsForClass

**Description:** Retrieves all assignments for a given class.

**Requirements:**

* N/A

**Effects:**

* Returns an array of assignments for the given class.

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

***

### POST /api/BrontoBoard/getOfficeHoursForClass

**Description:** Retrieves all office hours for a given class.

**Requirements:**

* N/A

**Effects:**

* Returns an array of office hours for the given class.

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

***

### POST /api/BrontoBoard/getClassesForBrontoBoard

**Description:** Retrieves all classes for a given BrontoBoard.

**Requirements:**

* N/A

**Effects:**

* Returns an array of classes for the given BrontoBoard.

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

***

### POST /api/BrontoBoard/getBrontoBoardsForUser

**Description:** Retrieves all BrontoBoards owned by a given user.

**Requirements:**

* N/A

**Effects:**

* Returns an array of BrontoBoards owned by the given user.

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

***

### POST /api/BrontoBoard/getBrontoBoardById

**Description:** Retrieves a single BrontoBoard by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an array containing the BrontoBoard document if found, otherwise an empty array.

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

***

### POST /api/BrontoBoard/getClassById

**Description:** Retrieves a single class by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an array containing the Class document if found, otherwise an empty array.

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

***

### POST /api/BrontoBoard/getAssignmentById

**Description:** Retrieves a single assignment by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an array containing the Assignment document if found, otherwise an empty array.

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

***

### POST /api/BrontoBoard/getOfficeHourById

**Description:** Retrieves a single office hour record by its ID.

**Requirements:**

* N/A

**Effects:**

* Returns an array containing the OfficeHour document if found, otherwise an empty array.

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

***
