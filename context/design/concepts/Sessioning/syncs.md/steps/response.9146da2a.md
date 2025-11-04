---
timestamp: 'Mon Nov 03 2025 20:09:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_200948.281958c0.md]]'
content_id: 9146da2ab9e23fa74e97c67768663b3f925d660062affc41ac68779388da4dfa
---

# response:

Okay, here are the synchronizations for the `BrontoBoard` concept, structured in a single `brontoboard.sync.ts` file. Each action will have three synchronizations: one to trigger the concept action from a `Requesting.request`, one to respond on success, and one to respond on error.

I'm assuming `ID` is the type for all entity identifiers (User, Calendar, BrontoBoard, Class, Assignment, OfficeHours) and that `Date` parameters (`dueDate`, `OHTime`, `newDate`) are passed as ISO-formatted strings in the `Requesting.request` body/params, which are then converted to `Date` objects when calling the concept actions.

```typescript
// file: src/syncs/brontoboard.sync.ts

// These help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose your concepts
import { Requesting, BrontoBoard } from "@concepts";
// Import ID type for consistency
import { ID } from "@utils/types.ts";

/**
 * Syncs for the BrontoBoard Concept
 *
 * This file contains synchronizations to map incoming HTTP requests (via the Requesting concept)
 * to BrontoBoard concept actions, and to send back appropriate HTTP responses
 * for both successful and erroneous outcomes.
 */

// ============================================================================
// BrontoBoard.initializeBB (user: User, calendar: Calendar): BrontoBoard
// ============================================================================

/**
 * Handles an incoming request to initialize a new BrontoBoard.
 * Maps Requesting.request -> BrontoBoard.initializeBB
 */
export const BrontoBoardInitializeRequest: Sync = ({ request, user, calendar }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/initialize", user, calendar }, { request }],
    ),
    then: actions(
        [BrontoBoard.initializeBB, { user, calendar }],
    ),
});

/**
 * Responds to a successful BrontoBoard.initializeBB action.
 * Maps Requesting.request AND BrontoBoard.initializeBB (success) -> Requesting.respond
 */
export const BrontoBoardInitializeResponse: Sync = ({ request, brontoBoard }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/initialize" }, { request }],
        [BrontoBoard.initializeBB, {}, { brontoBoard }],
    ),
    then: actions(
        [Requesting.respond, { request, brontoBoard }],
    ),
});

/**
 * Responds to a failed BrontoBoard.initializeBB action.
 * Maps Requesting.request AND BrontoBoard.initializeBB (error) -> Requesting.respond
 */
export const BrontoBoardInitializeError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/initialize" }, { request }],
        [BrontoBoard.initializeBB, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.createClass (owner: User, brontoBoard: ID, className: string, overview: string): (class: ID)
// ============================================================================

/**
 * Handles an incoming request to create a new class within a BrontoBoard.
 * Maps Requesting.request -> BrontoBoard.createClass
 */
export const BrontoBoardCreateClassRequest: Sync = (
    { request, owner, brontoBoardId, className, overview },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/create", owner, className, overview },
            { request, brontoBoard: brontoBoardId }, // brontoBoardId is extracted from path param
        ],
    ),
    then: actions(
        [
            BrontoBoard.createClass,
            { owner, brontoBoard: brontoBoardId, className, overview },
        ],
    ),
});

/**
 * Responds to a successful BrontoBoard.createClass action.
 * Maps Requesting.request AND BrontoBoard.createClass (success) -> Requesting.respond
 */
export const BrontoBoardCreateClassResponse: Sync = (
    { request, class: classId }, // 'class' is a reserved word, aliasing to 'classId'
) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/create" }, { request }],
        [BrontoBoard.createClass, {}, { class: classId }],
    ),
    then: actions(
        [Requesting.respond, { request, class: classId }],
    ),
});

/**
 * Responds to a failed BrontoBoard.createClass action.
 * Maps Requesting.request AND BrontoBoard.createClass (error) -> Requesting.respond
 */
export const BrontoBoardCreateClassError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/create" }, { request }],
        [BrontoBoard.createClass, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.addWork (owner: User, class: ID, workName: string, dueDate: Date): (assignment: ID)
// ============================================================================

/**
 * Handles an incoming request to add a new assignment to a class.
 * Maps Requesting.request -> BrontoBoard.addWork
 */
export const BrontoBoardAddWorkRequest: Sync = (
    { request, owner, brontoBoardId, classId, workName, dueDate },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/add", owner, workName, dueDate },
            { request, brontoBoard: brontoBoardId, class: classId },
        ],
    ),
    then: actions(
        [
            BrontoBoard.addWork,
            { owner, class: classId, workName, dueDate: new Date(dueDate as string) },
        ],
    ),
});

/**
 * Responds to a successful BrontoBoard.addWork action.
 * Maps Requesting.request AND BrontoBoard.addWork (success) -> Requesting.respond
 */
export const BrontoBoardAddWorkResponse: Sync = ({ request, assignment }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/add" }, { request }],
        [BrontoBoard.addWork, {}, { assignment }],
    ),
    then: actions(
        [Requesting.respond, { request, assignment }],
    ),
});

/**
 * Responds to a failed BrontoBoard.addWork action.
 * Maps Requesting.request AND BrontoBoard.addWork (error) -> Requesting.respond
 */
export const BrontoBoardAddWorkError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/add" }, { request }],
        [BrontoBoard.addWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.changeWork (owner: User, work: ID, dueDate: Date): ()
// ============================================================================

/**
 * Handles an incoming request to change an assignment's due date.
 * Maps Requesting.request -> BrontoBoard.changeWork
 */
export const BrontoBoardChangeWorkRequest: Sync = (
    { request, owner, brontoBoardId, classId, assignmentId, dueDate },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/change", owner, dueDate },
            { request, brontoBoard: brontoBoardId, class: classId, work: assignmentId },
        ],
    ),
    then: actions(
        [
            BrontoBoard.changeWork,
            { owner, work: assignmentId, dueDate: new Date(dueDate as string) },
        ],
    ),
});

/**
 * Responds to a successful BrontoBoard.changeWork action.
 * Maps Requesting.request AND BrontoBoard.changeWork (success) -> Requesting.respond
 */
export const BrontoBoardChangeWorkResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/change" }, { request }],
        [BrontoBoard.changeWork, {}, {}], // Matches an empty success return
    ),
    then: actions(
        [Requesting.respond, { request, status: "success" }],
    ),
});

/**
 * Responds to a failed BrontoBoard.changeWork action.
 * Maps Requesting.request AND BrontoBoard.changeWork (error) -> Requesting.respond
 */
export const BrontoBoardChangeWorkError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/change" }, { request }],
        [BrontoBoard.changeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.removeWork (owner: User, work: ID): ()
// ============================================================================

/**
 * Handles an incoming request to remove an assignment.
 * Maps Requesting.request -> BrontoBoard.removeWork
 */
export const BrontoBoardRemoveWorkRequest: Sync = (
    { request, owner, brontoBoardId, classId, assignmentId },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/remove", owner },
            { request, brontoBoard: brontoBoardId, class: classId, work: assignmentId },
        ],
    ),
    then: actions(
        [BrontoBoard.removeWork, { owner, work: assignmentId }],
    ),
});

/**
 * Responds to a successful BrontoBoard.removeWork action.
 * Maps Requesting.request AND BrontoBoard.removeWork (success) -> Requesting.respond
 */
export const BrontoBoardRemoveWorkResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/remove" }, { request }],
        [BrontoBoard.removeWork, {}, {}], // Matches an empty success return
    ),
    then: actions(
        [Requesting.respond, { request, status: "success" }],
    ),
});

/**
 * Responds to a failed BrontoBoard.removeWork action.
 * Maps Requesting.request AND BrontoBoard.removeWork (error) -> Requesting.respond
 */
export const BrontoBoardRemoveWorkError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/assignment/:assignmentId/remove" }, { request }],
        [BrontoBoard.removeWork, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.addOH (owner: User, class: ID, OHTime: Date, OHduration: number): (officeHours: ID)
// ============================================================================

/**
 * Handles an incoming request to add new office hours to a class.
 * Maps Requesting.request -> BrontoBoard.addOH
 */
export const BrontoBoardAddOHRequest: Sync = (
    { request, owner, brontoBoardId, classId, OHTime, OHduration },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/add", owner, OHTime, OHduration },
            { request, brontoBoard: brontoBoardId, class: classId },
        ],
    ),
    then: actions(
        [
            BrontoBoard.addOH,
            { owner, class: classId, OHTime: new Date(OHTime as string), OHduration },
        ],
    ),
});

/**
 * Responds to a successful BrontoBoard.addOH action.
 * Maps Requesting.request AND BrontoBoard.addOH (success) -> Requesting.respond
 */
export const BrontoBoardAddOHResponse: Sync = ({ request, officeHours }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/add" }, { request }],
        [BrontoBoard.addOH, {}, { officeHours }],
    ),
    then: actions(
        [Requesting.respond, { request, officeHours }],
    ),
});

/**
 * Responds to a failed BrontoBoard.addOH action.
 * Maps Requesting.request AND BrontoBoard.addOH (error) -> Requesting.respond
 */
export const BrontoBoardAddOHError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/add" }, { request }],
        [BrontoBoard.addOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});

// ============================================================================
// BrontoBoard.changeOH (owner: User, oh: ID, newDate: Date, newduration: number): ()
// ============================================================================

/**
 * Handles an incoming request to change office hours details.
 * Maps Requesting.request -> BrontoBoard.changeOH
 */
export const BrontoBoardChangeOHRequest: Sync = (
    { request, owner, brontoBoardId, classId, officeHourId, newDate, newduration },
) => ({
    when: actions(
        [
            Requesting.request,
            { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/:officeHourId/change", owner, newDate, newduration },
            { request, brontoBoard: brontoBoardId, class: classId, oh: officeHourId },
        ],
    ),
    then: actions(
        [
            BrontoBoard.changeOH,
            { owner, oh: officeHourId, newDate: new Date(newDate as string), newduration },
        ],
    ),
});

/**
 * Responds to a successful BrontoBoard.changeOH action.
 * Maps Requesting.request AND BrontoBoard.changeOH (success) -> Requesting.respond
 */
export const BrontoBoardChangeOHResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/:officeHourId/change" }, { request }],
        [BrontoBoard.changeOH, {}, {}], // Matches an empty success return
    ),
    then: actions(
        [Requesting.respond, { request, status: "success" }],
    ),
});

/**
 * Responds to a failed BrontoBoard.changeOH action.
 * Maps Requesting.request AND BrontoBoard.changeOH (error) -> Requesting.respond
 */
export const BrontoBoardChangeOHError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/brontoboard/:brontoBoardId/class/:classId/officehours/:officeHourId/change" }, { request }],
        [BrontoBoard.changeOH, {}, { error }],
    ),
    then: actions(
        [Requesting.respond, { request, error }],
    ),
});
```
