---
name: gpt-5-mini unsupported params
description: gpt-5-mini rejects temperature AND response_format:{type:"json_object"}; causes invalid_request_error silently swallowed by callers.
---

# gpt-5-mini Unsupported Parameters

## The rule
Never pass `temperature` or `response_format: { type: "json_object" }` to gpt-5-mini. Both cause `invalid_request_error` from OpenAI.

## Why
gpt-5-mini uses a different API contract from gpt-4o family. The JSON object response format and temperature params are rejected. The errors appear in deployment logs as `type: 'invalid_request_error'` from `_APIError.generate`.

## How to apply
- Remove `temperature` — confirmed earlier.
- Remove `response_format: { type: "json_object" }` — confirmed: smart-suggestions was returning empty results for kids/landmarks because gpt-5-mini threw on this param.
- Instead: instruct the model in the system prompt to "Return valid JSON only", then extract JSON from the plain-text response with `/\{[\s\S]*\}/` regex.
- `max_completion_tokens` is fine to keep.
- Affects any route using `openai.chat.completions.create` with `model: "gpt-5-mini"`. Check all such call sites when adding new params.
