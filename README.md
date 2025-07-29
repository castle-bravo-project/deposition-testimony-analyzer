# Deposition Testimony Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Powered by Google Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-blueviolet)](https://ai.google.dev/)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?logo=react)](https://react.dev/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

The **Deposition Testimony Analyzer** is an advanced instructional and case-management tool designed for legal professionals. It leverages the power of Google's Gemini AI to transform lengthy deposition transcripts into structured, actionable intelligence. By uploading a PDF, users can generate an interactive mind map that assesses testimony veracity, identifies key claims, surfaces inconsistencies, and suggests strategic actions, streamlining case preparation and analysis.

---

## Key Features

-   **📄 PDF Upload & Parsing**: Securely parse PDF deposition transcripts directly in the browser.
-   **🤖 AI-Powered Analysis Stream**: Watch the analysis build in real-time as the AI streams its findings.
-   **🧠 Interactive Mind Map**: Visualize the entire testimony analysis in an intuitive, explorable node-based graph.
-   **🔍 Dynamic Search & Filtering**: Instantly search the entire analysis and filter nodes by veracity or legal significance.
-   **⚖️ In-Depth Node Analysis**: Each point is enriched with metadata like veracity, emotional tone, and legal indicators (Exculpatory, Inculpatory, Hearsay).
-   **🤔 AI-Powered Actions**:
    -   **Challenge Point**: Generate "devil's advocate" counter-arguments for any analysis node.
    -   **Fact Check**: Use Google Search grounding to verify claims and get sourced summaries.
-   **📈 Strategic Profiles**: Get AI-generated summaries of the deponent's profile and assumed strategies for the prosecution, defense, and the court.
-   **✍️ Automated Motion Generation**: Generate draft legal motions (e.g., *Motion to Compel*) based on the AI's findings, complete with justifications.
-   **💾 Session Persistence**: Your work is automatically saved in the browser, allowing you to pick up where you left off.
-   **📤 Rich Data Export**: Export your analysis, notes, and selected findings to verifiable JSON or a polished, portable HTML report.
-   **🎨 Light & Dark Mode**: Switch between themes for comfortable viewing in any environment.

## Technical Stack

-   **Frontend**: React, TypeScript
-   **AI**: Google Gemini API (`gemini-2.5-flash`)
-   **Styling**: Tailwind CSS
-   **PDF Processing**: PDF.js (`pdfjs-dist`)
-   **Client-Side Storage**: IndexedDB via `idb-keyval`
-   **Document Generation**: `docx` for .docx files, `Mermaid.js` for diagrams in HTML reports.

---

## 📖 User Guide: Getting Started

1.  **Upload Document**: Drag and drop a deposition PDF onto the upload area or click to browse your files.
2.  **Analyze**: Once the document is loaded, click the "Analyze Document" button.
3.  **Explore**:
    -   **Dashboard**: View high-level strategic profiles and statistical breakdowns of the testimony.
    -   **Mind Map**: Switch to the mind map tab to explore the detailed analysis tree. Click `[+]` and `[-]` icons to expand or collapse branches.
4.  **Interact with Nodes**:
    -   Click on a node's body to highlight the corresponding text in the source document viewer.
    -   Click **"Challenge Point"** to generate a counter-argument.
    -   Click **"Fact Check"** to verify a claim using Google Search.
    -   Add your private thoughts and strategies in the **"Private Notes"** text area for each node.
5.  **Generate Motions**: In the sidebar, find the "Suggested Motions" card and click "Generate & Download" to create a draft `.docx` file for review.
6.  **Export Your Work**:
    -   Use the checkboxes on each node to select the points you want to include in an export.
    -   Click "Export JSON" for a machine-readable file with cryptographic hashes for verification.
    -   Click "Export HTML" for a self-contained, professional report with a table of contents and relationship diagrams.

