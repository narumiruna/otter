# Design System: Otter Taste Standard
**Skill:** stitch-design-taste

## Implementation Stack

Use strict TypeScript and React with Vite in `apps/web`.
Use Radix Themes first, installed `radix-ui` Primitives for missing behavior, and Radix Icons for product icons.
Style with existing CSS and Tailwind v4 through `@tailwindcss/vite`.
Reuse `RadixTheme`, Radix Colors semantic tokens, Geist Variable, and existing language fallbacks.
Use TanStack Query for server state and React Hook Form where applicable.
Use CSS feedback with reduced-motion states; do not add Next.js, shadcn/ui, or an animation engine.
Keep Hono and PostgreSQL in `apps/api`, domain rules in `packages/core`, and HTTP contracts in `packages/contracts`.
Use npm workspaces, Biome, Vitest, Testing Library, and Playwright.

---

## Configuration — Set Your Style
Adjust these dials before using this design system. They control how creative, dense, and animated the output should be. Pick the level that fits your project.

| Dial | Level | Description |
|------|-------|-------------|
| **Creativity** | `8` | `1` = Ultra-minimal, Swiss, silent, monochrome. `5` = Balanced, clean but with personality. `10` = Expressive, editorial, bold typography experiments, inline images in headlines, strong asymmetry. Default: `8` |
| **Density** | `4` | `1` = Gallery-airy, massive whitespace. `5` = Balanced sections. `10` = Cockpit-dense, data-heavy. Default: `4` |
| **Variance** | `8` | `1` = Predictable, symmetric grids. `5` = Subtle offsets. `10` = Artsy chaotic, no two sections alike. Default: `8` |
| **Motion Intent** | `6` | `1` = Static, no animation noted. `5` = Subtle hover/entrance cues. `10` = Cinematic orchestration noted in every component. Default: `6` |

> **How to use:** Change the numbers above to match your project's vibe. At **Creativity 1–3**, the system produces clean, quiet, Notion-like interfaces. At **Creativity 7–10**, expect inline image typography, dramatic scale contrast, and strong editorial layouts. The rest of the rules below adapt to your chosen levels.

---

## 1. Visual Theme & Atmosphere
A restrained, gallery-airy interface with confident asymmetric layouts and restrained CSS feedback. The atmosphere is clinical yet warm — like a well-lit architecture studio where every element earns its place through function. Density is balanced (Level 4), variance runs high (Level 8) to prevent symmetrical boredom, and motion is fluid but never theatrical (Level 6). The overall impression: expensive, intentional, alive.

## 2. Color Palette & Roles

Read `apps/web/src/client/index.css` and the selected palette before implementation.
These are the base mappings in `index.css`, not the final values for every palette.
Read `apps/web/src/client/reference-theme.css` for the parchment overrides before resolving a preview.

| Role | Semantic token | Radix source |
|---|---|---|
| Canvas | `--background` | `--gray-2` |
| Surface | `--card` | `--color-panel-solid` |
| Text | `--foreground` | `--gray-12` |
| Secondary text | `--muted-foreground` | `--gray-11` |
| Border | `--border` | `--gray-6` |
| Primary action | `--primary` | `--accent-12` (light), `--accent-11` (dark) |
| Action text | `--primary-foreground` | `--gray-1` |
| Error text | `--destructive` | `--red-11` |
| Focus ring | `--ring` | `--accent-9` |

For parchment, `--primary` is `--green-11` in both appearances.
Its `--primary-foreground` is `--sand-1` in light and `--green-1` in dark.
Parchment also overrides canvas, surface, text, border, and input tokens; use the selected palette’s resolved values rather than copying the base table.
Preserve existing palette overrides and light, dark, and system preferences.
Use resolved hex values only for static design previews.
Check text and control contrast in both appearances.

## 3. Typography Rules

- **Display and body:** Installed `@fontsource-variable/geist` with existing language fallbacks.
- **Hierarchy:** Use weight, spacing, and controlled fluid scale.
- **Amounts:** Use `font-variant-numeric: tabular-nums` for stable alignment.
- **Code and technical metadata:** Use the existing system monospace stack.
- **Font loading:** Do not assume or install another font to match a reference.

## 4. Component Stylings
* **Buttons:** Use Radix Themes Button and existing primary/foreground tokens.
Keep text contrast in both appearances and provide visible keyboard focus.
* **Cards/Containers:** Use Radix Themes Card with existing `--panel-radius`, `--card`, `--border`, and `--surface-shadow` tokens.
Use dividers or space where a card does not improve grouping.
* **Inputs/Forms:** Position the label above the input and optional helper text.
Use `var(--destructive)` for error text below the input and `var(--ring)` for the focus ring with a `2px` offset.
Do not use floating labels; keep a `0.5rem` gap between label, input, and error.
* **Navigation:** Sleek, sticky. Icons scale on hover (Dock Magnification optional). No hamburger on desktop. Clean horizontal with generous spacing
* **Loaders:** Skeletal shimmer matching exact layout dimensions and rounded corners. Shifting light reflection across placeholder shapes. Never circular spinners
* **Empty States:** Composed illustration or icon composition with guidance text. Never just "No data found"
* **Error States:** Use inline, contextual text and any error underline or border in `var(--destructive)`.
Provide a clear recovery action.

