# Requirements Document

## Introduction

Provide a RESTful HTTP API for the petpet meme generator, allowing external applications to generate petpet memes programmatically. The API supports both built-in templates and custom template JSON definitions, accepts images via URL or file upload, and returns the generated GIF/PNG binary directly.

## Glossary

- **Template**: A `data.json` file defining a petpet meme layout, including avatar slots, text overlays, frame delay, and rendering parameters
- **Avatar Slot**: Named placeholder in a template that accepts an image (FROM, TO, GROUP, BOT)
- **Text Slot**: Indexed text overlay in a template that can be overridden via API
- **Built-in Template**: Template loaded from the server's `data/` directory on startup
- **Custom Template**: Template JSON provided inline in the API request

## Requirements

### Requirement 1: Generate Meme

**User Story:** AS a developer, I want to send images and template info to an API endpoint, SO THAT I receive a generated petpet GIF/PNG in response.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/petpet/generate` request includes a valid `template` name, the system SHALL load the corresponding built-in template and generate the meme
2. WHEN a `POST /api/v1/petpet/generate` request includes a `template_json` field, the system SHALL use the provided JSON as the template definition and ignore the `template` field
3. WHEN the request includes one or more image fields (`from`, `to`, `group`, `bot`) as either URL string or file upload, the system SHALL map each image to the corresponding avatar slot in the template
4. WHEN the request includes a `text` field as a JSON object, the system SHALL override each text slot by its index key
5. WHEN generation succeeds, the system SHALL return the image directly with `Content-Type: image/gif` or `image/png` based on the output frame count
6. WHEN the template defines no avatar slots and no image fields are provided, the system SHALL still generate the meme using template defaults
7. WHEN the template field is missing and no template_json is provided, the system SHALL return a 400 error with `{"error": "Either 'template' or 'template_json' is required"}`
8. WHEN the referenced template name does not exist in built-in templates, the system SHALL return a 404 error with `{"error": "template 'xxx' not found"}`
9. WHEN image download from a provided URL fails, the system SHALL return a 400 error with an appropriate error message
10. WHEN the request includes a `delay` parameter, the system SHALL override the template's default frame delay
11. WHEN the request includes a `quality` parameter (1-20), the system SHALL use it for GIF color quantization
12. WHEN the request includes a `bg_color` parameter, the system SHALL render the background with the specified color

### Requirement 2: List Templates

**User Story:** AS a developer, I want to query available built-in templates, SO THAT I know which templates are available to use.

#### Acceptance Criteria

1. WHEN a `GET /api/v1/petpet/templates` request is received, the system SHALL return a JSON array of all loaded built-in templates
2. EACH template entry SHALL include: `id`, `type` (IMG/GIF), `alias` list, and `avatar_slots` list
3. WHEN the server has no templates loaded, the system SHALL return an empty array

### Requirement 3: Get Template Detail

**User Story:** AS a developer, I want to view a specific template's details, SO THAT I understand its avatar and text slot requirements.

#### Acceptance Criteria

1. WHEN a `GET /api/v1/petpet/templates/:name` request is received, the system SHALL return the template's metadata including `id`, `type`, `avatar_slots`, `text_slots` count, `delay`, `has_background`, and `has_text`
2. WHEN the template name does not exist, the system SHALL return a 404 error

### Requirement 4: Health Check

**User Story:** AS an operator, I want to check if the API service is running, SO THAT I can monitor service availability.

#### Acceptance Criteria

1. WHEN a `GET /api/v1/petpet/health` request is received, the system SHALL return `{"status": "ok", "templates_count": N}`
