import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto"; // For hashing passwords
import { Buffer } from "node:buffer";

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
        (err: Error | null, derivedKey: Buffer) => {
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