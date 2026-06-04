---
name: emoji rendering fix — React Native Android
description: Raw Unicode emoji in TSX source files render as [?] tofu boxes on Android (and sometimes iOS). How to fix and the correct script to use.
---

## Rule
Never use raw Unicode emoji characters in TSX source files. Always convert to JS Unicode escape sequences.

**Why:** Two compounding causes:
1. Metro bundler can mangle raw emoji bytes in JSX text during bundling.
2. Plus Jakarta Sans (the app font) has placeholder glyphs that block the OS emoji fallback (Apple Color Emoji / Noto Color Emoji) — so even Text without explicit fontFamily can break if the font loads globally.

## Escape forms
- BMP (U+0080–U+FFFF): `\uXXXX` inline in strings, or `{'\uXXXX'}` in JSX text
- Non-BMP (U+10000+): surrogate pairs `\uD83D\uDCCD` — e.g. 📍 = `\uD83D\uDCCD`
- ZWJ sequences (👨‍👩‍👧‍👦): each code point gets its own `\uXXXX` or pair, joined with `\u200D`
- Variation selector FE0F always gets its own `\uFE0F`

## Context rules
| Context | Correct form |
|---|---|
| JSX text (between `>` and `<`) | `{'\uD83D\uDCCD'}` — wrap in JSX expression |
| Double-quoted JS string `"..."` | `"\uD83D\uDCCD"` — inline escape |
| Single-quoted JS string `'...'` | `'\uD83D\uDCCD'` — inline escape |
| Template literal `` `...` `` | `` `\uD83D\uDCCD` `` — inline escape |
| Line/block comments | leave as-is (not rendered) |

## The fix script
`/tmp/fix_emoji_v2.py` — state-machine processor that correctly distinguishes contexts.

**Single-quote apostrophe heuristic:** `'` preceded by alphanumeric/underscore = apostrophe in text (not string start). This prevents false matches on `it's`, `you're`, etc. in JSX text.

**How to apply:**
```bash
python3 /tmp/fix_emoji_v2.py   # processes all tsx/ts files in roamus-mobile
pnpm --filter @workspace/roamus-mobile run typecheck
```

## Common mistake
Using a naive global regex to wrap all emoji in `{'\uXXXX'}` BREAKS single-quoted JS strings:
`'🛒'` → `'{'\uD83D\uDECD'}'` (invalid — extra quotes and braces)
The state machine correctly converts `'🛒'` → `'\uD83D\uDECD'` (inline escape).
