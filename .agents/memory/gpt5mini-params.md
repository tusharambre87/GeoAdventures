---
name: gpt-5-mini unsupported params
description: gpt-5-mini rejects temperature; response_format json_object is fine without it. Also rejects legacy max_tokens — use max_completion_tokens.
---

# gpt-5-mini Unsupported Parameters

## The rules
1. Never pass `temperature` — causes `invalid_request_error`.
2. Use `max_completion_tokens` not `max_tokens`.
3. `response_format: { type: "json_object" }` is **fine** when temperature is absent.

## Why
gpt-5-mini uses a different API contract. `temperature` is rejected outright. An earlier investigation
blamed `response_format` too, but the working generatePracticalContent and facts-gathering calls
in exploreContentService.ts both use `response_format: { type: "json_object" }` with gpt-5-mini
and no temperature — they succeed. The rejection was specifically from `temperature`, not from
`response_format` alone.

## How to apply
- Remove `temperature` from any gpt-5-mini call site.
- Keep `max_completion_tokens` (confirmed working).
- Keep `response_format: { type: "json_object" }` when structured output is needed — it works.
- Only fall back to regex JSON extraction if you have a specific reason to avoid response_format.
- Affects any `openai.chat.completions.create` with `model: "gpt-5-mini"`. Check all call sites when adding params.
