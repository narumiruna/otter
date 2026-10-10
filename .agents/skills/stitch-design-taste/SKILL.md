---
name: stitch-design-taste
description: Generate DESIGN.md guidance for Google Stitch concepts that fit otter’s React, Vite, and Radix interface. Define semantic colors, Geist typography, accessible components, responsive layouts, and optional CSS feedback.
---

## Otter Technology Stack

These repository-specific rules take priority over generic implementation examples below.
For image-only tasks, use them as design constraints without generating code or installing packages.
Keep the requested visual direction, but preserve existing product behavior, localization, accessibility, and theme preferences.

- **Browser app:** Use strict TypeScript and React with Vite in `apps/web`.
Do not introduce Next.js, React Server Components, `"use client"`, or native app frameworks.
- **Components:** Use `@radix-ui/themes` first and the installed `radix-ui` Primitives for behavior not covered by Themes.
Do not introduce shadcn/ui or another component system.
- **Styling:** Use existing CSS and Tailwind CSS v4 through `@tailwindcss/vite`.
Map colors through `@radix-ui/colors` and existing semantic tokens in `apps/web/src/client/index.css`.
Preserve `RadixTheme` in `apps/web/src/client/radix-theme.tsx` as the theme owner.
Treat palette examples below as visual references, not hard-coded product colors.
- **Icons and fonts:** Use `@radix-ui/react-icons` and the installed `@fontsource-variable/geist` with existing language fallbacks.
Keep Radix Icons at consistent sizes; do not force unsupported stroke-width or weight props.
Other font examples are references, not instructions to install or assume fonts.
- **State and forms:** Reuse `@tanstack/react-query` for server state and `react-hook-form` for forms where applicable.
Use React state or existing context for local UI state; do not add a state library.
- **Motion:** Prefer CSS transitions and keyframes for meaningful feedback.
Use `IntersectionObserver` only when viewport detection is needed, with effect cleanup.
Honor `prefers-reduced-motion`; do not require perpetual animation or add Motion, Framer Motion, GSAP, or Three.js for visual polish.
- **API and domain:** Keep Hono and PostgreSQL (`pg`) in `apps/api`, raw SQL migrations in `apps/api/db/migrations`, domain rules in `packages/core`, and HTTP DTOs and guards in `packages/contracts`.
Preserve `apps/* -> packages/*`; web and CLI must not import API implementation files.
- **Dependencies and checks:** Read the root and target workspace `package.json` before imports.
Use npm workspaces from the repository root; do not install packages for hypothetical needs.
Use Biome, Vitest, Testing Library, and Playwright.
Run `npm run check` for implementation changes and report unavailable checks.
Browser E2E tests require a migrated `DATABASE_URL` and installed Chromium.

# Stitch Design Taste — Semantic Design System Skill

## Overview
This skill generates `DESIGN.md` files optimized for Google Stitch screen generation. It translates the battle-tested anti-slop frontend engineering directives into Stitch's native semantic design language — descriptive, natural-language rules paired with precise values that Stitch's AI agent can interpret to produce premium, non-generic interfaces.

The generated `DESIGN.md` serves as the **single source of truth** for prompting Stitch to generate new screens that align with a curated, high-agency design language. Stitch interprets design through **"Visual Descriptions"** supported by specific color values, typography specs, and component behaviors.

