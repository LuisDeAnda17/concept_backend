---
timestamp: 'Tue Nov 04 2025 10:19:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_101957.6a796a09.md]]'
content_id: 7758ccd8a0e0b80a73836f99cfd0714aeeb874620305d693e4428e3c10be4ac5
---

# API Specification: Sessioning Concept

**Purpose:** To maintain a user's logged-in state across multiple requests without re-sending credentials.

***

## API Endpoints

### POST /api/Sessioning/create

**Description:** Creates a new session for a given user, effectively logging them in.

**Requirements:**

* true (can always be called).

**Effects:**

* Creates a new Session `s`.
* Associates `s` with the given `user`.
* Returns `s` as `session`.

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

**Description:** Deletes an existing session, effectively logging a user out.

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

**Description:** Retrieves the user associated with a given session.

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
