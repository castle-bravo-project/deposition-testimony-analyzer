# Product Roadmap: Deposition Analyzer V2

## Vision for V2

The vision for Version 2 is to evolve the **Deposition Testimony Analyzer** from a powerful single-document analysis tool into a comprehensive, collaborative legal case management platform. V2 will empower legal teams to manage entire case files, uncover deeper insights through cross-document analysis, and work together in real-time. We will move from providing tactical analysis to delivering strategic case intelligence.

---

## High-Level Roadmap

The development of V2 will be organized into four distinct, sequential phases. Each phase builds upon the last, delivering incremental value while managing technical complexity.

-   **Phase 1: The Case File Foundation** - *Introducing multi-document management and cross-analysis.*
-   **Phase 2: Deep Intelligence & Visualization** - *Unlocking new insights with semantic search and advanced data views.*
-   **Phase 3: Collaboration & The Cloud Shift** - *Enabling team-based workflows with user accounts and real-time sync.*
-   **Phase 4: Performance & Enterprise Readiness** - *Optimizing for massive-scale data and enterprise-grade security.*

---

## Detailed Feature Breakdown & Implementation Sequence

### Phase 1: The Case File Foundation

*Goal: Move from single-file analysis to a "Case"-centric model.*

1.  **Multi-Document Management**
    -   **Description:** Introduce the concept of a "Case" that can contain multiple documents (e.g., multiple depositions, exhibits, police reports). The UI will be updated to manage a list of cases, and within each case, a list of its associated documents.
    -   **Implementation:**
        -   Update the UI to feature a case-selection or dashboard landing page.
        -   Refactor client-side storage (`IndexedDB`) to support a `cases` object store, where each case has an ID, name, and an array of documents and their corresponding analysis trees.
        -   Modify the application state (`App.tsx`) to manage the "active case" context.

2.  **Cross-Document AI Analysis**
    -   **Description:** Allow the AI to analyze documents in the context of the entire case. This enables powerful new queries like, "Find all inconsistencies in Witness A's testimony compared to Witness B's testimony."
    -   **Implementation:**
        -   Create new Gemini service functions that can concatenate relevant text from multiple selected documents into a single, context-rich prompt.
        -   Design a UI for users to select two or more documents and trigger a cross-analysis.
        -   The results could be presented as a new, distinct analysis tree or be intelligently merged into existing analyses with clear cross-references.

### Phase 2: Deep Intelligence & Visualization

*Goal: Provide new ways to search, visualize, and understand case data.*

1.  **Case-Wide Semantic Search**
    -   **Description:** Go beyond simple keyword matching. Implement a semantic search feature that allows users to find concepts and ideas across all documents in a case (e.g., "Search for all statements related to the alibi").
    -   **Implementation:**
        -   Leverage the Gemini API by sending the user's natural language query along with the full text of the case file. The AI will be prompted to return the most relevant text snippets and their source locations.

2.  **Interactive Timeline View**
    -   **Description:** Introduce a new "Timeline" view alongside the Dashboard and Mind Map. This will visualize a chronological sequence of events as identified by the AI from the case documents, helping to build a clear narrative.
    -   **Implementation:**
        -   Enhance the main analysis prompt to instruct the AI to extract key events with associated dates and times in a structured format.
        -   Integrate a timeline library (e.g., `vis-timeline-react`) to render the event data interactively.

3.  **Consolidated Relationship Graph**
    -   **Description:** Create a single, interactive graph that visualizes all key individuals mentioned across all documents in a case, mapping out their relationships to each other and to key events.
    -   **Implementation:**
        -   The AI prompt will be updated to extract entities (people, organizations) and their relationships from all documents, which will then be aggregated.
        -   Use a more powerful graph library like `react-flow` to render a dynamic graph where users can click on nodes (people) and edges (relationships) to see the source text that established the connection.

### Phase 3: Collaboration & The Cloud Shift

*Goal: Transform the application into a multi-user, real-time platform. This phase represents a major architectural shift to a client-server model.*

1.  **User Accounts & Authentication**
    -   **Description:** Implement a secure user authentication system to manage access to the application.
    -   **Implementation:** Integrate a third-party authentication service like Firebase Authentication or Auth0.

2.  **Cloud Storage & Real-Time Sync**
    -   **Description:** Move case data from the browser's `IndexedDB` to a cloud database to enable access from any device and facilitate collaboration. User notes and analysis changes will sync in real-time for all team members viewing a case.
    -   **Implementation:**
        -   Migrate data storage to a service like Google's Firestore.
        -   Utilize Firestore's real-time listeners to automatically update the UI as data changes in the backend.

### Phase 4: Performance & Enterprise Readiness

*Goal: Ensure the application is fast, scalable, and secure for the most demanding use cases.*

1.  **Performance Optimization for Massive Files**
    -   **Description:** For extremely large cases (e.g., thousands of pages of documents, mind maps with thousands of nodes), the browser's rendering performance can become a bottleneck. This feature will ensure the UI remains fluid and responsive regardless of data size.
    -   **Implementation:**
        -   Integrate "windowing" or "virtualization" libraries (e.g., `TanStack Virtual`) for the Mind Map and Source Document views. This ensures that only the visible elements are rendered in the DOM.

2.  **Role-Based Access Control (RBAC)**
    -   **Description:** Allow case owners to invite team members and assign roles (e.g., Admin, Lead Attorney, Paralegal, Read-Only Viewer) with specific permissions for viewing, editing, and exporting data.
    -   **Implementation:** Build out the RBAC logic on the backend, linked to the user authentication system established in Phase 3.

3.  **Audit Logs**
    -   **Description:** Implement a secure logging system that records all key actions within a case (e.g., document upload, analysis generation, user invitation, data export) for compliance and security auditing.
    -   **Implementation:** Create a new, immutable `logs` collection in the backend database to store event data.
