# Assignment 4c: Project Completion
## Design Summary
My idea is BrontoBoard, and the original version was meant to look similar to a board where one would have regions dedicated to a class and assignments for each class. It would focus on one board and classes for that board with assignments for each class.  
However, as I was implementing the front-end with the help of Cursor, it was formatted in a way where even after creating a board, I could still create more. And this deviation ended up becoming a feature and solving some issues that I was considering with my implementation, such as how would a user separate different classes for each semester and if I stuck with one board, then I’d have to implement some complex strategies for handling the separation. Thankfully, this deviation of idea ended up improving my original concept.  
As I developed the calendar feature of my app, I ended up not using my original BrontoCalendar function. In hindsight, it is a redundant concept as the BrontoBoard concept was already handling all of the same key features of Assignments that BrontoCalendar was doing. My frontend instead gets the assignments for a board instance using the BrontoBoard concept and organizing all the information in the frontend.   
Additionally, I ended up not creating my workexpirer. I meant to create a feature that would act as a complete assignment and that would delete the assignment for the user. However, I ended up running out of time to implement the feature as the deadline was approaching and running out of use with cursor. The workExpirer concept ended up not being crucial and easily substituteable.   
Lastly, I ended up creating a Session concept using context. It did end up being similar to the given one, but I thought it best to ask Context and see if it could deviate. This concept ended up being a lifesaver as it simplified the process of confirming the user for the action. All of my actions just needed confirmation of user, but I ended up instead directing the actions to the user of the session as this avoids issues of using these actions to access others information and gets the information of the user, helping in reducing data theft, even if minor information, and accomplishing its main directive.  

## Reflection:
This project was fun and interesting as it opened my eyes to how crucial AI will be for developing software and how software engineers can still play a role by learning how to properly use them as assistants. However, there were a few moments of frustration from both the use of the LLMs and my lack of understanding of some subjects.   
The amount of work I had to do was small. However, it was frustrating at times to use the LLMs. Context and Cursor are great tools for this web design project. That cannot be denied. However, it became frustrating to use Them. At first, just from lack of use, Context was easy to learn the basics, but it was tough at times to phrase a prompt correctly due to how even if I repeated a prompt it could generate different versions of the same code and some would work and some wouldn’t. For example, it became frustrating to create the syncs as it ended up creating various iterations of syncs that didn’t work for one reason or another and I didn’t understand how to work with the frames well enough, at the time, to be able to debug it myself. For Cursor, the main issue was just not having at all times as I could only use the free plan, preventing me from flushing out some additional features I wanted to implement.   
My main mistake was not dedicating enough time to understand Context and syncs better. I now understand how crucial prompt engineering is as a skill and how its crucial to understand what your working on with an AI assistant. I have experience with designing websites thanks to WebLab. Despite being a little rusty, I was able to use Cursor well to both implement a version of what I wanted and then I could go in and make minor adjustments to fit my vision better. In contrast, with Context and syncs, because I hadn’t grasped the concept of frames well, I spent a long time trying to use Context to develop the syncs I needed.  
Overall, I believe LLMs have a place in software development, not as full designers as it takes powerful LLM to properly implement a full website, rather as assistants to help speed up the process of design by creating skeletons or portions of what's needed and the Software Engineer can fill in the gaps to properly have the code running. This also entails that Software designers cannot be lazy or ignorant of what their implementing as they have to be ready to complete whats given and properly debug what the issue could be.

