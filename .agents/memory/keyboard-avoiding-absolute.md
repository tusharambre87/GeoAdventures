---
name: KeyboardAvoidingView in position:absolute sheets
description: KAV inside position:absolute bottom:0 Animated.View doesn't measure its own frame correctly; use Keyboard.addListener instead.
---

# KeyboardAvoidingView in position:absolute bottom sheets

## The rule
`KeyboardAvoidingView` with `behavior="padding"` does not work reliably when nested inside a `position: 'absolute', bottom: 0` container (like a slide-up sheet). The component measures its frame relative to the screen but the sheet's translateY animation confuses it.

## Why
KAV calculates how much to push by measuring `window.height - frame.y - frame.height`. When the sheet is `position: absolute, bottom: 0` with an Animated translateY, the frame measurement is incorrect and KAV either does nothing or pushes too much.

## How to apply
For bottom sheets with a `TextInput` that needs to avoid the keyboard:
1. Keep `KeyboardAvoidingView` in the JSX (it still helps in some cases on iOS).
2. **Also** add `Keyboard.addListener('keyboardDidShow', cb)` that calls `scrollRef.current?.scrollToEnd({ animated: true })` — this fires after keyboard animation completes.
3. Add a fast initial scroll (50–100ms timeout) for the case where keyboard is already up.
4. Clean up both in the effect's return.

```js
useEffect(() => {
  if (!addingCustom) return;
  const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  const sub = Keyboard.addListener('keyboardDidShow', () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  });
  return () => { clearTimeout(t); sub.remove(); };
}, [addingCustom]);
```
