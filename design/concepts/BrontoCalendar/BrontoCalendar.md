    __concept:__ BrontoCalender
    __purpose:__ Associate an assignment or Exam to a day on a calendar
    __principle:__ Each assignment has one associated day.
    __state:__
            - a set of Assignments with
            - a classId ID
            - a name string
            - a dueDate Date
        - a set of Office Hours with
            - a classId ID
            - a startTime Date
            - a duration number
    >    - a set of Calendars with
            - an owner User
            - a set of Days with
                - a set of Assignments
                - a set of Office Hours
    __actions:__
        -__CreateCalendar__ (user: User): Calendar
            -__requires:__ a valid user
            -__effects:__ Creates an empty Calendar for the user
        -__assignWork__ (owner: User, work: Assignemt)
            -__requires:__ The User is the owner of the Calendar with an existing assignemnt
            -__effects:__ Assigns the Assignment to the appropriate date, when its due.
        -__removeWork:__ (owner: User, work: Assignment)
            -__requires:__ The User is the owner of the Calendar and existing Assignment
            -__effects:__ Removes the Assignment from the calendar
        -__assignOH (owner: User, officeHours: OfficeHours)
            -__requires:__ The User is the owner of the Calendar  and officeHours
            -__effects:__ Assigns a oh to the appropriate day, when its happening.
        -__changeOH:__ (oh: OfficeHours, newDate: Date, newduration: Number):
            -__requires:__The User is the owner of the Calendar, and officeHours and future newDate and non-negative newduration
            -__effects:__ Modifies the oh to the new date and duration
