


# Seth Chandler's Deposition Simulator v0.82

Welcome to the Deposition Simulator, a fully browser-based simulation tool designed for law students, new attorneys, or anyone interested in learning the art of witness examination. Practice your questioning skills against an AI-powered witness who has a detailed backstory, motivations, and secrets to protect.

This tool runs entirely in your web browser. No information is ever sent to a server, and your API keys are stored securely in your browser's local storage for your use only.

-----

## For Users

This section provides a complete guide for anyone who wants to use the application.

### Important Disclaimer: Not Legal Advice

This application is a simulation for educational and entertainment purposes only. The scenarios, AI responses, and coaching feedback do not constitute legal advice. Always consult with a qualified legal professional for advice on real legal matters.

-----

### Features 📜

  * **Multi-Provider Support**: Choose between leading models from OpenAI and Google.
  * **Local LLM via Ollama**: For maximum privacy and zero cost, you can run the simulator locally using your own models via Ollama.
  * **Pre-Built Scenarios**: Jump right in with detailed, ready-to-play scenarios involving complex witnesses in criminal and civil cases.
  * **Upload Your Own Cases**: Create and upload your own single-witness or multi-witness profiles as `.json` files for customized practice.
  * **Pre-Deposition Intel**: Generate summaries of the witness's public information or the overall case facts before you begin the deposition.
  * **Interactive Coach Mode**: Stuck on a line of questioning? Toggle to "Coach Mode" to get out-of-character hints, strategic advice, and analysis of the witness's potential weaknesses based on their full profile.
  * **Judicial Oversight**: Enable "Judge Mode" to have an AI judge rule on your objections, adding another layer of realism to the simulation.
  * **Real-Time Cost Tracking**: See your token usage and estimated API costs in real time, so you always know what you're spending.
  * **Save Transcripts**: Export a clean, formatted Markdown file of your entire deposition for review.

-----

### How to Use the App ⚖️

The interface is designed to be used from top to bottom.

1.  **LLM & Deposition Settings**:

      * **Provider**: Choose your preferred AI provider (OpenAI, Google Gemini, or Ollama).
      * **API Key**: Paste your personal API key into this field. This is required for OpenAI and Gemini.
      * **Model**: Select the specific model you want to use. More powerful models give higher quality responses but cost more.
      * **Judge Mode**: Check this box if you want an AI judge to be present to rule on objections like "Objection, leading."

2.  **Choose a Scenario**:

      * **Pre-Built Scenario**: Select a case from the dropdown menu to get started immediately.
      * **Upload Your Own**: Click "Choose File" to upload a custom `.json` case file from your computer.

3.  **Pre-Deposition Intel**:

      * Once a scenario is loaded, this panel will appear.
      * Use the slider to select the level of detail you want.
      * Click **"Get Witness Summary"** for a briefing on the witness's known background or **"Get Case Summary"** for an overview of the legal context. These summaries are generated based on *publicly available* information from the witness file, not their hidden secrets.

4.  **Begin Deposition**:

      * The chat window title will show the name of the witness you are deposing.
      * **Witness/Coach Toggle**: Keep this on "Witness" for normal questioning. Flip it to "Coach" *before* you send a message to ask for out-of-character help or hints.
      * Type your questions in the text box and click **"Send"** or press Enter.

-----

### API Keys and Costs

**You must use your own API key for OpenAI or Gemini.**

This tool is "client-side," meaning it runs entirely on your computer and communicates directly with the AI provider's servers. This design ensures your conversations are private. The trade-off is that you must supply your own key for authentication.

  * To get an **OpenAI** key, visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
  * To get a **Google Gemini** key, visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

You will need to create an account and set up a payment method. Most providers offer free credits to start, but sustained use will incur charges. An extensive deposition session using an efficient model like `gpt-4.1-mini` will likely cost **less than 20 cents ($0.20 USD)**. The built-in cost estimator provides a precise, real-time calculation.

-----

### Creating Custom JSON Scenario Files

You can create your own witnesses to practice for specific cases. The process involves creating a JSON file, encoding it, and uploading it.

#### 1\. Generate the Witness JSON

The easiest way to create a valid witness file is to use a powerful LLM (like GPT-4, Claude 3, or Gemini Advanced). You can provide it with raw documents, links, or a simple sketch and ask it to generate the JSON for you.

**Prompt to Generate Witness JSON:**

Copy and paste the following prompt into your preferred LLM, adding your case details at the end.

> I need you to create a detailed witness JSON file for a legal case. Please follow this exact structure and include ALL required elements. If creating multiple witnesses, put each complete witness object into a JSON array `[ { ...witness1... }, { ...witness2... } ]`.
>
> **REQUIRED JSON STRUCTURE:**
>
>   * `witnessProfile`: { `witnessId`, `caseReference` }
>   * `witnessBackground`: { `personalDetails`: {`fullName`, `age`, `occupation`}, `professionalLife`, `personalLifeAndRelationships` }
>   * `witnessMotivations`: { `primaryMotivationToTestify`, `primaryMotivationToConceal`, `fears`, `strategy` }
>   * `fullWitnessInformation`: { `officialStatementSummary`, `narrativeOfEvents`, `descriptionOfPerpetrator`, `inconsistenciesAndEvasions` }
>
> **CRITICAL REQUIREMENTS:**
>
> 1.  Make the witness psychologically realistic with believable motivations and secrets.
> 2.  Include specific details about the witness's background that affect their credibility.
> 3.  Create plausible timelines and specific details.
>
> Here is my case information: [**INSERT YOUR CASE DOCUMENTS, LINKS, OR DESCRIPTION HERE**]




