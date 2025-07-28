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
- **Domain Services**: Business logic encapsulated in service layer for separation of concerns
- **API Abstraction**: Provider-agnostic API calls through `api.js`
- **UI Rendering**: All DOM manipulation isolated in `ui.js`
- **Prompt Engineering**: Dedicated module for all LLM prompt construction

### Key Files and Responsibilities

| File | Purpose |
|------|---------|
| `main.js` | Main entry point, event handlers, and application coordination (UI layer) |
| `services/depositionService.js` | Domain service encapsulating all deposition business logic |
| `services/documentService.js` | Document management, auto-detection, and context injection |
| `services/documentManifestLoader.js` | Loads JSON manifest with public/secret content separation |
| `services/perjuryService.js` | Sophisticated perjury behavior modeling and threat assessment |
| `promptBuilder.js` | Prompt engineering logic for all LLM interactions |
| `state.js` | Global state management with immutable update pattern |
| `api.js` | LLM API abstraction layer for OpenAI, Gemini, and Ollama |
| `config.js` | Configuration constants, provider settings, and DOM element IDs |
| `ui.js` | All DOM manipulation and rendering logic |
| `ui/documentUI.js` | Document dashboard and interaction management |
| `ui/documentViewer.js` | Professional full-screen document viewer with print/copy |
| `speech.js` | Speech-to-text functionality |
| `scenarios.js` | Pre-built witness scenarios (Base64 encoded JSON) |
| `scenarios/documentManifest.json` | **NEW**: JSON document library with public/secret separation |
| `scenarios/documentLibrary.js` | Legacy document compatibility layer |
| `scenarios/templates/` | Educator templates and documentation for content creation |
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
1. **Recommended**: Use multi-file upload interface (no coding required)
   - Upload witness, scenario, and documents JSON files via browser
   - System validates consistency and loads automatically
   - Supports "no documents" and "no secrets" options for flexible scenarios
   - See `EDUCATOR_GUIDE.md` for complete file format instructions
2. **Alternative**: Add to built-in scenarios (requires file system access)
   - Create files in `/data/witnesses/`, `/data/scenarios/`, `/data/documents/`
   - Add to `SCENARIO_MAPPING` in `config.js`
   - Add `<option>` to scenario selector in `index.html`

**Adding new models:**
- Update the `models` array in the relevant provider config in `config.js`
- Include pricing information for cost calculation

**Adding new business logic:**
1. Add methods to `DepositionService` class in `services/depositionService.js`
2. Update event handlers in `main.js` to call new service methods
3. Keep UI logic separate from business logic
4. Add input validation and error handling in service layer

**Testing approach:**
- Unit test `DepositionService` methods independently
- Test event handlers by mocking service dependencies
- Service methods are pure functions - easy to test
- No DOM manipulation in business logic layer

### Domain Services Architecture
The application follows a domain services pattern for clean separation of concerns:

**Event Handlers** (`main.js`):
- Handle only UI coordination and state management
- Delegate all business logic to domain services
- Focus on user interaction flow and error handling

**Domain Service** (`services/depositionService.js`):
- `DepositionService` class encapsulates all business logic
- `sendMessage()`: Handles complete deposition Q&A workflow
- `generateWitnessSummary()`: Creates pre-deposition briefings
- `generateCaseSummary()`: Analyzes case context and legal inference
- `createUserMessage()`: Formats user input consistently
- `buildSystemPrompt()`: Delegates to appropriate prompt builders
- Pure functions with input validation and error handling
- No DOM dependencies - fully testable in isolation

**Prompt Engineering** (`promptBuilder.js`):
- `buildDepositionPrompt()`: Main witness interaction with multiple roles
- `buildOocPrompt()`: Out-of-character coaching and hints
- `buildSummaryPrompt()`: Pre-deposition intel from public information
- `buildCaseSummaryPrompt()`: Case context analysis and legal inference
- Sophisticated role-based prompts (Witness, Opposing Counsel, Judge, Coach)
- Pure functions returning formatted message objects for LLM APIs

### Document Management System
The application features a hybrid document architecture that balances educator ease-of-use with educational integrity:

**Hybrid Architecture**:
- **Public Content**: Human-readable text in JSON with natural redactions
- **Secret Data**: Base64-encoded contradictions and impeachment evidence  
- **Auto-Detection**: Documents automatically inject into conversations based on keywords/context
- **Professional Viewer**: Full-screen document display with print/copy functionality

**Content Creation Flow**:
1. Legal educators edit `/scenarios/documentManifest.json` directly
2. Use `[REDACTED]` placeholders in public content for sensitive information
3. Encode secret contradictions as Base64 JSON in `secretData` field
4. System combines content at runtime for realistic document experience

**Educational Benefits**:
- Students see professional documents with realistic redactions
- Hidden information creates impeachment opportunities
- No coding knowledge required for content creation
- Maintains educational integrity through selective information protection

### Speech Integration
- Browser speech recognition API wrapper in `speech.js`
- Real-time transcription with interim/final results
- State management for recording status
- Graceful fallback when API unavailable

### Perjury & Truthfulness System
- Sophisticated witness behavior modeling in `services/perjuryService.js`
- Dynamic threat assessment based on question content and document context
- Realistic evasion and deception patterns based on legal psychology
- Configurable perjury sensitivity settings per witness

### Benefits of Domain Services Architecture

**Separation of Concerns:**
- UI logic isolated from business logic
- Event handlers focus only on coordination
- Business rules centralized in service layer

**Testability:**
- DepositionService can be unit tested independently
- Business logic has no DOM dependencies
- Pure functions with predictable inputs/outputs

**Maintainability:**
- Change deposition rules in one centralized location
- Add new business logic without touching UI code
- Clear boundaries between different concerns

**Reusability:**
- Business logic not tied to specific UI implementation
- Service could be used in CLI, testing, or different UI contexts
- Functions follow single responsibility principle

## Important Implementation Notes

- **No external dependencies**: Pure vanilla JavaScript with ES6 modules
- **Client-side only**: No server-side components or API routes
- **Local storage**: API keys and settings persisted locally
- **Real-time cost tracking**: Token usage calculated per provider pricing
- **Multi-witness support**: Can load single witness or witness arrays from JSON
- **Hybrid document system**: Public JSON content + Base64 secrets for educational integrity
- **Document auto-detection**: Smart context injection based on conversation keywords
- **Truthfulness mechanics**: Sophisticated perjury modeling with dynamic threat assessment
- **Professional document viewing**: Full-screen modal with print/copy functionality
- **Educator-friendly content creation**: No coding required for document management
- **Domain-driven design**: Business logic separated from infrastructure concerns
- **Event-driven architecture**: Clean separation between UI events and business operations
- **Backward compatibility**: Legacy document system maintained as fallback