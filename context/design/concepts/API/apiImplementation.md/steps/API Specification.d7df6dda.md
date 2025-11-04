---
timestamp: 'Tue Nov 04 2025 10:17:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_101726.32198fc5.md]]'
content_id: d7df6ddaa00799064553137de78cf8bedb64287422a7b0f9d516c95729fe1a71
---

# API Specification: Sessioning Concept

**Purpose:** To maintain a user's logged-in state across multiple requests without re-sending credentials.

***

## API Endpoints

### POST /api/Sessioning/create

**Description:** Creates a new session and associates it with the given user.

**Requirements:**

* true.

**Effects:**

* Creates a new Session `s`; associates it with the given `user`; returns `s` as `session`.

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

***

### POST /api/Sessioning/delete

**Description:** Deletes the specified session, effectively logging out the associated user.

**Requirements:**

* The given `session` exists.

**Effects:**

* Removes the session `s`.

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

***

### POST /api/Sessioning/\_getUser

**Description:** Returns the user associated with the specified session.

**Requirements:**

* The given `session` exists.

**Effects:**

* Returns the user associated with the session.

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

***
