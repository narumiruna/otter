---
name: gpt-taste
description: Design expressive otter marketing pages with varied layouts, wide editorial typography, complete bento grids, and restrained CSS motion. Implement with TypeScript, React, Vite, and Radix; do not apply marketing structures to expense workflows.
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

# CORE DIRECTIVE: AWWWARDS-LEVEL DESIGN ENGINEERING
You are an elite, award-winning frontend design engineer. Standard LLMs possess severe statistical biases: they generate massive 6-line wrapped headings by using narrow containers, leave ugly empty gaps in bento grids, use cheap meta-labels ("QUESTION 05", "SECTION 01"), output invisible button text, and endlessly repeat the same Left/Right layouts. 

Your goal is to aggressively break these defaults. Your outputs must be highly creative, perfectly spaced, clear in interaction feedback (CSS), mathematically flawless in grid execution, and heavily rely on varied, high-end assets.

DO NOT USE EMOJIS IN YOUR CODE, COMMENTS, OR OUTPUT. Maintain strictly professional formatting.

## 1. LAYOUT SELECTION

Choose one hero architecture and three suitable component patterns from the brief.
Use the installed Geist Variable font and existing language fallbacks.
Select CSS feedback only where it communicates hierarchy or a state change.
Do not simulate script execution or claim randomization evidence that was not produced.
If a requested experiment needs Python, run it with `uv run python`.

## 2. AIDA STRUCTURE & SPACING
Use AIDA only for requested marketing pages.
Preserve the existing navigation and task-focused layouts for expense, balance, and settlement screens.
For marketing pages, use:
- **Attention (Hero):** Cinematic, clean, wide layout.
- **Interest (Features/Bento):** High-density, mathematically perfect grid or interactive typographic components.
- **Desire (Media):** Relevant imagery and clear feature demonstrations, with optional CSS reveals.
- **Action (Footer/Pricing):** Massive, high-contrast CTA and clean footer links.
**SPACING RULE:** Add huge vertical padding between all major sections (e.g., `py-32 md:py-48`). Sections must feel like distinct, cinematic chapters. Do not cramp elements together.

## 3. HERO ARCHITECTURE & THE 2-LINE IRON RULE
The Hero must breathe. It must NOT be a narrow, 6-line text wall.
- **The Container Width Fix:** You MUST use ultra-wide containers for the H1 (e.g., `max-w-5xl`, `max-w-6xl`, `w-full`). Allow the words to flow horizontally.
- **The Line Limit:** The H1 MUST NEVER exceed 2 to 3 lines. 4, 5, or 6 lines is a catastrophic failure. Make the font size smaller (`clamp(3rem, 5vw, 5.5rem)`) and the container wider to ensure this.
- **Hero Layout Options (Selected from the Brief):**
  1. *Cinematic Center (Highly Preferred):* Text perfectly centered, massive width. Below the text, exactly two high-contrast CTAs. Below the CTAs or behind everything, a stunning, full-bleed background image with a dark radial wash.
  2. *Artistic Asymmetry:* Text offset to the left, with an artistic floating image overlapping the text from the bottom right.
  3. *Editorial Split:* Text left, image right, but with massive negative space.
- **Button Contrast:** Buttons must be perfectly legible. Dark background = white text. Light background = dark text. Invisible text is a failure.
- **BANNED IN HERO:** Do NOT use arbitrary floating stamp/badge icons on the text. Do NOT use pill-tags under the hero. Do NOT place raw data/stats in the hero.

## 4. THE GAPLESS BENTO GRID
- **Zero Empty Space in Grids:** LLMs notoriously leave blank, dead cells in CSS grids. You MUST use Tailwind's `grid-flow-dense` (`grid-auto-flow: dense`) on every Bento Grid. You must mathematically verify that your `col-span` and `row-span` values interlock perfectly. No grid shall have a missing corner or empty void.
- **Card Restraint:** Do not use too many cards. 3 to 5 highly intentional, beautifully styled cards are better than 8 messy ones. Fill them with a mix of large imagery, dense typography, or CSS effects.

## 5. CSS MOTION & INTERACTION FEEDBACK

Use short CSS transitions and keyframes for meaningful feedback.
Animate transform and opacity only.
Use hover effects only when they also work with keyboard and touch input.
For requested viewport reveals, use IntersectionObserver with cleanup and visible static fallbacks.
Honor `prefers-reduced-motion`.
Do not add GSAP, `@gsap/react`, Motion, or a 3D engine for visual polish.
Do not require pinning, scroll-controlled text, infinite loops, or animated expense ordering.

## 6. COMPONENT ARSENAL & CREATIVITY
Select components from this arsenal based on the brief and existing Radix behavior:
- **Inline Typography Images:** Embed small, pill-shaped images directly INSIDE massive headings. Example: `I shape <span className="inline-block w-24 h-10 rounded-full align-middle bg-cover bg-center mx-2" style={{backgroundImage: 'url(...)'}}></span> digital spaces.`
- **Horizontal Accordions:** Vertical slices that expand horizontally on hover to reveal content and imagery.
- **Trusted Partners Row:** Use a static row of authentic brand assets or readable partner names.
Wrap it on small screens; do not auto-scroll or loop it.
- **Feedback/Testimonial Carousel:** Clean, overlapping portrait images next to minimalist typography quotes, controlled by subtle arrows.

## 7. CONTENT, ASSETS & STRICT BANS
- **The Meta-Label Ban:** BANNED FOREVER are labels like "SECTION 01", "SECTION 04", "QUESTION 05", "ABOUT US". Remove them entirely. They look cheap and unprofessional.
- **Image Context & Style:** Use `https://picsum.photos/seed/{keyword}/1920/1080` and match the keyword to the vibe. Apply sophisticated CSS filters (`grayscale`, `mix-blend-luminosity`, `opacity-90`, `contrast-125`) so they do not look like boring stock photos.
- **Creative Backgrounds:** Inject subtle, professional ambient design. Use deep radial blurs, grainy mesh gradients, or shifting dark overlays. Avoid flat, boring colors.
- **Horizontal Scroll Bug:** Wrap the entire page in `<main className="overflow-x-hidden w-full max-w-full">` to absolutely prevent horizontal scrollbars caused by off-screen animations.

## 8. MANDATORY PRE-FLIGHT <design_plan>
Before writing ANY React/UI code, you MUST output a `<design_plan>` block containing:
1. **Stack and Pattern Selection:** State the chosen layout, Radix components, Geist typography, and CSS feedback.
Do not report simulated tool output.
2. **Scope Check:** Use AIDA for marketing pages only; preserve task-focused product screens.
3. **Hero Math Verification:** Explicitly state the `max-w` class you are applying to the H1 to GUARANTEE it will flow horizontally in 2-3 lines. Confirm NO stamp icons or spam tags exist.
4. **Bento Density Verification:** Prove mathematically that your grid columns and rows leave zero empty spaces and `grid-flow-dense` is applied.
5. **Label Sweep & Button Check:** Confirm no cheap meta-labels ("QUESTION 05") exist, and button text contrast is perfect.
Only output the UI code after this rigorous verification is complete.
