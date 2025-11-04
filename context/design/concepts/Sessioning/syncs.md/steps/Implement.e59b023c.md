---
timestamp: 'Mon Nov 03 2025 21:13:04 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_211304.eed132f0.md]]'
content_id: e59b023c78b313e76be7ff84b3b947b4cbaeeb35024d1831ed26aee4d86ba6eb
---

# Implement: Create syncs for the BrontoBoard concept's getter functions in the form of the event being called, a response if successful, and another response if an error occurs, using the Sessiong concept to confirm the user of the session is the owner. All in one file. Don't use a helper function to simplify the authorization and Do Not use an initial frame. In the where portion of the sync of the original call of the function, have its basic form be :  frames = await frames.query(Sessioning.\_getUser, { session }, { user });   return frames; Authorization for all BrontoBoard-related queries (except `_getBrontoBoardsForUser`) follows a chain: 1.  Verify session and get the associated user. 2.  Retrieve the relevant BrontoBoard, Class, Assignment, or OfficeHour document. 3.  Trace up the ownership chain (e.g., Assignment -> Class -> BrontoBoard). 4.  Filter to ensure the user obtained from the session is the owner of the top-level BrontoBoard.
