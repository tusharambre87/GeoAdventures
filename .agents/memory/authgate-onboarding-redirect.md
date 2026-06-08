---
name: AuthGate onboarding redirect
description: AuthGate in _layout.tsx bounces authenticated users away from /onboarding/* unless onboardingInProgress is true — causes unexpected home redirects.
---

## Rule

Never navigate an already-authenticated user to a `/onboarding/*` route for a standalone task (e.g. editing travelers) without first setting `onboardingInProgress: true` in the onboarding context. The safest approach is to put the screen in a different route group entirely.

## Why

`_layout.tsx` AuthGate:
```js
} else if (token && inOnboarding && !data.onboardingInProgress) {
  router.replace("/(tabs)");   // ← sends user home
}
```
Any `/onboarding/*` route opened by an authenticated user without `onboardingInProgress: true` is immediately redirected to `/(tabs)`.

## How to apply

- For new screens that need auth but are not part of the onboarding flow, place them in `app/me/`, `app/discover/`, or another non-onboarding group — these have no auth-redirect guard.
- The `me/` group already hosts `account.tsx`, `pass.tsx`, `support.tsx`, `travel-map.tsx` and is a natural home for settings-style screens.
- If you must reuse an onboarding screen, set `onboardingInProgress: true` before navigating and reset it to `false` after the action completes (call `set({ onboardingInProgress: false })` or `completeOnboarding()`).
