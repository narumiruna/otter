---
name: minimalist-ui
description: Clean editorial-style interfaces. Warm monochrome palette, typographic contrast, flat bento grids, muted pastels. No gradients, no heavy shadows.
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

# Protocol: Premium Utilitarian Minimalism UI Architect

## 1. Protocol Overview
Name: Premium Utilitarian Minimalism & Editorial UI
Description: Design refined, minimal, document-style interfaces with clear typography, generous space, flat components, and restrained accents.
Apply this direction through otter’s selected Radix palette and appearance rather than forcing a light-only warm palette.

## 2. Absolute Negative Constraints (Banned Elements)
The AI must strictly avoid the following generic web development defaults:
- DO NOT use the "Inter", "Roboto", or "Open Sans" typefaces.
- DO NOT use generic, thin-line icon libraries like "Lucide", "Feather", or standard "Heroicons".
- DO NOT use Tailwind's default heavy drop shadows (e.g., `shadow-md`, `shadow-lg`, `shadow-xl`). Shadows must be practically non-existent or heavily customized to be ultra-diffuse and low opacity (< 0.05).
- DO NOT use primary colored backgrounds for large elements or sections (e.g., no bright blue, green, or red hero sections).
- DO NOT use gradients, neon colors, or 3D glassmorphism (beyond subtle navbar blurs).
- DO NOT use `rounded-full` (pill shapes) for large containers, cards, or primary buttons.
- DO NOT use emojis anywhere in code, markup, text content, headings, or alt text. Replace with proper icons or clean SVG primitives.
- DO NOT use generic placeholder names like "John Doe", "Acme Corp", or "Lorem Ipsum". Use realistic, contextual content.
- DO NOT use AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer", "Delve". Write plain, specific language.

## 3. Typographic Architecture
The interface must rely on extreme typographic contrast and premium font selection to establish an editorial feel.
- Primary Sans-Serif (Body, UI, Buttons): Reuse the installed Geist Variable and existing language fallbacks.
- Editorial Headings: Use Geist weight, scale, and spacing for contrast rather than introducing a serif font.
- Monospace (Code and Keystrokes): Use the existing system monospace stack.
Use Geist tabular numerals for financial data.
- Text Colors: Use `var(--foreground)` for body text and `var(--muted-foreground)` for secondary text.
Use a readable line-height near `1.6` and check contrast in both appearances.

## 4. Semantic Palette

Use color only for meaning or restrained accents.
Read the selected palette and appearance from the existing theme; do not replace them with fixed light colors.

- Canvas: `var(--background)`.
- Card surface and text: `var(--card)` and `var(--card-foreground)`.
- Structural borders: `var(--border)`.
- Primary action and text: `var(--primary)` and `var(--primary-foreground)`.
- Subtle accents: Existing Radix soft variants and semantic accent tokens.
- Error text and focus: `var(--destructive)` and `var(--ring)`.

Keep palette overrides, including parchment, intact.
Muted accents must remain readable in light and dark appearances.

## 5. Component Specifications

- Bento Box Feature Grids:
  - Use asymmetrical CSS Grid only when it improves grouping.
  - Use Radix Themes Card with a 1px `var(--border)` border when needed.
  - Use `var(--card)` and `var(--card-foreground)` for the surface and text.
  - Reuse the existing panel radius and responsive spacing.
- Primary Call-To-Action:
  - Use Radix Themes Button with the selected theme.
  - If custom styling is needed, use `var(--primary)` and `var(--primary-foreground)`.
  - Keep shadows minimal and preserve visible hover and keyboard focus states.
  - Use optional active-state transforms only when reduced motion is not requested.
- Tags & Status Badges:
  - Use Radix Themes Badge soft variants with semantic status colors.
  - Keep labels readable; do not force pale backgrounds from a fixed light palette.
- Accordions:
  - Use installed Radix Primitives for behavior and Radix Icons for toggles.
  - Separate items with `border-bottom: 1px solid var(--border)`.
- Keystroke Micro-UIs:
  - Use `<kbd>` with `var(--border)`, `var(--muted)`, and `var(--foreground)`.
  - Use a small radius and the existing system monospace stack.
- Software Preview Frames:
  - Use semantic surface and border tokens.
  - Keep device decoration separate from the actual product controls.

## 6. Iconography & Imagery Directives
- System Icons: Use `@radix-ui/react-icons` with consistent size and alignment.
Do not set unsupported stroke-weight props or add another icon family.
- Illustrations: Monochromatic, rough continuous-line ink sketches on a white background, featuring a single offset geometric shape filled with a muted pastel color.
- Photography: Use high-quality, desaturated images with a warm tone. Apply subtle overlays (`opacity: 0.04` warm grain) to blend photos into the monochrome palette. Never use oversaturated stock photos. Use reliable placeholders like `https://picsum.photos/seed/{context}/1200/800` when real assets are unavailable.
- Hero & Section Backgrounds: Sections should not feel empty and flat. Use subtle full-width background imagery at very low opacity, soft radial light spots (`radial-gradient` with warm tones at `opacity: 0.03`), or minimal geometric line patterns to add depth without breaking the clean aesthetic.

## 7. Subtle Motion & Micro-Animations
Motion should feel invisible — present but never distracting. The goal is quiet sophistication, not spectacle.
- Scroll Entry: Elements fade in gently as they enter the viewport. Use `translateY(12px)` + `opacity: 0` resolving over `600ms` with `cubic-bezier(0.16, 1, 0.3, 1)`. Use `IntersectionObserver`, never `window.addEventListener('scroll')`.
- Hover States: Cards lift with an ultra-subtle shadow shift (`box-shadow` transitioning from `0 0 0` to `0 2px 8px rgba(0,0,0,0.04)` over `200ms`). Buttons respond with `scale(0.98)` on `:active`.
- Staggered Reveals: Optional for marketing content only.
Show product lists immediately and honor reduced motion.
- Background Ambient Motion: Optional. A single, very slow-moving radial gradient blob (`animation-duration: 20s+`, `opacity: 0.02-0.04`) drifting behind hero sections. Must be applied to a `position: fixed; pointer-events: none` layer. Never on scrolling containers.
- Performance: Animate exclusively via `transform` and `opacity`. No layout-triggering properties (`top`, `left`, `width`, `height`). Use `will-change: transform` sparingly and only on actively animating elements.

## 8. Execution Protocol
When writing strict TypeScript React code for the Vite app or designing a layout:
1. Establish the macro-whitespace first. Use massive vertical padding between sections (e.g., `py-24` or `py-32` in Tailwind).
2. Constrain the main typography content width to `max-w-4xl` or `max-w-5xl`.
3. Apply the custom typographic hierarchy and monochromatic color variables immediately.
4. Use a 1px border mapped to the existing semantic border token rather than hard-coded `#EAEAEA`.
5. Add optional CSS feedback only where it explains a state change; keep static reduced-motion states.
6. Ensure sections have visual depth through imagery, ambient gradients, or subtle textures — no empty flat backgrounds.
7. Provide code that reflects this high-end, uncluttered, editorial aesthetic natively without requiring manual adjustments.
