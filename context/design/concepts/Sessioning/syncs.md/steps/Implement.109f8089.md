---
timestamp: 'Mon Nov 03 2025 21:07:27 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251103_210727.d627167e.md]]'
content_id: 109f80897c58db3f344428f13882ba76ec0ca37d2b41b1b0be6f715bdd72cac4
---

# Implement: Create syncs for the BrontoBoard concept's getter functions in the form of the event being called, a response if successful, and another response if an error occurs, using the Sessiong concept to confirm the user of the session is the owner. All in one file. Don't use a helper function to simplify the authorization and Do Not use an initial frame. In the where portion of the sync of the original call of the function, have its basic form be :  frames = await frames.query(Sessioning.\_getUser, { session }, { user });   return frames;
