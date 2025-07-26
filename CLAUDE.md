# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pure client-side legal deposition simulator built with vanilla JavaScript (ES6 modules), HTML, and CSS. The application allows users to practice deposition questioning against AI-powered witnesses with detailed backstories. It supports multiple LLM providers (OpenAI, Google Gemini, Ollama) and includes features like speech-to-text, real-time cost tracking, and transcript export.

## Development Commands

This project requires no build step and can be run by simply opening `index.html` in a browser or hosting it on a static file server. There are no package.json scripts, dependencies, or build tools.

**Running the application:**
- Open `index.html` directly in a web browser
- Or serve via a local HTTP server (e.g., `python -m http.server` or similar)

**No build, lint, or test commands** - this is a pure static web application.

## Architecture Overview

The application follows a modular ES6 architecture with clear separation of concerns:

### Core Architecture Pattern
- **State Management**: Centralized state in `state.js` with `getState()` and `setState()` functions
- **Event-Driven**: All user interactions handled through event listeners in `main.js`
- **API Abstraction**: Provider-agnostic API calls through `api.js`
- **UI Rendering**: All DOM manipulation isolated in `ui.js`

### Key Files and Responsibilities

| File | Purpose |
|------|---------|
| `main.js` | Main entry point, event handlers, and application initialization |
| `promptBuilder.js` | Prompt engineering logic for all LLM interactions |
| `state.js` | Global state management with immutable update pattern |
| `api.js` | LLM API abstraction layer for OpenAI, Gemini, and Ollama |
| `config.js` | Configuration constants, provider settings, and DOM element IDs |
| `ui.js` | All DOM manipulation and rendering logic |
| `speech.js` | Speech-to-text functionality |
| `scenarios.js` | Pre-built witness scenarios (Base64 encoded JSON) |
| `index.html` | Complete UI structure |
| `style.css` | All visual styling |

### State Management Pattern
- Single source of truth in `state.js`
- Immutable updates: `setState({ newProperty: value })`
- Access via `getState()` returns a copy
- Active witness retrieved via `getActiveWitness()`

### API Integration Pattern
- Provider-agnostic interface: `callLlmApi(providerId, params)`
- Each provider has its own implementation in `api.js`
- Ollama requires local server at `http://localhost:11434`
- API keys stored in localStorage with provider-specific keys

### Adding New Features

**Adding a new LLM provider:**
1. Add provider config to `PROVIDERS_CONFIG` in `config.js`
2. Implement API function in `api.js`
3. Add to `apiImplementations` object

**Adding a new scenario:**
1. Base64 encode the witness JSON
2. Add to `PRE_BUILT_SCENARIOS` array in `scenarios.js`
3. Add corresponding `<option>` to scenario selector in `index.html`

**Adding new models:**
- Update the `models` array in the relevant provider config in `config.js`
- Include pricing information for cost calculation

### Prompt Engineering Architecture
The application uses sophisticated prompt engineering with multiple roles:
- **Witness Role**: Primary character based on JSON witness profile
- **Opposing Counsel**: Protective lawyer making objections
- **Judge**: Optional role for ruling on objections
- **Coach Mode**: Out-of-character assistance for users

Prompts are built dynamically in `promptBuilder.js` with exported functions:
- `buildDepositionPrompt()`: Main witness interaction with multiple roles
- `buildOocPrompt()`: Out-of-character coaching and hints
- `buildSummaryPrompt()`: Pre-deposition intel from public information
- `buildCaseSummaryPrompt()`: Case context analysis and legal inference

All prompt functions are pure functions that take witness data and configuration parameters, returning formatted message objects for the LLM APIs.

### Speech Integration
- Browser speech recognition API wrapper in `speech.js`
- Real-time transcription with interim/final results
- State management for recording status
- Graceful fallback when API unavailable

## Important Implementation Notes

- **No external dependencies**: Pure vanilla JavaScript with ES6 modules
- **Client-side only**: No server-side components or API routes
- **Local storage**: API keys and settings persisted locally
- **Real-time cost tracking**: Token usage calculated per provider pricing
- **Multi-witness support**: Can load single witness or witness arrays from JSON
- **Truthfulness mechanics**: Witnesses can lie or be evasive based on perjury risk settings