## 5. Hero Section
The Hero is the first impression — it must be striking, creative, and never generic.
- **Inline Image Typography:** Embed small, contextual photos or visuals directly between words or letters in the headline. Example: "We build [photo of hands typing] digital [photo of screen] products" — images sit inline at type-height, rounded, acting as visual punctuation between words. This is the signature creative technique
- **No Overlapping Elements:** Text must never overlap images or other text. Every element has its own clear spatial zone. No z-index stacking of content layers, no absolute-positioned headlines over images. Clean separation always
- **No Filler Text:** "Scroll to explore", "Swipe down", scroll arrow icons, bouncing chevrons, and any instructional UI chrome are BANNED. The user knows how to scroll. Let the content pull them in naturally
- **Asymmetric Structure:** Centered Hero layouts are BANNED at this variance level. Use Split Screen (50/50), Left-Aligned text / Right visual, or Asymmetric Whitespace with large empty zones
- **CTA Restraint:** Maximum one primary CTA button. No secondary "Learn more" links. No redundant micro-copy below the headline

## 6. Layout Principles
- **Grid-First:** CSS Grid for all structural layouts. Never flexbox percentage math (`calc(33% - 1rem)` is BANNED)
- **No Overlapping:** Elements must never overlap each other. No absolute-positioned layers stacking content on content. Every element occupies its own grid cell or flow position. Clean, separated spatial zones
- **Feature Sections:** The "3 equal cards in a row" pattern is BANNED. Use 2-column Zig-Zag, asymmetric Bento grids (2fr 1fr 1fr), or horizontal scroll galleries
- **Containment:** All content within `max-width: 1400px`, centered. Generous horizontal padding (`1rem` mobile, `2rem` tablet, `4rem` desktop)
- **Full-Height:** Use `min-height: 100dvh` — never `height: 100vh` (iOS Safari address bar jump)
- **Bento Architecture:** For marketing feature grids, use varied cell sizes with explicit mobile collapse.
Keep informational tiles static.

## 7. Responsive Rules
Every screen must work flawlessly across all viewports. **Responsive is not optional — it is a hard requirement. Every single element must be tested at 375px, 768px, and 1440px.**
- **Mobile-First Collapse (< 768px):** All multi-column layouts collapse to a strict single column. `width: 100%`, `padding: 1rem`, `gap: 1.5rem`. No exceptions
- **No Horizontal Scroll:** Horizontal overflow on mobile is a critical failure. All elements must fit within viewport width. If any element causes horizontal scroll, the design is broken
- **Typography Scaling:** Headlines scale down gracefully via `clamp()`. Body text stays `1rem` minimum. Never shrink body below `14px`. Headlines must remain readable on 375px screens
- **Touch Targets:** All interactive elements minimum `44px` tap target. Generous spacing between clickable items. Buttons must be full-width on mobile
- **Image Behavior:** Hero and inline images scale proportionally. Inline typography images (photos between words) stack below the headline on mobile instead of inline
- **Navigation:** Desktop horizontal nav collapses to a clean mobile menu (slide-in or full-screen overlay). No tiny hamburger icons without labels
- **Cards & Grids:** Bento grids and asymmetric layouts revert to stacked single-column cards with full-width. Maintain internal padding (`1rem`)
- **Spacing Consistency:** Vertical section gaps reduce proportionally on mobile (`clamp(3rem, 8vw, 6rem)`). Never cramped, never excessively airy
- **Testing Viewports:** Designs must be verified at: `375px` (iPhone SE), `390px` (iPhone 14), `768px` (iPad), `1024px` (small laptop), `1440px` (desktop)

## 8. Motion & Interaction (Code-Phase Intent)

Stitch generates static screens.
This section specifies optional CSS feedback for implementation.

- Use short transitions for hover, focus, active, and real state changes.
- Keep expense order, balances, and settlement data stable.
- Animate transform and opacity only.
- Honor `prefers-reduced-motion` with static states.
- Use IntersectionObserver only for requested viewport effects and disconnect it in cleanup.
- Do not add Motion, Framer Motion, GSAP, or Three.js for visual polish.

## 9. Anti-Patterns (Banned)
- No emojis — anywhere in UI, code, or alt text
- Do not replace installed Geist Variable or remove language fallbacks.
- No generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`) — if serif is needed, use distinctive modern serifs only (`Fraunces`, `Instrument Serif`)
- No pure black (`#000000`) — Off-Black or Zinc-950 only
- No neon outer glows or default box-shadow glows
- No oversaturated accent colors above 80%
- No excessive gradient text on large headers
- No custom mouse cursors
- No overlapping elements — text never overlaps images or other content. Clean spatial separation always
- No 3-column equal card layouts for features
- No centered Hero sections (at this variance level)
- No filler UI text: "Scroll to explore", "Swipe down", "Discover more below", scroll arrows, bouncing chevrons — all BANNED
- No generic names: "John Doe", "Sarah Chan", "Acme", "Nexus", "SmartFlow"
- No fake round numbers: `99.99%`, `50%`, `1234567` — use organic data: `47.2%`, `+1 (312) 847-1928`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize"
- No broken Unsplash links — use `picsum.photos/seed/{id}/800/600` or SVG UI Avatars
- Do not introduce shadcn/ui; customize existing Radix components with props and semantic tokens.
- No `z-index` spam — use only for Navbar, Modal, Overlay layer contexts
- No `h-screen` — always `min-h-[100dvh]`
- No circular loading spinners — skeletal shimmer only
