---
timestamp: 'Thu Oct 16 2025 11:21:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_112123.a9147042.md]]'
content_id: fdd46f51c0524a2c361242106ac71f7d7035a82f493d71808095e35accb16f3b
---

# problem:

The `BrontoCalendar` concept, as initially specified, does not explicitly include an action to *change* an assignment's due date. The provided principle: "If the assignment's due date is then changed, it will automatically move to the new day on the calendar," implies such an action or an implicit mechanism for handling date changes.

My current implementation of `assignWork` only *adds* an assignment to a day based on its `dueDate` at the time of calling. It does not re-evaluate or move assignments if their `dueDate` in the `assignments` collection changes independently. To truly fulfill the principle's "automatically move" clause, there needs to be a dedicated action for changing an assignment's `dueDate` that handles the calendar day updates.

Without this action, the principle cannot be fully demonstrated as written.
