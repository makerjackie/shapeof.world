# Source and integration

User-owned ChatGPT prototype supplied for integration, retrieved 2026-09-22.
Conversation: https://chatgpt.com/c/6ab14d2b-59d8-83ec-8e16-3086fa932e5f

The attached package carries the adjacent MIT license. This is an AI prototype supplied by the project owner, not an adaptation of a third-party public repository. The conversation UI identifies GPT-6; no inference from code style is used.

Imported renderer, procedural geometry and interactions are kept in a lexical module. The React host isolates DOM/CSS in a ShadowRoot, owns animation/timer/listener/audio teardown, and integrates the site language and immersion controls. No iframe, remote model, font, image or audio dependencies are added. Upstream screenshots and QA claims are not acceptance evidence for this integration.

Original archive: `earth-and-nature-v2-source.zip`

SHA-256: `e3dcb81c6a91e31c37ef60e260ec10ddbbfa8ad547449b75e841a299d1647623`

Long-form English chapter and character copy lives in `content.en.json`; compact controls use the world-scoped experience dictionary. Both load only with this renderer. Static HTML and canvas strings use the same translation function.