## Prerequisites
- Read the bundled [Otter design template](DESIGN.md) before generating design guidance.
- Access to Google Stitch via [labs.google/stitch](https://labs.google/stitch)
- Optionally: Stitch MCP Server for programmatic integration with Cursor, Antigravity, or Gemini CLI

## The Goal
Generate a `DESIGN.md` file that encodes:
1. **Visual atmosphere** — the mood, density, and design philosophy
2. **Color calibration** — neutrals, accents, and banned patterns with hex codes
3. **Typographic architecture** — font stacks, scale hierarchy, and anti-patterns
4. **Component behaviors** — buttons, cards, inputs with interaction states
5. **Layout principles** — grid systems, spacing philosophy, responsive strategy
6. **Motion philosophy** — optional CSS feedback with reduced-motion and static states
7. **Anti-patterns** — explicit list of banned AI design clichés

## Analysis & Synthesis Instructions

### 1. Define the Atmosphere
Evaluate the target project's intent. Use evocative adjectives from the taste spectrum:
- **Density:** "Art Gallery Airy" (1–3) → "Daily App Balanced" (4–7) → "Cockpit Dense" (8–10)
- **Variance:** "Predictable Symmetric" (1–3) → "Offset Asymmetric" (4–7) → "Artsy Chaotic" (8–10)
- **Motion:** "Static Restrained" (1–3) → "Fluid CSS" (4–7) → "Cinematic Choreography" (8–10)

Default baseline: Variance 8, Motion 6, Density 4. Adapt dynamically based on user's vibe description.

### 2. Map the Color Palette
For each color provide a descriptive name, the existing semantic CSS token, its Radix Colors mapping, and its functional role.
Include resolved hex values only as previews for the chosen palette and appearance, not implementation constants.
Preserve existing palette and appearance preferences.

**Mandatory constraints:**
- Maximum 1 accent color. Saturation below 80%
- The "AI Purple/Blue Neon" aesthetic is strictly BANNED — no purple button glows, no neon gradients
- Use absolute neutral bases (Zinc/Slate) with high-contrast singular accents
- Stick to one palette for the entire output — no warm/cool gray fluctuation
- Never use pure black (`#000000`) — use Off-Black, Zinc-950, or Charcoal

### 3. Establish Typography Rules
- **Display/Headlines:** Track-tight, controlled scale. Not screaming. Hierarchy through weight and color, not just massive size
- **Body:** Relaxed leading, max 65 characters per line
- **Font Selection:** Reuse installed Geist Variable and existing language fallbacks.
- **Serif Ban:** Generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`, `Palatino`) are BANNED. If serif is needed for editorial/creative contexts, use only distinctive modern serifs: `Fraunces`, `Gambarino`, `Editorial New`, or `Instrument Serif`. Serif is always BANNED in dashboards or software UIs
- **Product Constraint:** Keep financial data and controls in Geist with tabular numerals for amounts.
Use an existing system monospace stack only for code or technical metadata.

### 4. Define the Hero Section
The Hero is the first impression and must be creative, striking, and never generic:
- **Inline Image Typography:** Embed small, contextual photos or visuals directly between words or letters in the headline. Images sit inline at type-height, rounded, acting as visual punctuation. This is the signature creative technique
- **No Overlapping:** Text must never overlap images or other text. Every element occupies its own clean spatial zone
- **No Filler Text:** "Scroll to explore", "Swipe down", scroll arrow icons, bouncing chevrons are BANNED. The content should pull users in naturally
- **Asymmetric Structure:** Centered Hero layouts BANNED when variance exceeds 4
- **CTA Restraint:** Maximum one primary CTA. No secondary "Learn more" links

### 5. Describe Component Stylings
For each component type, describe shape, color, shadow depth, and interaction behavior:
- **Buttons:** Tactile push feedback on active state. No neon outer glows. No custom mouse cursors
- **Cards:** Use ONLY when elevation communicates hierarchy. Tint shadows to background hue. For high-density layouts, replace cards with border-top dividers or negative space
- **Inputs/Forms:** Label above input, helper text optional, error text below. Standard gap spacing
- **Loading States:** Skeletal loaders matching layout dimensions — no generic circular spinners
- **Empty States:** Composed compositions indicating how to populate data
- **Error States:** Clear, inline error reporting

### 6. Define Layout Principles
- No overlapping elements — every element occupies its own clear spatial zone. No absolute-positioned content stacking
- Centered Hero sections are BANNED when variance exceeds 4 — force Split Screen, Left-Aligned, or Asymmetric Whitespace
- The generic "3 equal cards horizontally" feature row is BANNED — use 2-column Zig-Zag, asymmetric grid, or horizontal scroll
- CSS Grid over Flexbox math — never use `calc()` percentage hacks
- Contain layouts using max-width constraints (e.g., 1400px centered)
- Full-height sections must use `min-h-[100dvh]` — never `h-screen` (iOS Safari catastrophic jump)

### 7. Define Responsive Rules
Every design must work across all viewports:
- **Mobile-First Collapse (< 768px):** All multi-column layouts collapse to single column. No exceptions
- **No Horizontal Scroll:** Horizontal overflow on mobile is a critical failure
- **Typography Scaling:** Headlines scale via `clamp()`. Body text minimum `1rem`/`14px`
- **Touch Targets:** All interactive elements minimum `44px` tap target
- **Image Behavior:** Inline typography images (photos between words) stack below headline on mobile
- **Navigation:** Desktop horizontal nav collapses to clean mobile menu
- **Spacing:** Vertical section gaps reduce proportionally (`clamp(3rem, 8vw, 6rem)`)

### 8. Encode Motion Philosophy
- Use optional CSS transitions and keyframes for meaningful feedback.
- Keep expense lists, balances, and settlement suggestions still.
- Use IntersectionObserver only for requested viewport effects, with cleanup.
- Honor `prefers-reduced-motion` and keep content visible without animation.
- Animate transform and opacity only; do not add an animation engine.

### 9. List Anti-Patterns (AI Tells)
Encode these as explicit "NEVER DO" rules in the DESIGN.md:
- No emojis anywhere
- No `Inter` font
- No generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`) — distinctive modern serifs only if needed
- No pure black (`#000000`)
- No neon/outer glow shadows
- No oversaturated accents
- No excessive gradient text on large headers
- No custom mouse cursors
- No overlapping elements — clean spatial separation always
- No 3-column equal card layouts
- No generic names ("John Doe", "Acme", "Nexus")
- No fake round numbers (`99.99%`, `50%`)
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen")
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons
- No broken Unsplash links — use `picsum.photos` or SVG avatars
- No centered Hero sections (for high-variance projects)

