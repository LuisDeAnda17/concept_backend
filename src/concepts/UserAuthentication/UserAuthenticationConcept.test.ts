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