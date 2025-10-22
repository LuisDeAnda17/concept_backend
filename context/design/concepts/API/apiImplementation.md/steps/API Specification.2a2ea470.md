---
timestamp: 'Mon Oct 20 2025 16:47:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_164738.516f1b46.md]]'
content_id: 2a2ea4700c3639f9bc46928aa069b8c7cef2960b06eada4ba9bda7233bc93838
---

# API Specification: BrontoBoard Concept

**Purpose:** Associates set of Assignments, an overview, office hours, and a name to a class and that class to a BrontoBoard.

***

## API Endpoints

### POST /api/BrontoBoard/initializeBB

**Description:** Creates an empty BrontoBoard for the user.

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

**Description:** Creates a class object assigned to the BrontoBoard with the given information.

**Requirements:**

* User is the owner of the BrontoBoard.
* The Classname not be an empty String.

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

**Description:** Create an Assignment under the Class of the owner with the given name and due date.

**Requirements:**

* User is the owner of the BrontoBoard.
* Owner and class are valid.
* WorkName and dueDate be not empty.
* DueDate be not before the current date.

**Effects:**

* Create an Assignment under the Class of the owner with the given name and due date.

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

***

### POST /api/BrontoBoard/changeWork

**Description:** Modifies the Assignment to the new date.

**Requirements:**

* User is the owner of the BrontoBoard.
* A valid Assignment of a Class of the owner with a future date.

**Effects:**

* Modifies the Assignment to the new date.

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

***

### POST /api/BrontoBoard/removeWork

**Description:** Removes the Assignment from its class.

**Requirements:**

* User is the owner of the BrontoBoard.
* A valid owner and existing Assignment.

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

**Description:** Creates Office Hours under the Class of the owner with the given start time and duration.

**Requirements:**

* User is the owner of the BrontoBoard associated with the class.
* A valid class of the owner with a future OHTime and non-negative OHDuration.

**Effects:**

* Creates Office Hours under the Class of the owner with the given start time and duration.

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

***

### POST /api/BrontoBoard/changeOH

**Description:** Modifies the office hours to the new date and duration.

**Requirements:**

* User is the owner of the BrontoBoard.
* A valid office hour record, a future newDate and non-negative newduration.

**Effects:**

* Modifies the office hours to the new date and duration.

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

***

### POST /api/BrontoBoard/\_getAssignmentsForClass

**Description:** Returns an array of assignments for the given class.

**Requirements:**

* None explicitly stated, implies class ID is valid.

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

### POST /api/BrontoBoard/\_getOfficeHoursForClass

**Description:** Returns an array of office hours for the given class.

**Requirements:**

* None explicitly stated, implies class ID is valid.

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

### POST /api/BrontoBoard/\_getClassesForBrontoBoard

**Description:** Returns an array of classes for the given BrontoBoard.

**Requirements:**

* None explicitly stated, implies BrontoBoard ID is valid.

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

### POST /api/BrontoBoard/\_getBrontoBoardsForUser

**Description:** Returns an array of BrontoBoards owned by the given user.

**Requirements:**

* None explicitly stated, implies user ID is valid.

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
