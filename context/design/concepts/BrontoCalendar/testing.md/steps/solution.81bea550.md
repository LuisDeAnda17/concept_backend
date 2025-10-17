---
timestamp: 'Thu Oct 16 2025 11:21:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_112123.a9147042.md]]'
content_id: 81bea5504aca6f97a0ac0f740e8bc755845b6945e43d643a4d88c601cfb8a5e5
---

# solution:

To properly fulfill the principle, a new action `updateAssignmentDueDate` is needed. This action will:

1. Verify the user's ownership of the calendar.
2. Retrieve the existing assignment to get its old `dueDate`.
3. Update the `dueDate` of the assignment in the `assignments` collection.
4. If the day part of the `dueDate` has changed, remove the assignment reference from the old calendar day and add it to the new calendar day.

I will add this `updateAssignmentDueDate` action to the `BrontoCalendarConcept` class.
