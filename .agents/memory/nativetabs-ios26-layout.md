---
name: NativeTabs iOS 26 content area layout
description: How NativeTabs (Liquid Glass) bounds content vs ClassicTabLayout; impacts absoluteFillObject sheets
---

## Rule

On iOS 26 with Liquid Glass available, `app/(tabs)/_layout.tsx` uses `NativeTabLayout`
(via `isLiquidGlassAvailable()`), which uses `expo-router/unstable-native-tabs` `NativeTabs`.

NativeTabs natively bounds the content area **above** the tab bar.
ClassicTabLayout uses `position: "absolute"` on the tab bar, so content extends **behind** the tab bar.

**Why this matters for absolute-positioned sheets:**

| Mode | Content area bottom | bottom:0 on sheet | Extra spacer needed |
|------|--------------------|--------------------|---------------------|
| ClassicTabLayout | screen bottom (behind tab bar) | behind tab bar | TAB_BAR_H + safeInsets.bottom |
| NativeTabs (iOS 26) | top of tab bar | flush with tab bar | ~0 (just visual 8-12px) |

Using `Math.max(safeInsets.bottom, 34)` as a spacer creates a visible 34px gap on NativeTabs
because the content area is already above the tab bar.

**How to apply:**

For any sheet rendered inside a tab screen with `absoluteFillObject` + `bottom: 0`:
- Do NOT use `safeInsets.bottom` or `TAB_BAR_H` as the bottom spacer
- Use a simple fixed spacer (e.g. `height: 12`) for visual breathing room
- The NativeTabs content boundary already handles tab bar separation

**Why:**
Discovered when `StopPreviewSheet` showed a 34px white floating gap between the swap button
and the tab bar. `PreviewPanel` inside `RescueSheet` (which has richer content) masked the
same gap because the sheet was taller proportionally.
