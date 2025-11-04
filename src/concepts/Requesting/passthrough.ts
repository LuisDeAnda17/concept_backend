/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  // BrontoBoard calls
  "/api/BrontoBoard/getBrontoBoardIfOwned": "Added as inclusion for now to force push",// 
  "/api/BrontoBoard/getClassIfBrontoBoardOwned": "Added as inclusion for now to force push",//
  
  "/api/BrontoBoard/getBrontoBoardsForUser":"a",
  // BrontoCalendar Calls
  "/api/BrontoCalendar/normalizeDateToKey": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/createCalendar": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/createAssignment": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/assignWork": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/removeWork": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/updateAssignmentDueDate": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/deleteAssignment": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/createOfficeHours": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/assignOH": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/changeOH": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/deleteOfficeHours": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/_getCalendarForUser": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/_getAssignmentsOnDay": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/_getOfficeHoursOnDay": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/_getAssignment": "Added as inclusion for now to force push",
  "/api/BrontoCalendar/_getOfficeHours": "Added as inclusion for now to force push",
  //UserAuthentication Calls
  "/api/UserAuthentication/generateSalt": "Added as inclusion for now to force push",
  "/api/UserAuthentication/hashPassword": "Added as inclusion for now to force push",
  //Sessioning Calls
  "/api/Sessioning/create":"added for now",
  "/api/Sessioning/_getUser":"added for now",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // BrontoBoard calls
  "/api/BrontoBoard/initializeBB",
  "/api/BrontoBoard/createClass",
  "/api/BrontoBoard/addWork",
  "/api/BrontoBoard/changeWork",
  "/api/BrontoBoard/removeWork",
  "/api/BrontoBoard/addOH",
  "/api/BrontoBoard/changeOH",
  // BrontoBoard Getter Calls
  "/api/BrontoBoard/getAssignmentsForClass",
  "/api/BrontoBoard/getOfficeHoursForClass",
  "/api/BrontoBoard/getClassesForBrontoBoard",
  // "/api/BrontoBoard/getBrontoBoardsForUser",
  "/api/BrontoBoard/getBrontoBoardById",
  "/api/BrontoBoard/getClassById",
  "/api/BrontoBoard/getAssignmentById",
  "/api/BrontoBoard/getOfficeHourById",
  

  // BrontoCalendar Calls

  // UserAuthentication Calls
  "/api/UserAuthentication/register",
  "/api/UserAuthentication/authenticate",
  // Sessioning 
  
  "/api/Sessioning/delete",
];
