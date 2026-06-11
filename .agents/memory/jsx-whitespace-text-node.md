---
name: JSX whitespace text node — same-line trailing space before comment
description: Babel preserves a single space before {/* comment */} on the same line as a closing tag as a stringLiteral child, crashing RN Fabric if parent is not <Text>.
---

## The Rule
A space (` `) between a closing JSX tag and a `{/* comment */}` on the **same line** is preserved by Babel's `cleanJSXElementLiteralChild` as a `stringLiteral(' ')`. If that space is a direct child of a non-Text host component (View, ScrollView, etc.), React Native Fabric throws "Text strings must be rendered within a <Text> component."

**Why:** Babel's JSX whitespace algorithm only discards whitespace-only text nodes that span a whole line. A single-line text segment `' '` (one space) satisfies `if (trimmedLine)` (truthy string) and is emitted as a real string child.

**How to apply:**
- Never write `</SomeView> {/* label */}` — the space before `{/*` becomes a text node.
- Always either omit the trailing comment, put it on its own line, or write `</SomeView>{/* label */}` (no space).
- This was the root cause of the EN_ROUTE crash in today.tsx: `</View> {/* heroWrap */}` (line 2093) emitted a `' '` text child directly inside `<ScrollView>`, crashing on every EN_ROUTE render.
