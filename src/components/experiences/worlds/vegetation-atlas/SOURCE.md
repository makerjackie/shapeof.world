# Source and integration

User-owned ChatGPT prototype supplied for integration, retrieved 2026-09-22.
Conversation: https://chatgpt.com/c/6ab14dde-9de4-83ec-a73d-6f26c768daf1

The attached package carries the adjacent MIT license. This is an AI prototype supplied by the project owner, not an adaptation of a third-party public repository. The conversation UI identifies GPT-6; no inference from code style is used.

Imported renderer, procedural geometry and interactions are kept in a lexical module. The React host isolates DOM/CSS in a ShadowRoot, owns animation/timer/listener/audio teardown, and integrates the site language and immersion controls. No iframe, remote model, font, image or audio dependencies are added. Upstream screenshots and QA claims are not acceptance evidence for this integration.

Original archive: `vegetation-atlas-refined-source.zip`

SHA-256: `2482370aa4166c94cf26bf4d56015c3fc9063cd8a3b1d94679989c169514d2bb`

Long-form English chapter and character copy lives in `content.en.json`; compact controls use the world-scoped experience dictionary. Both load only with this renderer. Static HTML and canvas strings use the same translation function.
