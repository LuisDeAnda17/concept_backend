[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@BrontoBoard](./UserAuth.md)

<!-- # prompt: Upgrade this concept to use proper hashing, salting, and other best practices utilizing the "node:crypto" import. -->

# response:

Here's the upgraded `UserAuthentication` concept specification and its TypeScript implementation, incorporating secure password hashing and salting using `node:crypto`.

---

# Concept: UserAuthentication

## Concept Specification

```markdown
__concept:__ UserAuthentication [User]
__purpose:__ Limit access of an application to known and authenticated users.
__principle:__ after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user.
__state:__
>   - a set of Users with
        - a username String
        - a hashedPassword String  (securely stored hash of the password)
        - a salt String            (cryptographically random salt used for hashing)
__actions:__
    - __register__ (username: String, password: String): (user: User) | (error: String)
        - requires: The provided `username` must not already be taken.
        - effects: A new User is created. The provided `password` is securely salted and hashed using best cryptographic practices. Both the resulting hash and the generated salt are stored in the concept's state. The ID of the newly registered user is returned. If the username is already taken, an error is returned.
    - __authenticate__ (username: String, password: String): (user: User) | (error: String)
        - requires: A user with the given `username` must exist in the system.
        - effects: The provided `password` is salted with the stored salt corresponding to the given `username` and then hashed. If the resulting hash exactly matches the stored `hashedPassword` for that user, the ID of the authenticated user is returned. Otherwise, an authentication error is returned (using a generic message to prevent username enumeration).
```

---

# Implementation

## file: src/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto"; // For hashing passwords

// Define constants for scrypt to ensure consistent and secure hashing
// These parameters should be chosen carefully based on security requirements and performance benchmarks.
// N (cpu/memory cost), r (block size), p (parallelization factor)
const SALT_LENGTH_BYTES = 16; // 16 bytes for a cryptographically secure random salt
const KEY_LENGTH_BYTES = 64;  // 64 bytes for the derived key (hashed password)
const SCRYPT_N = 16384;       // Iterations/cost factor (must be a power of 2, e.g., 2^14)
const SCRYPT_R = 8;           // Block size
const SCRYPT_P = 1;           // Parallelization factor

// Prefix for MongoDB collection names to ensure they are unique to this concept
const PREFIX = "UserAuthentication" + ".";

/**
 * Type parameter for externally defined generic types.
 * In this concept, 'User' refers to the identity of a user, which is external to this concept's internal details.
 */
type User = ID;

/**
 * Interface representing the structure of a user document stored in the database.
 * __state:__
 * >   - a set of Users with
 *         - a username String
 *         - a hashedPassword String
 *         - a salt String
 */
interface UserDoc {
  _id: User; // The unique identifier for the user
  username: string; // The user's chosen username (must be unique)
  hashedPassword: string; // The cryptographically hashed password
  salt: string; // The unique salt used to hash this user's password
}

export default class UserAuthenticationConcept {
  // MongoDB collection to store user documents
  users: Collection<UserDoc>;

  /**
   * Constructs a new UserAuthenticationConcept instance.
   * @param {Db} db The MongoDB database instance to use.
   */
  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Generates a cryptographically secure random salt.
   * @returns {string} A hexadecimal string representation of the generated salt.
   */
  private generateSalt(): string {
    return crypto.randomBytes(SALT_LENGTH_BYTES).toString('hex');
  }

