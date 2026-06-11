---
name: gpt-5-mini temperature restriction
description: gpt-5-mini rejects any temperature parameter; must be omitted entirely from API calls.
---

## Rule

Never pass `temperature` to gpt-5-mini. The model returns a 400 error:
"Unsupported value: 'temperature' does not support X with this model. Only the default (1) value is supported."

**Why:** OpenAI's gpt-5-mini (and other o-series/reasoning models) do not accept the `temperature` parameter — only the default is allowed. Passing any value, including 1.0, triggers the error.

**How to apply:**
- `travelContent.ts` uses `const MODEL = "gpt-5-mini"`. All calls using `MODEL` must omit `temperature`.
- Calls using explicit `"gpt-4o"` can keep `temperature` — that model supports it normally.
- When adding new MODEL calls in travelContent.ts, do not include `temperature`.
- If you see `BadRequestError: 400 Unsupported value: 'temperature'` in enrichment/story pack logs, grep travelContent.ts for `temperature:` lines near `model: MODEL` calls and remove them.