## ⚙️ Developer Guide: Installation & Build

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/deposition-analyzer.git
    cd deposition-analyzer
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    This project requires a Google Gemini API key.

    -   Create a file named `.env` in the root of the project.
    -   Add your API key to the file:
        ```env
        API_KEY=YOUR_GEMINI_API_KEY
        ```
    The application is configured to use this variable. In the provided development environment, this key is pre-configured and does not need to be set manually.

### Running the App

The project is set up to run directly from the source files using a modern browser that supports ES Modules and import maps. No local development server or build step is required for development. Simply open the `index.html` file in your browser.

---

## 🤖 Special Guide: Prompt & Agent Engineering

The core intelligence of this application resides in `services/geminiService.ts`. The prompts are engineered to ensure consistent, structured, and high-quality output from the Gemini model.

### 1. Main Analysis Prompt (`analyzeTestimonyStream`)

This is the most complex prompt, designed to generate the entire mind map in a single, streaming call.

-   **Agent Persona**: The AI is instructed to act as an "AI legal analyst" powering a mind map tool. This sets the context and professional tone.
-   **Output Constraint (CRITICAL)**: The prompt strictly enforces a **raw newline-delimited JSON (NDJSON)** stream. This is non-negotiable for the front-end to work correctly, as it allows the app to parse and render one node at a time, creating the "live-building" effect. Any deviation (like wrapping in `[]` or using markdown fences) would break the parser.
-   **Schema Enforcement**: The prompt defines the exact JSON structure for each node (`id`, `parentId`, `title`, etc.), ensuring the data is predictable.
-   **Analysis Structure**: The prompt mandates a specific order for the main categories (Profiles, Key Claims, Inconsistencies, etc.). This creates a consistent and logical layout for every analysis.
-   **Contextual Linking**: A key innovation is the requirement for a `sourceNodeId` on "Suggested Motion" nodes. The prompt instructs the AI to link a motion back to the specific claim or inconsistency that justifies it. This allows the front-end to retrieve context (like counter-arguments or fact-checks) when generating the motion document.

### 2. Contextual Action Prompts

These are shorter prompts for specific, user-initiated actions.

-   **Counter-Arguments (`getAlternativePerspective`)**:
    -   **Persona**: "Expert debater and critical thinker."
    -   **Goal**: Act as a "devil's advocate" to challenge a specific point.
    -   **Technique**: Uses a higher `temperature` (0.7) to encourage more creative and diverse counter-arguments.
-   **Fact-Checking (`factCheckClaim`)**:
    -   **Persona**: "Neutral fact-checker."
    -   **Tooling**: This is a key example of function calling. The prompt config includes `tools: [{googleSearch: {}}]`, which gives the model access to Google Search.
    -   **Grounding**: The prompt instructs the model to base its summary *only* on the search results. The front-end then extracts the summary and the source URLs from the `groundingMetadata` in the response.
-   **Motion Generation (`generateMotionDocument`)**:
    -   **Persona**: "Expert legal assistant AI."
    -   **Synthesis**: This prompt's primary job is to **synthesize** multiple pieces of information: the base motion type, the justification, and the optional context from user-generated counter-arguments and fact-checks. It is explicitly told *not* to just list the context but to logically integrate it into the formal argument.

### Modifying and Extending the AI

-   **Adding a New Category**: To add a new top-level category to the mind map, you must:
    1.  Add the new category name to the ordered list in the main analysis prompt in `geminiService.ts`.
    2.  Update the `summarizeAnalysisTree` function in `App.tsx` to recognize this new category and its children if you want its data to appear on the Dashboard.
-   **Changing Node Structure**: If you add a new field to the node JSON structure in the prompt, you must also update the TypeScript types in `types.ts` to reflect the change.

## 🧑‍💼 Admin Guide

This application is a fully client-side tool. There is no backend server to manage, and no user data is ever sent to a third-party server (aside from the anonymized testimony text sent to the Gemini API for analysis).

-   **Data Storage**: All session data, including the analysis tree and user notes, is stored locally in the browser's **IndexedDB**.
-   **Data Privacy**: Clearing the browser's site data will permanently delete all stored analysis sessions.
-   **No Administration Required**: The application requires zero server-side maintenance or administration.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
