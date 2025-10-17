    __concept:__ UserAuthentication
    __purpose:__ Limit access of account to known users
    __principle:__ after a user registers with a username and a password,
    they can authenticate with that same username and password
    and be treated each time as the same user
    __state:__
    >   - a set of Users with
            - a username String
            - a password String
    __actions:__
        - __register__ (username: String, password: String): (user: User)
            - requires: A username and password of which neither has been taken before
            - effects: A new User is created with the same username and password
        - __authenticate__ (username: String, password: String): (user: User)
            - requires: the username and password both correspond to the same, existing User
            - effects: The User is allowed to enter