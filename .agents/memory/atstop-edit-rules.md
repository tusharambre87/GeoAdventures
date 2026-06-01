---
name: atstop edit rules
description: How to safely edit atstop.tsx and related files that contain emoji; regex pitfalls in Python-written JSX.
---

# atstop.tsx edit rules

**Rule:** NEVER use the `write` or `edit` tool directly on `atstop.tsx` (or any JSX file with emoji). Always write a Python script to `/tmp/patch_xxx.py` and execute it via bash.

**Why:** The `write` tool encodes emoji correctly but the `edit` tool can produce UnicodeEncodeError which truncates the file to 0 bytes. Writing patch scripts avoids this entirely.

**How to apply:** Any time you need to edit `app/(tabs)/atstop.tsx`, write a Python patch script that uses `str.replace()` on the raw file content, then execute it. Typecheck after every patch.

---

# Python regex pitfalls in JSX strings

**Rule:** In Python triple-quoted strings written to JSX files, `\n` is a literal newline. Never embed `\n` inside a regex character class like `/[;,\n]/` — it will split across two lines and break the TypeScript parser.

**Why:** Python string `'/[;,\n]/'` → file contains a real newline inside the regex literal → TypeScript parser error "Unterminated regular expression literal".

**How to apply:** Use `\\n` (double-backslash) in Python strings to emit a literal `\n` in the output file: `'/[;,\\n]/'` → file contains `/[;,\n]/`.

---

# keepDetailOnFocus pattern

When navigating from a tab screen to a stack sub-screen (e.g. `/atstop/need`, `/atstop/expect`), `useFocusEffect` on the tab re-fires on return and resets state. Fix:

```typescript
const keepDetailOnFocus = useRef(false);

useFocusEffect(useCallback(() => {
  if (keepDetailOnFocus.current) { keepDetailOnFocus.current = false; return; }
  // ...normal load logic
}, [deps]));

// Before every router.push to a sub-screen:
keepDetailOnFocus.current = true;
router.push(...);
```
