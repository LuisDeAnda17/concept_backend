import { actions, Sync} from "@engine";
import { Requesting, UserAuthentication, Sessioning } from "@concepts";

// --- Register Flow ---

// 1. Trigger UserAuthentication.register from a /register request
export const RegisterRequestTrigger: Sync = ({ request, username, password }) => ({
  when: actions(
    [Requesting.request, { path: "/register", username, password }, { request }],
  ),
  then: actions(
    [UserAuthentication.register, { username, password }],
  ),
});

// 2. Handle successful registration: create a session and respond
export const RegisterSuccessResponse: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/register" }, { request }],
    [UserAuthentication.register, {}, { user }], // Matches successful registration
  ),
  then: actions(
    [Sessioning.create, { user }, { session }], // Create a new session for the registered user
    [Requesting.respond, { request, user, session }], // Respond with user ID and new session ID
  ),
});

// 3. Handle registration error: respond with the error
export const RegisterErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/register" }, { request }],
    [UserAuthentication.register, {}, { error }], // Matches failed registration
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Authenticate Flow ---

// 4. Trigger UserAuthentication.authenticate from a /authenticate request
export const AuthenticateRequestTrigger: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate", username, password }, { request }],
  ),
  then: actions(
    [UserAuthentication.authenticate, { username, password }],
  ),
});

// 5. Handle successful authentication: create a session and respond
export const AuthenticateSuccessResponse: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { user }], // Matches successful authentication
  ),
  then: actions(
    [Sessioning.create, { user }, { session }], // Create a new session for the authenticated user
  ),
});

export const AuthenticateSuccessResponse2: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { user }], // Matches successful authentication
    [Sessioning.create, { user }, { session }], // Create a new session for the authenticated user
  ),
  then: actions(
    [Requesting.respond, { request, user, session }], // Respond with user ID and new session ID
  ),
});

// 6. Handle authentication error: respond with the error
export const AuthenticateErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { error }], // Matches failed authentication
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Logout Flow ---

// 7. Trigger Sessioning.delete from a /logout request
export const LogoutRequestTrigger: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/logout", session }, { request }],
  ),
  then: actions(
    [Sessioning.delete, { session }],
  ),
});

// 8. Handle successful logout: respond with success message
export const LogoutSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.delete, {}, {}], // Matches successful session deletion (empty object means no error was returned)
  ),
  then: actions(
    [Requesting.respond, { request, message: "Logged out successfully." }],
  ),
});

// 9. Handle logout error: respond with the error (e.g., session not found)
export const LogoutErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.delete, {}, { error }], // Matches failed session deletion
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});