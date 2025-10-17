# Application Changes and Interesting Moments:

## Application Changes:
For the most part, my application remains unchanged as each of the main functions was able to be implemented. The only major change is that user Authentication takes into consideration more of the actual security techniques into account.

## Notable Moments:

1. [Context continously wanted to put deno.beforeEach in the test suite for UserAuthentication](\context\design\concepts\UserAuthenticator\testing.md\20251016_215342.8630ccf9.md)

2. [In the test suite for BrontoCalendar, some test cases fail](./src/concepts/BrontoCalendar/BrontoCalendarTestOutput.md). However, if we look at the [test suite](./src/concepts/BrontoCalendar/BrontoCalendarConcept.test.ts) itself, these test cases reflect whether the object needed to be returned exists. Althought they fail, the rest of the test cases pass, signifying that these objects do exists, but these test need to be refactored to pass. Running out of time to refactor them.

3. Similarly, in the [final implementation for BrontoCalendar](./src/concepts/BrontoCalendar/BrontoCalendarConcept.ts), producer functions for Assignment and Office hours are present. When creating the test suite, I began to wonder how I would implement those, but the LLM thought of this and had implemented the basics for these structures in order for the test suite to be run independently of BrontoBoard which is meant to hold the basic functions for Assignments and Office Hours.