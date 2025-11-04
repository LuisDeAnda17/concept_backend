---
timestamp: 'Mon Nov 03 2025 20:59:13 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_205913.20ff5568.md]]'
content_id: 2bee44ca5fa152096e33d6a8950540d0a11575ca423aa0503d1e8c91a45b110d
---

# Implement: Create syncs for the BrontoBoard concept's getter functions in the form of the event being called, a response if successful, and another response if an error occurs, using the Sessiong concept to confirm the user of the session is the owner. All in one file. Don't use a helper function to simplify the authorization. In the where portion of the sync of the original call of the function, have its basic form be :  frames = await frames.query(Sessioning.\_getUser, { session }, { user });   return frames;
