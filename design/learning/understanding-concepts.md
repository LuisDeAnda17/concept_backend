[@concept-design-overview](../background/concept-design-overview.md)

# question: Could you explain concepts?
# response:

Based on the provided text, here's an explanation of what a "concept" is in the context of Concept Design:

A **concept** is a fundamental, reusable unit of user-facing functionality in a software application. It serves a clearly defined and intelligible purpose, addressing a specific, coherent aspect of the application's overall functionality.

Here are its key characteristics:

1.  **Reusable Unit of User-Facing Functionality:**
    *   It's designed to be reused across different applications (e.g., the `Upvote` concept for comments on a news site and answers on Stack Overflow).
    *   It can also be instantiated multiple times within the same application for different roles.
    *   It's always something a user interacts with or understands directly (e.g., `RestaurantReservation`, `Post`, `Comment`, `Upvote`).

2.  **Well-Defined and Intelligible Purpose:**
    *   Each concept is closely targeted at delivering a particular function of value.
    *   Users can easily understand its purpose due to its archetypal nature and familiarity from other contexts.

3.  **Self-Contained State:**
    *   Each concept maintains its own state, which typically involves objects of several kinds and the relationships between them (e.g., `Upvote` tracks items and users who voted).
    *   Its state is sufficiently rich to support its behavior but no richer than necessary (e.g., `Upvote` knows user ID but not user's full name).
    *   This state is usually made persistent using a database as part of a backend service implementation.

4.  **Interacts via Atomic Actions:**
    *   Concepts interact with users and other concepts through discrete, atomic actions.
    *   These actions can be performed by users (e.g., `reserve`, `cancel` for `RestaurantReservation`) or can be output actions that occur spontaneously under the concept's control.
    *   Its behavior can be viewed as an API specification by developers and as a human behavioral protocol by users.

5.  **Mutual Independence:**
    *   This is perhaps its most significant distinguishing feature. Each concept is defined without reference to any other concepts and can be understood in isolation.
    *   This independence allows for easier understanding, scaling of design efforts (different teams working on different concepts), and true reuse (a concept doesn't bring along hidden dependencies).
    *   Polymorphism is key here, meaning a concept's design avoids assumptions about the content/interpretation of objects passed as arguments.

6.  **Completeness of Functionality:**
    *   A concept is *complete* with respect to its own functionality and does not rely on calling functionality directly from other concepts. If a `Notification` concept needs to send an email, the emailing functionality is *part of* the `Notification` concept itself, not delegated to a separate "Emailing" concept.

7.  **Strong Separation of Concerns:**
    *   Concepts ensure that each unit addresses only a single, coherent aspect of functionality, avoiding the conflation of concerns common in traditional designs (e.g., separating user authentication, profiles, and notification preferences into distinct concepts instead of lumping them into a single `User` class).

**In summary:** A concept in Concept Design is a highly modular, self-contained, reusable, and independently understandable piece of user-facing functionality that manages its own state and behavior through atomic actions. It promotes cleaner design, greater reusability, and clearer focus on the value delivered to the user.