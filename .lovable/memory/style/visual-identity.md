---
name: Visual Identity
description: Waterfalls Academy charcoal/silver/white palette, Segoe UI, glassmorphism, minimalist line icons
type: design
---
# Waterfalls Academy Scholastic Hub — Visual Identity

## Palette (HSL tokens in src/index.css)
- Background (light): soft silver canvas (220 14% 96%)
- Background (dark): Deep Charcoal #1A1A1A (0 0% 10%)
- Foreground (dark): Metallic Silver #E5E7E9 (210 7% 89%)
- Containers: Solid White #FFFFFF in light mode, elevated charcoal #212121 in dark
- Primary: academy green from logo (light: 142 64% 28%, dark: 142 50% 55%)
- Sidebar: Deep Charcoal in BOTH light and dark (always dark sidebar — glass-sidebar utility)

## Typography
Exclusive font stack: `"Segoe UI", "Segoe UI Variable", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
- Headers: font-weight 700 (bold), letter-spacing -0.01em
- Buttons / labels / UI: font-weight 600 (semibold)
- Body: font-weight 400

Both `font-sans` and `font-display` map to Segoe UI in tailwind.config.ts.

## Iconography
- 100% Lucide line icons. Always pass `strokeWidth={1.5}`.
- NO emojis anywhere in UI (replace any 🎓📚🚀 etc with Lucide equivalents).

## Glassmorphism utilities (in src/index.css)
- `.glass` — translucent card background with 18px backdrop blur and silver border
- `.glass-sidebar` — vertical charcoal gradient with 20px blur, subtle silver right-border
- `.academic-shadow` — layered subtle shadow for cards
- Apply `.glass` to dropdown menus, hero cards, status bars

## Logo
- `src/assets/waterfalls-logo.png` — green shield crest, "Above and Beyond", Est 2023
- Pair with OVI avatar in landing hero and dashboard greeting
- Sidebar header: 40x40 logo + "Waterfalls Academy" + "SCHOLASTIC HUB" eyebrow
