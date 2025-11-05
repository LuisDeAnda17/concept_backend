---
timestamp: 'Tue Nov 04 2025 21:13:54 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_211354.64abb295.md]]'
content_id: e289ed35de288edad29c67d44b3a13329fafc5fe7e3d29e6d06c3af884a556db
---

# file: src/syncs/brontoboard.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { BrontoBoard, Requesting, Sessioning } from "@concepts";

// --- Initialize BrontoBoard ---

export const InitializeBBRequest: Sync = ({ request, session, user, calendar }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/initializeBB", session, calendar }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.initializeBB, { user, calendar }],
  ),
});

export const InitializeBBResponse: Sync = ({ request, brontoBoard }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/initializeBB" }, { request }],
    [BrontoBoard.initializeBB, {}, { brontoBoard }],
  ),
  then: actions(
    [Requesting.respond, { request, brontoBoard }],
  ),
});

export const InitializeBBResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/initializeBB" }, { request }],
    [BrontoBoard.initializeBB, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Create Class ---

export const CreateClassRequest: Sync = ({ request, session, user, brontoBoard, className, overview }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/createClass", session, brontoBoard, className, overview }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.createClass, { owner: user, brontoBoard, className, overview }],
  ),
});

export const CreateClassResponse: Sync = ({ request, classId }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
    [BrontoBoard.createClass, {}, { class: classId }],
  ),
  then: actions(
    [Requesting.respond, { request, class: classId }],
  ),
});

export const CreateClassResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/createClass" }, { request }],
    [BrontoBoard.createClass, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Add Work (Assignment) ---

export const AddWorkRequest: Sync = ({ request, session, user, classId, workName, dueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addWork", session, class: classId, workName, dueDate }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.addWork, { owner: user, class: classId, workName, dueDate }],
  ),
});

export const AddWorkResponse: Sync = ({ request, assignment }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
    [BrontoBoard.addWork, {}, { assignment }],
  ),
  then: actions(
    [Requesting.respond, { request, assignment }],
  ),
});

export const AddWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addWork" }, { request }],
    [BrontoBoard.addWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Change Work (Assignment) ---

export const ChangeWorkRequest: Sync = ({ request, session, user, work, dueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeWork", session, work, dueDate }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.changeWork, { owner: user, work, dueDate }],
  ),
});

export const ChangeWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
    [BrontoBoard.changeWork, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, success: true }],
  ),
});

export const ChangeWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeWork" }, { request }],
    [BrontoBoard.changeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Remove Work (Assignment) ---

export const RemoveWorkRequest: Sync = ({ request, session, user, work }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/removeWork", session, work }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.removeWork, { owner: user, work }],
  ),
});

export const RemoveWorkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
    [BrontoBoard.removeWork, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, success: true }],
  ),
});

export const RemoveWorkResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/removeWork" }, { request }],
    [BrontoBoard.removeWork, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Add Office Hours ---

export const AddOHRequest: Sync = ({ request, session, user, classId, OHTime, OHduration }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addOH", session, class: classId, OHTime, OHduration }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.addOH, { owner: user, class: classId, OHTime, OHduration }],
  ),
});

export const AddOHResponse: Sync = ({ request, officeHours }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
    [BrontoBoard.addOH, {}, { officeHours }],
  ),
  then: actions(
    [Requesting.respond, { request, officeHours }],
  ),
});

export const AddOHResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/addOH" }, { request }],
    [BrontoBoard.addOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Change Office Hours ---

export const ChangeOHRequest: Sync = ({ request, session, user, oh, newDate, newduration }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeOH", session, oh, newDate, newduration }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { session }, { user });
  },
  then: actions(
    [BrontoBoard.changeOH, { owner: user, oh, newDate, newduration }],
  ),
});

export const ChangeOHResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
    [BrontoBoard.changeOH, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, success: true }],
  ),
});

export const ChangeOHResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/BrontoBoard/changeOH" }, { request }],
    [BrontoBoard.changeOH, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
