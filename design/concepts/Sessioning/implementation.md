[@concept-background](../../tools/concept-background.md)

[@Sessioning](Sessioning.md)

# implement: Sessioning
# response:

```typescript
// src/concepts/Sessioning/SessioningConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Sessioning" + ".";

// Generic types of this concept as defined in the concept specification
type User = ID;
type Session = ID;

/**
 * Interface for the MongoDB document representing a session.
 * Corresponds to "a set of Sessions with a user User" in the state description.
 */
interface SessionDoc {
  _id: Session; // The ID of the session
  user: User; // The user associated with this session
}

/**
 * concept: Sessioning [User, Session]
 *
 * purpose: To maintain a user's logged-in state across multiple requests without re-sending credentials.
 *
 * principle: After a user is authenticated, a session is created for them. Subsequent requests using that
 * session's ID are treated as being performed by that user, until the session is deleted (logout).
 */
export default class SessioningConcept {
  // MongoDB collection to store session documents
  sessions: Collection<SessionDoc>;

  /**
   * Constructor for the SessioningConcept.
   * Initializes the MongoDB collection.
   * @param db The MongoDB database instance.
   */
  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * create (user: User): (session: Session)
   *
   * **requires**: true.
   *
   * **effects**: creates a new Session `s`; associates it with the given `user`; returns `s` as `session`.
   *
   * @param args An object containing the user ID.
   * @returns A Promise resolving to an object containing the new session ID.
   */
  async create({ user }: { user: User }): Promise<{ session: Session }> {
    const newSessionId = freshID(); // Generate a fresh ID for the new session
    const sessionDoc: SessionDoc = {
      _id: newSessionId,
      user: user,
    };

    await this.sessions.insertOne(sessionDoc); // Insert the new session document into the database

    return { session: newSessionId }; // Return the ID of the newly created session
  }

  /**
   * delete (session: Session): ()
   *
   * **requires**: the given `session` exists.
   *
   * **effects**: removes the session `s`.
   *
   * @param args An object containing the session ID to delete.
   * @returns A Promise resolving to an empty object on success, or an error object if the session is not found.
   */
  async delete({ session }: { session: Session }): Promise<Empty | { error: string }> {
    // Attempt to delete the session document by its ID
    const result = await this.sessions.deleteOne({ _id: session });

    // If no document was deleted, it means the session did not exist.
    // As per concept design, normal errors should return an error object.
    if (result.deletedCount === 0) {
      return { error: `Session '${session}' not found.` };
    }

    return {}; // Return an empty object to indicate successful deletion
  }

  /**
   * _getUser (session: Session): (user: User)
   *
   * **requires**: the given `session` exists.
   *
   * **effects**: returns the user associated with the session.
   *
   * @param args An object containing the session ID.
   * @returns A Promise resolving to an array of objects, each containing the user associated with the session.
   *          Returns an error object if the session is not found.
   */
  async _getUser({ session }: { session: Session }): Promise<Array<{ user: User }> | { error: string }> {
    // Find the session document by its ID
    const sessionDoc = await this.sessions.findOne({ _id: session });

    // If the session document is not found, return an error.
    if (!sessionDoc) {
      return { error: `Session '${session}' not found.` };
    }

    // Queries must return an array of dictionaries.
    return [{ user: sessionDoc.user }]; // Return the user associated with the found session
  }
}
```