## [Video](.\assets\61040_4c.mp4)
## Backend Console Trace:
[Requesting] Received request for path: /UserAuthentication/register  
Requesting.request {  
  username: 'Jose',  
  password: 'mit',  
  path: '/UserAuthentication/register'  
} => { request: '019a5239-7562-7caa-bb32-077d936ec84e' }  
UserAuthentication.register { username: 'Jose', password: 'mit' } => { user: '019a5239-787c-7981-be83-ea849f4f72dc' }  
Sessioning.create { user: '019a5239-787c-7981-be83-ea849f4f72dc' } => { session: '019a5239-78be-7953-814e-6610dd03dcf3' }  
Requesting.respond {  
  request: '019a5239-7562-7caa-bb32-077d936ec84e',  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-78be-7953-814e-6610dd03dcf3'  
} => { request: '019a5239-7562-7caa-bb32-077d936ec84e' }  
Sessioning.create { user: '019a5239-787c-7981-be83-ea849f4f72dc' } => { session: '019a5239-7a25-77e7-9654-252563d9434c' }  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => []  
BrontoCalendar.createCalendar {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => { calendarId: '019a5239-99cb-7875-90b8-36edbda18b27' }  
[Requesting] Received request for path: /BrontoBoard/initializeBB  
Requesting.request {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  calendar: '019a5239-99cb-7875-90b8-36edbda18b27',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/initializeBB'  
} => { request: '019a5239-9af3-715e-81f8-2aa38478562b' }  
BrontoBoard.initializeBB {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
} => { brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1' }  
Requesting.respond {  
  request: '019a5239-9af3-715e-81f8-2aa38478562b',  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1'  
} => { request: '019a5239-9af3-715e-81f8-2aa38478562b' }  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
[Requesting] Received request for path: /BrontoBoard/initializeBB  
Requesting.request {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  calendar: '019a5239-99cb-7875-90b8-36edbda18b27',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/initializeBB'  
} => { request: '019a5239-b97d-7461-88f0-882926262078' }  
BrontoBoard.initializeBB {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
} => { brontoBoard: '019a5239-ba01-7393-b0c1-fd33f2931f4e' }  
Requesting.respond {  
  request: '019a5239-b97d-7461-88f0-882926262078',  
  brontoBoard: '019a5239-ba01-7393-b0c1-fd33f2931f4e'  
} => { request: '019a5239-b97d-7461-88f0-882926262078' }  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getClassesForBrontoBoard {  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => []  
[Requesting] Received request for path: /BrontoBoard/createClass  
Requesting.request {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  className: '61040 -Software Design',  
  overview: 'design ',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/createClass'  
} => { request: '019a523a-0c81-7b95-80f8-44e67dc835d7' }  
BrontoBoard.createClass {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  className: '61040 -Software Design',  
  overview: 'design '  
} => { class: '019a523a-0d42-7a66-9ac0-000dc1ccf789' }  
Requesting.respond {  
  request: '019a523a-0c81-7b95-80f8-44e67dc835d7',  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789'  
} => { request: '019a523a-0c81-7b95-80f8-44e67dc835d7' }  
[Requesting] Received request for path: /BrontoBoard/createClass  
Requesting.request {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  className: '61210',  
  overview: 'Algs',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/createClass'  
} => { request: '019a523a-2883-746d-acee-0e8dd1b9cb70' }  
BrontoBoard.createClass {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  className: '61210',  
  overview: 'Algs'  
} => { class: '019a523a-2945-76db-88b0-61f981ca365c' }  
Requesting.respond {  
  request: '019a523a-2883-746d-acee-0e8dd1b9cb70',  
  class: '019a523a-2945-76db-88b0-61f981ca365c'  
} => { request: '019a523a-2883-746d-acee-0e8dd1b9cb70' }  
[Requesting] Received request for path: /BrontoBoard/addWork  
Requesting.request {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  workName: 'Pset 1',  
  dueDate: '2025-11-12T04:59:00.000Z',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/addWork'  
} => { request: '019a523a-92c1-7697-b730-dc17ad9ab359' }  
BrontoBoard.addWork {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  workName: 'Pset 1',  
  dueDate: '2025-11-12T04:59:00.000Z'  
} => { assignment: '019a523a-93c4-7e67-b2dc-b7e6f2f91add' }  
Requesting.respond {  
  request: '019a523a-92c1-7697-b730-dc17ad9ab359',  
  assignment: '019a523a-93c4-7e67-b2dc-b7e6f2f91add'  
} => { request: '019a523a-92c1-7697-b730-dc17ad9ab359' }  
[Requesting] Received request for path: /BrontoBoard/addWork  
Requesting.request {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-2945-76db-88b0-61f981ca365c',  
  workName: 'Pset 1',  
  dueDate: '2025-11-12T04:16:00.000Z',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/addWork'  
} => { request: '019a523a-bdbc-7bc6-b67d-0b5625c3e79c' }  
BrontoBoard.addWork {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-2945-76db-88b0-61f981ca365c',  
  workName: 'Pset 1',  
  dueDate: '2025-11-12T04:16:00.000Z'  
} => { assignment: '019a523a-bebc-7c1f-bce7-13584f1a0d4e' }  
Requesting.respond {  
  request: '019a523a-bdbc-7bc6-b67d-0b5625c3e79c',  
  assignment: '019a523a-bebc-7c1f-bce7-13584f1a0d4e'    
} => { request: '019a523a-bdbc-7bc6-b67d-0b5625c3e79c' }  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getClassesForBrontoBoard {  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61040 -Software Design',  
    overview: 'design '  
  },  
  {  
    _id: '019a523a-2945-76db-88b0-61f981ca365c',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61210',  
    overview: 'Algs'  
  }  
]  
BrontoBoard.getAssignmentsForClass {  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-93c4-7e67-b2dc-b7e6f2f91add',  
    classId: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    name: 'Pset 1',  
    dueDate: 2025-11-12T04:59:00.000Z  
  }  
]  
[Requesting] Received request for path: /BrontoBoard/addWork  
Requesting.request {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  workName: 'Pset 2',  
  dueDate: '2025-11-19T04:16:00.000Z',  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/BrontoBoard/addWork'  
} => { request: '019a523b-2279-7f2e-9f48-1f996fedb1ad' }  
BrontoBoard.addWork {  
  owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  workName: 'Pset 2',  
  dueDate: '2025-11-19T04:16:00.000Z'  
} => { assignment: '019a523b-2379-798b-a901-8b48c13d0b4e' }  
Requesting.respond {  
  request: '019a523b-2279-7f2e-9f48-1f996fedb1ad',  
  assignment: '019a523b-2379-798b-a901-8b48c13d0b4e'  
} => { request: '019a523b-2279-7f2e-9f48-1f996fedb1ad' }  
BrontoBoard.getAssignmentsForClass {  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-93c4-7e67-b2dc-b7e6f2f91add',  
    classId: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    name: 'Pset 1',  
    dueDate: 2025-11-12T04:59:00.000Z  
  },  
  {  
    _id: '019a523b-2379-798b-a901-8b48c13d0b4e',  
    classId: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    name: 'Pset 2',    
    dueDate: 2025-11-19T04:16:00.000Z  
  }  
]  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getClassesForBrontoBoard {  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61040 -Software Design',  
    overview: 'design '    
  },  
  {  
    _id: '019a523a-2945-76db-88b0-61f981ca365c',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61210',  
    overview: 'Algs'  
  }  
]  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getClassesForBrontoBoard {  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61040 -Software Design',  
    overview: 'design '  
  },  
  {  
    _id: '019a523a-2945-76db-88b0-61f981ca365c',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61210',  
    overview: 'Algs'  
  }  
]  
BrontoBoard.getAssignmentsForClass {  
  class: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-93c4-7e67-b2dc-b7e6f2f91add',  
    classId: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    name: 'Pset 1',  
    dueDate: 2025-11-12T04:59:00.000Z  
  },  
  {  
    _id: '019a523b-2379-798b-a901-8b48c13d0b4e',  
    classId: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    name: 'Pset 2',  
    dueDate: 2025-11-19T04:16:00.000Z  
  }  
]  
BrontoBoard.getAssignmentsForClass {  
  class: '019a523a-2945-76db-88b0-61f981ca365c',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-bebc-7c1f-bce7-13584f1a0d4e',  
    classId: '019a523a-2945-76db-88b0-61f981ca365c',  
    name: 'Pset 1',  
    dueDate: 2025-11-12T04:16:00.000Z  
  }  
]  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
BrontoBoard.getClassesForBrontoBoard {  
  brontoBoard: '019a5239-9b74-754c-aba3-410053f060a1',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a523a-0d42-7a66-9ac0-000dc1ccf789',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61040 -Software Design',  
    overview: 'design '  
  },  
  {  
    _id: '019a523a-2945-76db-88b0-61f981ca365c',  
    brontoBoardId: '019a5239-9b74-754c-aba3-410053f060a1',  
    name: '61210',  
    overview: 'Algs'  
  }  
]  
BrontoBoard.getBrontoBoardsForUser {  
  user: '019a5239-787c-7981-be83-ea849f4f72dc',  
  session: '019a5239-7a25-77e7-9654-252563d9434c'  
} => [  
  {  
    _id: '019a5239-9b74-754c-aba3-410053f060a1',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  },  
  {  
    _id: '019a5239-ba01-7393-b0c1-fd33f2931f4e',  
    owner: '019a5239-787c-7981-be83-ea849f4f72dc',  
    calendar: '019a5239-99cb-7875-90b8-36edbda18b27'  
  }  
]  
[Requesting] Received request for path: /Sessioning/delete  
Requesting.request {  
  session: '019a5239-7a25-77e7-9654-252563d9434c',  
  path: '/Sessioning/delete'  
} => { request: '019a523b-a88e-7fe5-a204-0a8c21f48a5e' }  
Sessioning.delete { session: '019a5239-7a25-77e7-9654-252563d9434c' } => {}  
Requesting.respond {  
  request: '019a523b-a88e-7fe5-a204-0a8c21f48a5e',  
  message: 'Logged out successfully.'  
} => { request: '019a523b-a88e-7fe5-a204-0a8c21f48a5e' }  
  