Use the prompt provided in the README's appendix to generate your witness JSON from your case materials.

Copy the entire raw JSON text, from the opening { or [ to the final } or ].

Paste it into a plain text editor (like Notepad on Windows or TextEdit on Mac).

Save the file directly with a .json extension (e.g., my_case.json). Do not use Base64 encoding for this method.

2. Upload the File
In the Deposition Trainer app, click the "Choose File" button under the "Upload Your Own Case File" section and select the .json file you just saved.

The app will load your custom witness, and you can begin the deposition.



## For Developers

This section provides a technical overview of the application's architecture and instructions for modifying it.

### How It Works

This is a pure, client-side application built with HTML, CSS, and vanilla JavaScript (using ES6 Modules). It requires no build step and can be run by simply opening the `index.html` file in a browser or hosting it on a static site host like GitHub Pages.

  * **State Management**: A global state object is managed in `state.js`. State is read with `getState()` and updated with `setState()`. This provides a single source of truth for the application.
  * **API Interaction**: All calls to external LLM APIs are handled in `api.js`. This module abstracts the differences between providers so that the main application logic doesn't need to worry about specific API formats.
  * **UI Rendering**: All DOM manipulation is handled in `ui.js`. This module is responsible for rendering chat messages, updating dropdowns, and managing the visibility of UI elements based on the current application state.

### Code Structure

The project is organized into logical modules to promote separation of concerns and maintainability.

| File             | Purpose                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`     | The main HTML structure of the application. Contains all the UI elements.                                                             |
| `style.css`      | Contains all the visual styling for the application.                                                                                  |
| `main.js`        | The main entry point and "conductor" of the application. Initializes the app and contains all event listeners (e.g., button clicks). |
| `api.js`         | Handles all `fetch` requests to external LLM providers (OpenAI, Gemini, Ollama).                                                      |
| `config.js`      | A centralized configuration file for storing provider details, model names, pricing, and DOM element IDs.                             |
| `state.js`       | Manages the application's state object. Provides `getState()` and `setState()` functions.                                             |
| `ui.js`          | Manages all direct manipulation of the DOM. Renders chat messages, populates select menus, and updates UI based on state.           |
| `scenarios.js`   | Stores the Base64-encoded strings for the pre-built scenarios.                                                                        |
| `promptBuilder.js` | (Currently inside `main.js`) Contains the logic for constructing the detailed system prompts sent to the LLMs.                          |

### Modifying the App

#### Adding a New LLM Model

To add a new model (e.g., a new OpenAI model):

1.  Open **`config.js`**.
2.  Navigate to the `PROVIDERS_CONFIG` object and find the provider you want to modify (e.g., `openai`).
3.  Add a new object to the `models` array with the `name` and `pricing` information.

Example:

```javascript
openai: {
    //...
    models: [
        { name: "gpt-4.1-mini", pricing: { ... } },
        //...
        { name: "new-model-name", pricing: { inputPerMillionTokens: 1.00, outputPerMillionTokens: 3.00 } }
    ],
    //...
},
```

#### Adding a New Pre-Built Scenario

This is a two-step process:

1.  **Update `scenarios.js`**: Base64 encode your new scenario's JSON and add the resulting string to the end of the `PRE_BUILT_SCENARIOS` array.
2.  **Update `index.html`**: Find the `<select id="scenarioSelector">` element. Add a new `<option>` tag for your scenario. The `value` of the option *must* match the array index of the scenario you just added (e.g., if it's the 4th item in the array, its value should be `3`).

### Ollama Integration Guide 🦙

The app is designed to work seamlessly with a local Ollama instance for private, free depositions.

1.  **Prerequisites**: You must have [Ollama installed](https://ollama.com/) on your machine and running.
2.  **Pull a Model**: You must pull the model you want to use via the command line (e.g., `ollama pull llama3`).
3.  **Connection**: The app connects to the Ollama API endpoint at `http://localhost:11434`. You may need to configure CORS if you are running Ollama in a custom environment. For standard installations, this should work out of the box. The "Test Connection" button in the UI will verify connectivity.
4.  **Add a Model to the UI**: To make a new Ollama model selectable in the UI, simply add its name to the `models` array under the `ollama` section in **`config.js`**. The name must match the model tag used by Ollama.

Example:

```javascript
ollama: {
    //...
    models: [
        { name: "llama3:latest", pricing: { ... } },
        //...
        { name: "mistral-nemo:latest", pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } }
    ],
    //...
},
```
