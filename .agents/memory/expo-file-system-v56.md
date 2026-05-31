---
name: expo-file-system v56 legacy API
description: expo-file-system v56 changed its API; use the /legacy import for old-style cacheDirectory, writeAsStringAsync, getInfoAsync, EncodingType.Base64.
---

## Rule
Import `expo-file-system/legacy` (not `expo-file-system`) to get the classic functional API: `cacheDirectory`, `writeAsStringAsync`, `getInfoAsync`, `EncodingType`, etc.

**Why:** expo-file-system v56 overhauled its API to use class-based `File`, `Directory`, and `Paths` objects. The old functional API still exists but only via the `/legacy` subpath. Importing from the top-level `expo-file-system` will TS-error on `cacheDirectory` and all the old helpers.

**How to apply:** Any time you need to read/write files to the cache or documents directory in Expo SDK 54 projects, use:
```ts
import * as FileSystem from "expo-file-system/legacy";
```
Then `FileSystem.cacheDirectory`, `FileSystem.writeAsStringAsync`, `FileSystem.getInfoAsync` all work as expected.