## Output Format (DESIGN.md Structure)

```markdown
# Design System: [Project Title]

## 1. Visual Theme & Atmosphere
(Evocative description of the mood, density, variance, and motion intensity.
Example: "A restrained, gallery-airy interface with confident asymmetric layouts
and restrained CSS feedback. The atmosphere is clinical yet warm — like a
well-lit architecture studio.")

## 2. Color Palette & Roles
- **Canvas:** `--background` from `--gray-2`.
- **Surface:** `--card` from `--color-panel-solid`.
- **Text:** `--foreground` from `--gray-12`.
- **Secondary Text:** `--muted-foreground` from `--gray-11`.
- **Border:** `--border` from `--gray-6`.
- **Primary Action:** Base `--primary` is `--accent-12` in light and `--accent-11` in dark.
- **Parchment Override:** `--primary` is `--green-11`; action text is `--sand-1` in light and `--green-1` in dark.
Read `index.css` and `reference-theme.css` for all selected-palette overrides before documenting resolved color previews.

## 3. Typography Rules
- **Display:** Geist Variable with controlled scale and weight-driven hierarchy.
- **Body:** Geist Variable with existing language fallbacks and readable leading.
- **Amounts:** Tabular numerals for alignment.
- **Mono:** Existing system stack for code and technical metadata.

## 4. Component Stylings
* **Buttons:** Flat, no outer glow. Tactile -1px translate on active. Accent fill for primary, ghost/outline for secondary.
* **Cards:** Radix Themes Card with existing panel radius, surface, border, and shadow tokens.
Use dividers when a container does not improve grouping.
* **Inputs:** Label above, error below. Focus ring in accent color. No floating labels.
* **Loaders:** Skeletal shimmer matching exact layout dimensions. No circular spinners.
* **Empty States:** Composed, illustrated compositions — not just "No data" text.

## 5. Layout Principles
(Grid-first responsive architecture. Asymmetric splits for Hero sections.
Strict single-column collapse below 768px. Max-width containment.
No flexbox percentage math. Generous internal padding.)

## 6. Motion & Interaction
(Optional CSS feedback for hover, focus, active, and real state changes.
Static reduced-motion states, stable financial data, and effect cleanup.
No additional animation engine or Next.js Client Components.)

## 7. Anti-Patterns (Banned)
(Explicit list of forbidden patterns: no emojis, no Inter, no pure black,
no neon glows, no 3-column equal grids, no AI copywriting clichés,
no generic placeholder names, no broken image links.)
```

## Best Practices
- **Be Descriptive:** "Primary text: `--foreground` from `--gray-12`" rather than "dark text".
- **Be Functional:** Explain what each element is used for
- **Be Consistent:** Same terminology throughout the document
- **Be Precise:** Name existing semantic tokens and component props, with rem or pixel values where needed.
- **Be Opinionated:** This is not a neutral template — it enforces a specific, premium aesthetic

## Tips for Success
1. Start with the atmosphere — understand the vibe before detailing tokens
2. Look for patterns — identify consistent spacing, sizing, and styling
3. Think semantically — name colors by purpose, not just appearance
4. Consider hierarchy — document how visual weight communicates importance
5. Encode the bans — anti-patterns are as important as the rules themselves

## Common Pitfalls to Avoid
- Using technical jargon without translation ("rounded-xl" instead of "generously rounded corners")
- Omitting semantic token mappings or documenting preview hex values as fixed implementation colors
- Forgetting functional roles of design elements
- Being too vague in atmosphere descriptions
- Ignoring the anti-pattern list — these are what make the output premium
- Defaulting to generic "safe" designs instead of enforcing the curated aesthetic
