---
timestamp: 'Mon Nov 03 2025 22:03:47 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_220347.c861bbf4.md]]'
content_id: 236a29f76415611a3144020210e23e03df5805492ca536a0bf803020d587db2b
---

# Implement: Create a sync for the BrontoBoard concept's getter function getAssignmentsforClass in the form of the event being called, a response if successful, and another response if an error occurs, using the Sessiong concept to confirm the user of the session is the owner. All in one file. Don't use a helper function to simplify the authorization and Do Not use an initial frame. In the where portion of the sync of the original call of the function, have its basic form be :  frames = await frames.query(Sessioning.\_getUser, { session }, { user });   return frames; Authorization for all BrontoBoard-related queries (except `_getBrontoBoardsForUser`) follows a chain: 1.  Verify session and get the associated user. 2.  Retrieve the relevant BrontoBoard, Class, Assignment, or OfficeHour document. 3.  Trace up the ownership chain (e.g., Assignment -> Class -> BrontoBoard). 4.  Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
