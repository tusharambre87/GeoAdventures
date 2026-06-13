---
name: gpt-image-1 via Replit AI proxy
description: Image generation model to use; dall-e-3 is blocked; response shape is base64 not URL
---

## Rule
Use `gpt-image-1` (not `dall-e-3`) for image generation via the Replit AI Integrations proxy.

**Why:** `dall-e-3` returns `UNSUPPORTED_MODEL` (400) from the proxy. `gpt-image-1` works and produces high-quality output.

## How to apply
- Model param: `model: "gpt-image-1"`
- Quality values: `"low"` | `"medium"` | `"high"` (not `"standard"` or `"hd"`)
- Response shape: returns `b64_json`, NOT a URL. Read the image as `(result.data[0] as any).b64_json` — there is no `.url` field.
- Cast the generate call with `as any` since the TS types are based on dall-e shapes.

```typescript
const result = await openai.images.generate({
  model: "gpt-image-1",
  prompt,
  n: 1,
  size: "1024x1024",
  quality: "low",
} as any);
const base64 = (result.data[0] as any)?.b64_json as string | undefined;
if (!base64) throw new Error("No image data returned");
```
