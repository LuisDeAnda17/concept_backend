[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: UserAuthenticationConcept
# response:

Here's the test file for the `UserAuthenticationConcept`, including detailed test steps and a trace that demonstrates how the concept's principle is fulfilled.

***

# Test implementation

## file: src/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthenticationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    // --- Test Cases for Register Action ---

    await t.step("should register a new user successfully", async () => {
      const username = "testuser_reg_1";
      const password = "securepassword123";

      // Action: register
      const result = await concept.register({ username, password });

      // Assertion: User ID returned, and user created in DB
      assertExists((result as { user: ID }).user, "User ID should be returned on successful registration");
      const userId = (result as { user: ID }).user;

      const userDoc = await concept.users.findOne({ _id: userId });
      assertExists(userDoc, "User should be found in the database");
      assertEquals(userDoc?.username, username, "Username should match");
      assertExists(userDoc?.hashedPassword, "Hashed password should exist");
      assertExists(userDoc?.salt, "Salt should exist");
      assertNotEquals(userDoc?.hashedPassword, password, "Password should be hashed, not stored in plain text");
    });

    await t.step("should return an error if username is already taken during registration", async () => {
      const username = "existinguser_reg_error";
      const password = "password1";
      await concept.register({ username, password }); // Pre-condition: Register user once

      // Action: register with same username
      const result = await concept.register({ username, password: "password2" });

      // Assertion: Error returned
      assertExists((result as { error: string }).error, "An error should be returned");
      assertEquals((result as { error: string }).error, "Username already taken.", "Error message should indicate username is taken");
    });

    // --- Test Cases for Authenticate Action ---

    await t.step("should authenticate a user with correct credentials", async () => {
      const username = "authuser_correct_1";
      const password = "correctpassword";
      const regResult = await concept.register({ username, password }); // Pre-condition: Register user
      const registeredUserId = (regResult as { user: ID }).user;

      // Action: authenticate
      const authResult = await concept.authenticate({ username, password });

      // Assertion: User ID returned, matches registered ID
      assertExists((authResult as { user: ID }).user, "User ID should be returned on successful authentication");
      assertEquals((authResult as { user: ID }).user, registeredUserId, "Authenticated user ID should match registered ID");
    });

    await t.step("should return an error for incorrect password", async () => {
      const username = "authuser_incorrect_pass_1";
      const password = "correctpassword";
      await concept.register({ username, password }); // Pre-condition: Register user

      // Action: authenticate with wrong password
      const authResult = await concept.authenticate({ username, password: "wrongpassword" });

      // Assertion: Generic error returned
      assertExists((authResult as { error: string }).error, "An error should be returned for incorrect password");
      assertEquals((authResult as { error: string }).error, "Invalid username or password.", "Error message should be generic for security");
    });

    await t.step("should return an error for non-existent username", async () => {
      const username = "nonexistentuser_1";
      const password = "anypassword";

      // Action: authenticate with non-existent username
      const authResult = await concept.authenticate({ username, password });

      // Assertion: Generic error returned
      assertExists((authResult as { error: string }).error, "An error should be returned for non-existent username");
      assertEquals((authResult as { error: string }).error, "Invalid username or password.", "Error message should be generic for security");
    });

    // --- Test Case for Principle Fulfillment ---

    await t.step("should fulfill the concept's principle: register and then authenticate successfully", async () => {
      const username = "principleuser_1";
      const password = "principlepassword123";

      // Trace Step 1: User registers
      const registerResponse = await concept.register({ username, password });
      assertExists((registerResponse as { user: ID }).user, "Registration should return a user ID as per principle");
      const registeredUserId = (registerResponse as { user: ID }).user;

      // Trace Step 2: User authenticates with same credentials
      const authenticateResponse = await concept.authenticate({ username, password });
      assertExists((authenticateResponse as { user: ID }).user, "Authentication should return a user ID as per principle");
      assertEquals((authenticateResponse as { user: ID }).user, registeredUserId, "Authenticated user ID should match registered ID");

      // Verify the user's state after successful principle trace
      const userInDb = await concept.users.findOne({ _id: registeredUserId });
      assertExists(userInDb, "User should still exist in the database after fulfilling the principle");
      assertEquals(userInDb?.username, username, "User's username should be consistent");
    });

  } finally {
    // Ensure the MongoDB client is closed after all tests complete
    await client.close();
  }
});
```

## trace:

The principle for `UserAuthentication` states: "after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user."

Here's a step-by-step trace demonstrating this principle:

1.  **Initial State:** The `UserAuthentication` concept's internal state (specifically, the `users` MongoDB collection) is empty.

2.  **Action: `register`**
    *   **Caller:** A user or client application invokes the `register` action.
    *   **Input:** `username: "Alice"`, `password: "MySecretPassword123"`
    *   **Requires (Precondition Check):** The concept checks its state to ensure that the `username: "Alice"` is not already in use. This condition is satisfied because the `users` collection is currently empty.
    *   **Effects:**
        *   A unique, cryptographically secure `salt` (e.g., `5a3b7d1e...`) is generated for this specific user.
        *   The plain-text `password` "MySecretPassword123" is securely hashed using the generated `salt` via the `scrypt` algorithm, producing a `hashedPassword` (e.g., `d2f4a1c7...`).
        *   A new `User` ID (e.g., `user:AliceID`) is generated.
        *   A new document is inserted into the `users` MongoDB collection:
            ```json
            {
              "_id": "user:AliceID",
              "username": "Alice",
              "hashedPassword": "d2f4a1c7...", // The scrypt hash
              "salt": "5a3b7d1e..."           // The salt used for this hash
            }
            ```
    *   **Returns:** `{ user: "user:AliceID" }` (the ID of the newly registered user).

3.  **Intermediate State:** The `users` collection now contains one document representing the newly registered user "Alice" with her unique ID, hashed password, and salt.

4.  **Action: `authenticate`**
    *   **Caller:** The user or client application invokes the `authenticate` action, typically during a login attempt.
    *   **Input:** `username: "Alice"`, `password: "MySecretPassword123"`
    *   **Requires (Precondition Check):** The concept searches its state for a user with `username: "Alice"`. It finds the document created in Step 2.
    *   **Effects:**
        *   The concept retrieves the stored `salt` (`5a3b7d1e...`) and `hashedPassword` (`d2f4a1c7...`) associated with "Alice".
        *   The provided `password` "MySecretPassword123" is hashed *again* using the retrieved `salt` (`5a3b7d1e...`). This process produces a new hash (e.g., `d2f4a1c7...`).
        *   The newly computed hash is then securely compared (using `crypto.timingSafeEqual` to prevent timing attacks) against the stored `hashedPassword`. In this case, they match exactly.
    *   **Returns:** `{ user: "user:AliceID" }` (the ID of the successfully authenticated user).

5.  **Final State (after principle fulfillment):** The `users` collection remains unchanged from the intermediate state. The concept has successfully processed the registration and then authenticated the user "Alice" using the same credentials, returning her consistent `User` ID, thereby fulfilling its stated principle.