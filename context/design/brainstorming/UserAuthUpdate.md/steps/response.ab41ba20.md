---
timestamp: 'Thu Oct 16 2025 11:46:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_114655.ceddc8d7.md]]'
content_id: ab41ba20371cc5856ae472ab403b2fafa2c7eaeda2c4dfc1c1de5087cb8435e0
---

# response:

Here is the implementation of the `UserAuthentication` concept, incorporating proper password hashing and salting using Deno's `node:crypto` module.

```concept
concept UserAuthentication
purpose: Limit access of account to known users
principle: after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user
state:
  - a set of Users with
      - a username String
      - a passwordHash String (hashed password using PBKDF2)
      - a salt String (random salt used for hashing)
actions:
  - register (username: String, password: String): (user: User | {error: String})
    - requires: A username and password, where the username has not been taken before.
    - effects: A new User is created with the provided username, a generated salt, and a password hash derived from the password and salt. Returns the User's ID on success.
  - authenticate (username: String, password: String): (user: User | {error: String})
    - requires: The username and password both correspond to the same, existing User.
    - effects: If the username and password match an existing user, returns the User's ID. Otherwise, returns an error.
queries:
  - _getUserByUsername (username: String): (user: User)
```

```typescript
// file: src/UserAuthentication/UserAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto";

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

// Generic type of this concept
type User = ID;

/**
 * Constants for PBKDF2 password hashing.
 * These values are recommended best practices and can be tuned.
 * - SALT_LENGTH: The length of the generated salt in bytes.
 * - KEY_LENGTH: The length of the derived key (hashed password) in bytes.
 * - ITERATIONS: The number of PBKDF2 iterations. Higher is more secure but slower.
 * - DIGEST: The hashing algorithm to use.
 */
const SALT_LENGTH = 16; // 16 bytes = 32 hex chars
const KEY_LENGTH = 64;  // 64 bytes = 128 hex chars
const ITERATIONS = 100000; // A high number for security, adjust based on performance needs
const DIGEST = "sha512"; // Strong hashing algorithm

/**
 * a set of Users with
 *  - a username String
 *  - a passwordHash String (hashed password using PBKDF2)
 *  - a salt String (random salt used for hashing)
 */
interface UserDocument {
  _id: User;
  username: string;
  passwordHash: string;
  salt: string;
}

export default class UserAuthenticationConcept {
  users: Collection<UserDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Generates a cryptographically secure random salt.
   * @returns {string} The salt as a hexadecimal string.
   */
  private _generateSalt(): string {
    return crypto.randomBytes(SALT_LENGTH).toString("hex");
  }

  /**
   * Hashes a password using PBKDF2 with the provided salt.
   * @param {string} password The plain-text password to hash.
   * @param {string} salt The salt (hexadecimal string) to use for hashing.
   * @returns {Promise<string>} A promise that resolves to the hashed password as a hexadecimal string.
   */
  private _hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString("hex"));
      });
    });
  }

  /**
   * Verifies a plain-text password against a stored hashed password and salt.
   * @param {string} password The plain-text password to verify.
   * @param {string} storedHash The stored hashed password (hexadecimal string).
   * @param {string} storedSalt The stored salt (hexadecimal string).
   * @returns {Promise<boolean>} A promise that resolves to true if the password matches, false otherwise.
   */
  private async _verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string,
  ): Promise<boolean> {
    try {
      const calculatedHash = await this._hashPassword(password, storedSalt);
      // Use crypto.timingSafeEqual to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(calculatedHash, "hex"),
        Buffer.from(storedHash, "hex"),
      );
    } catch (error) {
      console.error("Error during password verification:", error);
      return false;
    }
  }

  /**
   * @action
   * register (username: String, password: String): (user: User | {error: String})
   * requires: A username and password, where the username has not been taken before.
   * effects: A new User is created with the provided username, a generated salt,
   *          and a password hash derived from the password and salt.
   *          Returns the User's ID on success.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    if (!username || !password) {
      return { error: "Username and password are required." };
    }

    // Check if username already exists
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already taken." };
    }

    try {
      const salt = this._generateSalt();
      const passwordHash = await this._hashPassword(password, salt);

      const newUser: UserDocument = {
        _id: freshID(),
        username,
        passwordHash,
        salt,
      };

      await this.users.insertOne(newUser);
      return { user: newUser._id };
    } catch (error) {
      console.error("Error during user registration:", error);
      return { error: "Failed to register user due to an internal error." };
    }
  }

  /**
   * @action
   * authenticate (username: String, password: String): (user: User | {error: String})
   * requires: The username and password both correspond to the same, existing User.
   * effects: If the username and password match an existing user, returns the User's ID.
   *          Otherwise, returns an error.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    if (!username || !password) {
      return { error: "Username and password are required." };
    }

    const user = await this.users.findOne({ username });

    // Avoid distinguishing between "user not found" and "wrong password" for security.
    if (!user) {
      return { error: "Invalid username or password." };
    }

    try {
      const isPasswordValid = await this._verifyPassword(
        password,
        user.passwordHash,
        user.salt,
      );

      if (isPasswordValid) {
        return { user: user._id };
      } else {
        return { error: "Invalid username or password." };
      }
    } catch (error) {
      console.error("Error during user authentication:", error);
      return { error: "Failed to authenticate user due to an internal error." };
    }
  }

  /**
   * @query
   * _getUserByUsername (username: String): (user: UserDocument | null)
   * A query to retrieve a user by their username. Useful for testing or internal lookups.
   */
  async _getUserByUsername({ username }: { username: string }): Promise<UserDocument | null> {
    return await this.users.findOne({ username });
  }

  /**
   * @query
   * _getUserById (id: User): (user: UserDocument | null)
   * A query to retrieve a user by their ID. Useful for testing or internal lookups.
   */
  async _getUserById({ id }: { id: User }): Promise<UserDocument | null> {
    return await this.users.findOne({ _id: id });
  }

  /**
   * @query
   * _getAllUsers(): (users: UserDocument[])
   * A query to retrieve all users. Use with caution in production.
   */
  async _getAllUsers(): Promise<UserDocument[]> {
    return await this.users.find().toArray();
  }
}
```