# Assignment 4a: Backend Concept Coding
This page will act as a launch pad to the deliverables of the assignment.

## [Application Changes and Interesting Moments](./Application-Changes.md)
## Concepts:

### BrontoBoard:

[Concept Specification](./design/concepts/BrontoBoard/implementation.md)    

[Implementation](./src/concepts/BrontoBoard/BrontoBoardConcept.ts)    

[Test Script](./src/concepts/BrontoBoard/BrontoBoardConcept.test.ts)  

[Test Output](./src/concepts/BrontoBoard/BrontoBoardTestOutput.md)  

#### Design Changes
No Major design changes were made to BrontoBoard

### BrontoCalendar:


[Concept Specification](./design/concepts/BrontoCalendar/implementation.md)    

[Implementation](./src/concepts/BrontoCalendar/BrontoCalendarConcept.ts)    

[Test Script](./src/concepts/BrontoCalendar/BrontoCalendarConcept.test.ts)  

[Test Output](./src/concepts/BrontoCalendar/BrontoCalendarTestOutput.md)  

#### Design Changes
No Major design changes were made to BrontoCalendar

### UserAuthentication:


[Concept Specification](./design/concepts/UserAuthenticator/implementation.md)    

[Implementation](./src/concepts/UserAuthentication/UserAuthenticationConcept.ts)    

[Test Script](./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts)  

[Test Output](./src/concepts/UserAuthentication/UserAuthenticationConceptTestOutput.md)  

#### Design Changes
No Major design changes were made to User Authentication.

# Assignment 4b: Frontend UI Coding:
## Design Changes to Backend:
No major changes were done to the back end implementations of the concepts. No additional queries or actions were necessary, and all current actions and queries are in working order. The only change was parsing a date recieved to a usable Date type as its apperantly isn't the same when in a request.