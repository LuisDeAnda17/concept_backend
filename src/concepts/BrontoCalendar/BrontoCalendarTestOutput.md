# BrontoCalendar 
running 1 test from ./src/concepts/BrontoCalendar/BrontoCalendarConcept.test.ts
BrontoCalendarConcept ...
  creates a calendar for a user ... __FAILED__ (64ms)  
  prevents creating a duplicate calendar for the same user ... ok (18ms)  
  creates an assignment ... __FAILED__ (35ms)  
  assigns an assignment to a user's calendar ... ok (140ms)  
  fails to assign work if calendar or assignment not found ... ok (63ms)
  removes an assignment from a user's calendar ... ok (204ms)  
  creates office hours ... __FAILED__ (33ms)  
  assigns office hours to a user's calendar ... ok (121ms)  
  changes existing office hours, moving them to a new day if date changes ... ok (301ms)  
  removes office hours entirely ... ok (203ms)  
  deletes an assignment entirely ... ok (208ms)  
  principle fulfillment trace: assignment moves on calendar when due date changes ... __FAILED__ (35ms)  
BrontoCalendarConcept ... __FAILED__ (due to 4 failed steps) (2s)  