  /**
   * Hashes a plain-text password using the scrypt algorithm with a given salt.
   * @param {string} password The plain-text password to hash.
   * @param {string} salt The hexadecimal string representation of the salt to use.
   * @returns {Promise<string>} A promise that resolves to the hexadecimal string of the hashed password.
   * @throws {Error} If the hashing process fails.
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convert the hexadecimal salt string back into a Buffer for scrypt
      const saltBuffer = Buffer.from(salt, 'hex');
      crypto.scrypt(
        password,
        saltBuffer,
        KEY_LENGTH_BYTES,
        { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
        (err, derivedKey) => {
          if (err) reject(err);
          // Convert the derived key (hash) to a hexadecimal string for storage
          resolve(derivedKey.toString('hex'));
        },
      );
    });
  }

  /**
   * __register__ (username: String, password: String): (user: User) | (error: String)
   *
   * Registers a new user with a unique username and a securely hashed password.
   *   - requires: The provided `username` must not already be taken.
   *   - effects: A new User is created. The provided `password` is securely salted and hashed
   *              using best cryptographic practices. Both the resulting hash and the generated
   *              salt are stored in the concept's state. The ID of the newly registered user is returned.
   *              If the username is already taken, an error is returned.
   *
   * @param {object} params - The input parameters for the registration.
   * @param {string} params.username - The username for the new account.
   * @param {string} params.password - The plain-text password for the new account.
   * @returns {Promise<{ user: User } | { error: string }>} A promise that resolves to the new user's ID on success, or an error object.
   */
  public async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // 1. Check if username already exists
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already taken." };
    }

    // 2. Generate a unique salt and hash the password
    const salt = this.generateSalt();
    let hashedPassword: string;
    try {
      hashedPassword = await this.hashPassword(password, salt);
    } catch (e) {
      console.error(
        `Error hashing password for username '${username}' during registration:`,
        e,
      );
      return { error: "Failed to securely process password." };
    }

    // 3. Create a new user document
    const newUserId = freshID(); // Generate a fresh ID for the new user
    const newUser: UserDoc = {
      _id: newUserId,
      username,
      hashedPassword,
      salt,
    };

    // 4. Store the new user document in the database
    await this.users.insertOne(newUser);

    // 5. Return the ID of the newly registered user
    return { user: newUserId };
  }

  /**
   * __authenticate__ (username: String, password: String): (user: User) | (error: String)
   *
   * Authenticates a user by verifying their username and password.
   *   - requires: A user with the given `username` must exist in the system.
   *   - effects: The provided `password` is salted with the stored salt corresponding
   *              to the given `username` and then hashed. If the resulting hash exactly
   *              matches the stored `hashedPassword` for that user, the ID of the
   *              authenticated user is returned. Otherwise, an authentication error is
   *              returned (using a generic message to prevent username enumeration).
   *
   * @param {object} params - The input parameters for authentication.
   * @param {string} params.username - The username to authenticate.
   * @param {string} params.password - The plain-text password provided by the user.
   * @returns {Promise<{ user: User } | { error: string }>} A promise that resolves to the authenticated user's ID on success, or an error object.
   */
  public async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // 1. Find the user document by username
    const userDoc = await this.users.findOne({ username });

    if (!userDoc) {
      // Return a generic error message to prevent username enumeration attacks,
      // which would tell an attacker if a username exists or not.
      return { error: "Invalid username or password." };
    }

    // 2. Hash the provided password using the user's stored salt
    let providedPasswordHash: string;
    try {
      providedPasswordHash = await this.hashPassword(password, userDoc.salt);
    } catch (e) {
      console.error(
        `Error hashing provided password for username '${username}' during authentication:`,
        e,
      );
      return { error: "Authentication failed due to processing error." };
    }

    // 3. Compare the newly generated hash with the stored hashed password
    //    Use crypto.timingSafeEqual to prevent timing attacks.
    //    Timing attacks exploit the fact that string comparisons often short-circuit
    //    early if characters don't match, revealing information about the password.
    const storedHashBuffer = Buffer.from(userDoc.hashedPassword, 'hex');
    const providedHashBuffer = Buffer.from(providedPasswordHash, 'hex');

    // It's crucial that buffers have the same length before calling timingSafeEqual
    // to prevent errors and potential information leakage if lengths differ.
    if (storedHashBuffer.length !== providedHashBuffer.length) {
      return { error: "Invalid username or password." };
    }

    const passwordsMatch = crypto.timingSafeEqual(
      storedHashBuffer,
      providedHashBuffer,
    );

    // 4. Return the result of the authentication
    if (passwordsMatch) {
      return { user: userDoc._id };
    } else {
      // Use the same generic error message for incorrect password as for non-existent username
      return { error: "Invalid username or password." };
    }
  }
}
```

# response:

In the provided `UserAuthenticationConcept` implementation, `Buffer` is used extensively because cryptographic operations in Node.js (via the `node:crypto` module) fundamentally operate on raw binary data, not directly on JavaScript strings.

Here's a breakdown of why `Buffer` is necessary in this context:

1.  **Representing Raw Binary Data:**
    *   **Salts and Hashed Passwords are Binary:** A cryptographically secure random salt and the output of a hashing function (like scrypt) are sequences of unpredictable bytes. `Buffer` is Node.js's way of representing this raw binary data efficiently.
    *   `crypto.randomBytes(SALT_LENGTH_BYTES)` directly returns a `Buffer` because it's generating raw, random bytes.

2.  **Conversion Between Storage (Strings) and Operations (Buffers):**
    *   **Storing in Database:** Databases and JSON typically prefer to store text (strings) rather than raw binary data directly. To store the salt and hashed password in MongoDB (or transfer via JSON), the `Buffer` objects are converted into a hexadecimal string representation (`.toString('hex')`). Hexadecimal is a compact and unambiguous way to represent binary data as text.
    *   **Performing Crypto Operations:** When you retrieve the salt or hashed password from the database (which are strings), `node:crypto` functions like `crypto.scrypt` and `crypto.timingSafeEqual` require their inputs to be `Buffer` objects. Therefore, we convert the hexadecimal strings *back* into `Buffer`s using `Buffer.from(someString, 'hex')` before passing them to the crypto functions.

3.  **Security for Comparison (`crypto.timingSafeEqual`):**
    *   This is one of the most critical reasons. When comparing the user-provided password's hash with the stored hash, directly comparing strings (`===`) can be vulnerable to [timing attacks](https://en.wikipedia.org/wiki/Timing_attack).
    *   Most string comparison algorithms stop as soon as they find a mismatch. This means that if an attacker provides many incorrect passwords, they can observe tiny differences in the time it takes for the comparison to fail. These timing differences can reveal information about the correct password, character by character.
    *   `crypto.timingSafeEqual` specifically takes two `Buffer`s and *always* takes a constant amount of time to compare them, regardless of whether they match or where mismatches occur. This eliminates the timing side-channel that attackers could exploit. It works on raw binary data (Buffers) to ensure this constant-time comparison. For this to work correctly and securely, both the stored hash and the newly computed hash *must* be converted to `Buffer`s of equal length.

In summary:
*   `Buffer` is the native way to handle raw binary data in Node.js.
*   Cryptographic functions operate on this raw binary data.
*   We convert `Buffer`s to hexadecimal strings for persistent storage (e.g., in MongoDB) and vice-versa for cryptographic computations.
*   Crucially, `Buffer`s are used with `crypto.timingSafeEqual` to prevent timing attacks when comparing sensitive values like password hashes, ensuring a constant comparison time regardless of input.
# response:

`Buffer` is a fundamental global object in Node.js. It does not need to be explicitly imported because it's part of Node.js's core environment, automatically available in all modules.

In Deno, which aims for Node.js compatibility with its `node:` specifiers, `Buffer` is also globally available when you're interacting with `node:` modules like `node:crypto`.

## Why `Buffer` is Used in `UserAuthenticationConcept`

The `Buffer` object is essential in this concept for handling raw binary data, which is crucial for cryptographic operations like password hashing and secure comparison. Here's a breakdown of its roles:

1.  **Representing Raw Binary Data:**
    *   **Salts and Hashed Passwords are Binary:** Cryptographic processes, such as generating a secure random salt (`crypto.randomBytes`) or producing a derived key (hashed password) from `crypto.scrypt`, operate on and produce raw binary data. `Buffer` is Node.js's native way to represent these sequences of bytes efficiently.
    *   The `crypto.randomBytes(SALT_LENGTH_BYTES)` function directly returns a `Buffer` because its purpose is to generate raw, unpredictable bytes.

2.  **Conversion Between Storage (Strings) and Operations (Buffers):**
    *   **Storing in Databases:** Databases (like MongoDB) and data transfer formats (like JSON) typically prefer to store text (strings) rather than raw binary data directly. To store the salt and hashed password in MongoDB, the `Buffer` objects are converted into a hexadecimal string representation using `.toString('hex')`. This is a common and efficient way to represent binary data as text.
    *   **Performing Crypto Operations:** When you retrieve the `salt` and `hashedPassword` from the database (which are stored as hexadecimal strings), `node:crypto` functions like `crypto.scrypt` and `crypto.timingSafeEqual` require their inputs to be `Buffer` objects. Therefore, the hexadecimal strings are converted *back* into `Buffer`s using `Buffer.from(someString, 'hex')` before being passed to these cryptographic functions.

3.  **Security for Password Comparison (`crypto.timingSafeEqual`):**
    *   This is arguably the most critical security reason for using `Buffer`s here. When comparing the hash of the user-provided password with the stored hash, directly comparing strings using the `===` operator can be vulnerable to [timing attacks](https://en.wikipedia.org/wiki/Timing_attack).
    *   Many string comparison algorithms (including JavaScript's `===`) stop as soon as they find a mismatch. An attacker could observe tiny differences in the time it takes for a comparison to fail. These timing differences, when accumulated over many attempts, can reveal information about the correct password, character by character.
    *   `crypto.timingSafeEqual` is specifically designed to prevent such attacks. It takes two `Buffer`s as input and *always* takes a constant amount of time to perform the comparison, regardless of whether they match or where any mismatches occur within the bytes. This eliminates the timing side-channel that attackers could exploit. For this function to work correctly and securely, both the stored hash and the newly computed hash *must* be converted to `Buffer`s of equal length.

In summary, `Buffer` is the essential data type for handling the raw binary data involved in secure password management (salting, hashing, and secure comparison) within a Node.js/Deno environment, facilitating both efficient storage and cryptographic integrity.

# Prompt: In hashPassword, using it in typescript creates an error, they are implicitely any, is there a way to fix this? 
# response:

You're absolutely right to point that out! When `noImplicitAny` is enabled in TypeScript (which is a good practice for type safety), callback parameters often get flagged as `any` if their types aren't explicitly stated or perfectly inferred.

While the built-in Deno types for `node:crypto` (or `@types/node` in a Node.js context) *should* infer `err` as `Error | null` and `derivedKey` as `Buffer`, sometimes strict configurations or specific Deno/TypeScript versions can cause this error.

The fix is to explicitly type the callback parameters in the `crypto.scrypt` function.

Here's the updated `hashPassword` method:

```typescript
// ... (rest of the class code)

export default class UserAuthenticationConcept {
  // ... (existing properties and constructor)

  /**
   * Hashes a plain-text password using the scrypt algorithm with a given salt.
   * @param {string} password The plain-text password to hash.
   * @param {string} salt The hexadecimal string representation of the salt to use.
   * @returns {Promise<string>} A promise that resolves to the hexadecimal string of the hashed password.
   * @throws {Error} If the hashing process fails.
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convert the hexadecimal salt string back into a Buffer for scrypt
      const saltBuffer = Buffer.from(salt, 'hex');
      crypto.scrypt(
        password,
        saltBuffer,
        KEY_LENGTH_BYTES,
        { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
        (err: Error | null, derivedKey: Buffer) => { // <--- Explicitly type err and derivedKey here
          if (err) {
            return reject(err); // It's good practice to `return` after reject/resolve
          }
          resolve(derivedKey.toString('hex'));
        },
      );
    });
  }

  // ... (rest of the class methods)
}
```

By adding `err: Error | null` and `derivedKey: Buffer` to the callback signature, you explicitly tell TypeScript the types of these parameters, resolving the "implicitly any" error and improving type safety.