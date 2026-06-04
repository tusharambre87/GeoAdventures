---
name: Animated.Text in RN 0.76 Fabric
description: Animated.Text HOC breaks isInAParentText context in Fabric (RN 0.76), causing "Text strings must be rendered within a <Text>" errors for any text children.
---

## Rule
Never use `<Animated.Text>` in React Native 0.76+ with Fabric (new architecture). It does not propagate `isInAParentText` to its children because it is a HOC wrapper, not a true native Text host component.

## Why
In RN 0.76 Fabric, React Native's reconciler checks `hostContext.isInAParentText` before creating a text instance. `Animated.Text` is `createAnimatedComponent(Text)` — a JavaScript HOC. Its children are processed before the inner `Text` native component is mounted, so `isInAParentText` is `false` when children are reconciled. Any string/number/emoji child throws: "Text strings must be rendered within a `<Text>` component."

## How to apply
Replace:
```tsx
<Animated.Text style={[styles.text, { opacity: anim }]}>{'emoji'}</Animated.Text>
```
With:
```tsx
<Animated.View style={{ opacity: anim }}>
  <Text style={styles.text}>{'emoji'}</Text>
</Animated.View>
```
Or if you need animated text color/size, use `Animated.View` as wrapper and pass the animated style to it (not to the inner `Text`).

This pattern applies to today.tsx and any other file using `Animated.Text` with text children.
