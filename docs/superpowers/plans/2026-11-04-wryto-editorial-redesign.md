# Wryto Full-Spectrum Literary Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Wryto's entire frontend into an authentic, warm, and elegant Literary Editorial publication, upgrading typography, palette, landing experience, feed, reader, and composing editor.

**Architecture:** Build upon Tailwind CSS v4 CSS variables with OKLCH warm parchment/ink tokens, preconnect Google Fonts (*Literata* and *Newsreader*) for publication serifs, replace boxy card-inside-card structures with airy journal entries, and keep 100% compatibility with the existing Supabase schema, RLS policies, and TanStack Router routes.

**Tech Stack:** React 19, Vite 8, TanStack Router (`@tanstack/react-router`), TanStack Query, Tailwind CSS v4, Lucide React, Bun.

**Spec:** [`docs/superpowers/specs/2026-11-04-wryto-editorial-redesign-design.md`](file:///c:/Users/halde/Downloads/textbloom-net/docs/superpowers/specs/2026-11-04-wryto-editorial-redesign-design.md)

---

## Global Constraints

- Never modify Supabase schemas, tables, migrations, or database RLS security policies.
- Keep all existing routes (`/`, `/feed`, `/post/$id`, `/create`, `/discover`, `/profile/$handle`, `/messages`, `/notifications`, `/settings`, `/auth`) fully operational.
- Preserve light and dark theme functionality using `@custom-variant dark (&:is(.dark *))` in `src/styles.css`.
- Ensure light mode background is warm ivory/parchment (`#FAF8F5` / `oklch(0.985 0.008 75)`) and dark mode is obsidian ink (`#161513` / `oklch(0.15 0.01 55)`).
- All buttons and interactive touch targets must meet a minimum of 44x44px clickable area on mobile.
- Build command `bun run build` must succeed with zero TypeScript or bundling errors at each milestone.

---

## Review Focus

1. **Parchment Contrast on Dark Mode Toggle**: Switching themes must preserve WCAG AA contrast (minimum 4.5:1) without inverted or washed-out text on cards or inputs.
2. **Auto-Save Draft Isolation**: Typing in `/create` must save only to `localStorage` (`wryto_draft_<userId>`) and never trigger an accidental premature Supabase insert to public feeds.
3. **Legacy Plain-Text Compatibility**: Existing posts in `posts.body` that lack markdown formatting must render cleanly with natural paragraph spacing and line breaks without throwing syntax errors.
4. **Mobile Masthead & Navigation Overflow**: On 375px screens, the header title, search trigger, and bottom navigation bar must not clip, wrap awkwardly, or obscure content.
5. **Zero External Video Dependency**: The landing hero must render instantaneously without waiting on external cloudfront video streams or third-party media assets.

---

### Task 1: Literary Editorial Design Tokens & Typography Foundation

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Tailwind v4 theme engine in `src/styles.css`
- Produces: Global CSS variables (`--color-background`, `--color-foreground`, `--color-primary`, `--font-display`, `--font-reading`, `--font-sans`) available throughout the application.

- [ ] **Step 1: Update `index.html` to load Google Fonts**
  Add preconnects and stylesheet links for `Newsreader` (weights 400, 500, 600, italic) and `Literata` (weights 400, 500, 600, 700, italic) in `<head>` of `index.html`.

- [ ] **Step 2: Update `src/styles.css` with Literary Editorial Tokens**
  - Update `@theme inline` with:
    - `--font-display: "Newsreader", "Literata", "Georgia", serif`
    - `--font-reading: "Literata", "Georgia", serif`
    - `--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  - Update `:root` variables:
    - `--background: oklch(0.985 0.008 75);` (warm ivory)
    - `--foreground: oklch(0.20 0.015 55);` (deep antique ink)
    - `--card: oklch(0.995 0.004 75);` (crisp paper)
    - `--card-foreground: oklch(0.20 0.015 55);`
    - `--muted: oklch(0.94 0.01 75);`
    - `--muted-foreground: oklch(0.48 0.02 55);`
    - `--border: oklch(0.90 0.012 75);` (hairline divider)
    - `--primary: oklch(0.44 0.13 36);` (rich terracotta/crimson `#9E382B`)
    - `--primary-foreground: oklch(0.99 0.005 75);`
    - `--accent: oklch(0.95 0.015 75);`
    - `--accent-foreground: oklch(0.25 0.02 45);`
  - Update `.dark` variables:
    - `--background: oklch(0.15 0.01 55);` (antique obsidian `#161513`)
    - `--foreground: oklch(0.92 0.01 75);` (warm paper white)
    - `--card: oklch(0.18 0.012 55);` (elevated sheet)
    - `--card-foreground: oklch(0.92 0.01 75);`
    - `--muted: oklch(0.24 0.012 55);`
    - `--muted-foreground: oklch(0.68 0.015 75);`
    - `--border: oklch(0.26 0.015 55);`
    - `--primary: oklch(0.70 0.12 38);` (warm ochre/terracotta)
    - `--primary-foreground: oklch(0.15 0.01 55);`
    - `--accent: oklch(0.22 0.015 55);`

- [ ] **Step 3: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add index.html src/styles.css
  git commit -m "style: establish literary editorial palette and typography tokens"
  ```

---

### Task 2: Editorial Navigation Shell & Brand Masthead

**Files:**
- Modify: `src/components/wryto-logo.tsx`
- Modify: `src/components/app-shell.tsx`

**Interfaces:**
- Consumes: Theme tokens from `src/styles.css`
- Produces: `AppShell` wrapping all application routes with consistent masthead, desktop navigation sidebar, and mobile tab bar.

- [ ] **Step 1: Enhance `WrytoLogo` in `src/components/wryto-logo.tsx`**
  Add high-contrast typography option with literary serif styling ("Wryto") paired with the quill mark, ensuring graceful scaling from 24px icon to large mastheads.

- [ ] **Step 2: Redesign `AppShell` in `src/components/app-shell.tsx`**
  - Implement a refined masthead with delicate bottom hairline border (`border-b border-border/60`).
  - Style desktop sidebar navigation items with calm typography, generous padding, and subtle terracotta left indicator pill on active state (`border-l-2 border-primary`).
  - Upgrade search input to look like an understated library index catalog bar.
  - Upgrade mobile bottom bar with minimal icon badges and crisp labels.
  - Ensure theme toggle (Moon/Sun) cleanly updates `.dark` class on root with seamless transition.

- [ ] **Step 3: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/wryto-logo.tsx src/components/app-shell.tsx
  git commit -m "feat(ui): redesign app shell with editorial masthead and quiet navigation"
  ```

---

### Task 3: Magazine-Grade Flagship Landing Experience

**Files:**
- Modify: `src/components/velorah-hero.tsx`
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Consumes: Brand logo, `useInkline` auth state, TanStack Router `Link`
- Produces: The public flagship homepage at `/` converting visitors into readers and writers.

- [ ] **Step 1: Rebuild `CustomHero` in `src/components/velorah-hero.tsx`**
  - Remove external cloudfront video dependency and cumbersome video modals.
  - Implement an editorial cover masthead:
    - Issue banner: `"Volume I • The Autumn Edition • A Sanctuary for Thoughtful Writing"`
    - Grand headline: *"Where thoughtful words find their quiet home."* in `font-display text-4xl sm:text-6xl tracking-tight`.
    - Subtitle: *"A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays, stories, and ideas that linger."*
  - Build interactive Literary Excerpts showcase:
    - 3 curated snippet cards (Philosophy, Essay, Poetry) with pull quotes, author signatures, reading time tags, and click-to-preview modals.
  - Primary call-to-actions:
    - "Start Writing" (prominent primary terracotta button linking to `/auth`)
    - "Explore Stories" (editorial parchment button linking to `/feed`)
  - Value pillars section:
    - 1. *Distraction-Free Reading* (comfortable margins, serif typography, zero ads)
    - 2. *Calm Communities* (subtle threaded letters and follow-restricted private notes)
    - 3. *Your Work, Protected* (privacy controls and author ownership)

- [ ] **Step 2: Align `src/routes/index.tsx`**
  Ensure clean SEO metadata and instant authentication redirect for returning members to `/feed`.

- [ ] **Step 3: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/velorah-hero.tsx src/routes/index.tsx
  git commit -m "feat(landing): replace video hero with prestige magazine cover and literary excerpts"
  ```

---

### Task 4: Journal-Style Story Feed & Editorial Post Cards

**Files:**
- Modify: `src/components/post-card.tsx`
- Modify: `src/routes/feed.tsx`

**Interfaces:**
- Consumes: Post data model from `useInkline()`, Supabase likes/bookmarks helpers
- Produces: `PostCard` component and `/feed` route layout.

- [ ] **Step 1: Redesign `PostCard` in `src/components/post-card.tsx`**
  - Remove heavy drop-shadows and thick borders.
  - Use clean paper sheet structure with delicate bottom separator rule (`border-b border-border/50 pb-8 mb-8`).
  - Typography:
    - Category kicker tag in small uppercase tracking (`text-xs font-sans tracking-widest text-primary font-medium`).
    - Story title in prominent serif (`font-display text-2xl font-semibold text-foreground hover:text-primary transition-colors`).
    - Excerpt body in comfortable reading font (`font-reading text-base leading-relaxed text-foreground/90 line-clamp-3`).
  - Byline metadata: Author avatar with subtle border, author name, publication date, and estimated reading time (e.g. `4 min read`).
  - Engagement footer:
    - Literary Applause / Clap button (clapping hands icon mapping to `likes` count).
    - Comment button showing response count.
    - Bookmark toggle button with active state saved to `localStorage`.
    - Share link button with copy-to-clipboard toast feedback.

- [ ] **Step 2: Redesign `Feed` in `src/routes/feed.tsx`**
  - Refine tabs: "Curated Feed" and "Following" with minimal ink underlines.
  - Side column: Curated topic chips and "Writers to Discover" list with quick follow actions.
  - Empty state: Literary illustration/quote encouraging reading or drafting the first story.

- [ ] **Step 3: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/post-card.tsx src/routes/feed.tsx
  git commit -m "feat(feed): transform story feed and cards into refined literary journal format"
  ```

---

### Task 5: Prestige Story Reading Experience

**Files:**
- Modify: `src/routes/post.$id.tsx`

**Interfaces:**
- Consumes: Post detail from Supabase, author profile, comments list
- Produces: Publication story reader route at `/post/$id`.

- [ ] **Step 1: Overhaul Story Reader in `src/routes/post.$id.tsx`**
  - Reading container: Centered reading column (`max-w-2xl mx-auto px-4 py-12`).
  - Header:
    - Back to feed link with gentle arrow icon.
    - Category tag kicker in terracotta uppercase.
    - Large serif article title (`font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]`).
    - Author attribution card: Avatar, name, bio snippet, publication date, and read time.
  - Article Body:
    - Generous line-height (`font-reading text-lg sm:text-xl leading-[1.8] text-foreground/90`).
    - Support for opening paragraph drop cap (`first-letter:float-left first-letter:text-5xl first-letter:font-display first-letter:mr-3 first-letter:text-primary`).
    - Styled blockquotes (`border-l-2 border-primary pl-6 my-8 italic font-display text-xl text-foreground/85`).
  - Floating / Sticky Reader Bar:
    - Elegant pill bar with claps, comment count, and bookmark toggle.
  - Responses / Comments Section:
    - Editorial discussion header ("Responses (N)").
    - Distraction-free comment input form.
    - Threaded discussion cards with subtle indentations and author handles.

- [ ] **Step 2: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds.

- [ ] **Step 3: Commit**
  ```bash
  git add src/routes/post.\$id.tsx
  git commit -m "feat(reader): implement publication-grade distraction-free reading experience"
  ```

---

### Task 6: Distraction-Free Manuscript Story Editor

**Files:**
- Modify: `src/routes/create.tsx`

**Interfaces:**
- Consumes: Supabase post creation API via `useInkline()`
- Produces: Story drafting & publishing route at `/create`.

- [ ] **Step 1: Re-architect Story Editor in `src/routes/create.tsx`**
  - Implement typewriter canvas aesthetic:
    - Serene, clean paper column with no bounding boxes or distraction panels.
    - Title input: auto-expanding input in `font-display text-3xl sm:text-4xl font-bold text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent`.
    - Body input: fluid textarea in `font-reading text-lg sm:text-xl leading-relaxed text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent min-h-[400px] resize-none`.
  - Format helper bar:
    - Floating or docked toolbar for `# Header`, `**Bold**`, `*Italic*`, `> Quote`, `- List`.
    - When clicked, wraps current selection or inserts syntax at cursor.
  - Category / Topic tags selector:
    - Understated literary tag pills (`Technology`, `Philosophy`, `Essay`, `Poetry`, `Design`, `Culture`).
  - Draft Autosave Manager:
    - Autosaves title, body, and tags to `localStorage` under `wryto_draft_<userId>` debounced at 500ms.
    - Status pill in header: "Draft saved" with checkmark.
    - Clear draft after successful publication.
  - Header controls:
    - Word counter badge.
    - "Preview" toggle button to view formatted essay before publishing.
    - "Publish Story" primary terracotta button.

- [ ] **Step 2: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds.

- [ ] **Step 3: Commit**
  ```bash
  git add src/routes/create.tsx
  git commit -m "feat(editor): implement serene manuscript story editor with autosave and markdown toolbar"
  ```

---

### Task 7: Topic Discovery, Profiles, and Messaging Polish

**Files:**
- Modify: `src/routes/discover.tsx`
- Modify: `src/routes/profile.$handle.tsx`
- Modify: `src/routes/messages.tsx`

**Interfaces:**
- Consumes: Supabase topic data, profiles, and realtime message channels
- Produces: Polished sub-pages matching the warm literary design system.

- [ ] **Step 1: Update Discover page in `src/routes/discover.tsx`**
  - Topic chips in warm parchment pills with subtle border hover effects.
  - "Featured Voices" author spotlight grid with bio and follower button.
  - Curated story highlights.

- [ ] **Step 2: Update Profile page in `src/routes/profile.$handle.tsx`**
  - Clean publication author header: generous avatar, writer handle, bio, follower count, and clean tabbed navigation ("Published Stories", "About").

- [ ] **Step 3: Update Messages page in `src/routes/messages.tsx`**
  - Quiet parchment messaging pane with antique ink bubbles for incoming messages and warm terracotta accents for user messages.
  - Subdued active presence indicator and clean conversation list.

- [ ] **Step 4: Verify build passes**
  Run: `bun run build`  
  Expected: Build succeeds.

- [ ] **Step 5: Commit**
  ```bash
  git add src/routes/discover.tsx src/routes/profile.\$handle.tsx src/routes/messages.tsx
  git commit -m "feat(pages): unify discover, profile, and messages with literary editorial theme"
  ```

---

### Task 8: End-to-End Verification & Production Readiness

**Files:**
- Audit all modified components across `src/`
- Build artifacts in `dist/`

**Interfaces:**
- Consumes: Complete project codebase
- Produces: Production build and clean test verification.

- [ ] **Step 1: Run comprehensive build verification**
  Run: `bun run build`  
  Expected: Production build finishes with 0 errors.

- [ ] **Step 2: Verify Git status and working directory integrity**
  Run: `git status`  
  Expected: Working directory is clean, commits are properly structured.

- [ ] **Step 3: Update local documentation and changelog**
  Record the frontend redesign summary in `docs/superpowers/specs/2026-11-04-wryto-editorial-redesign-design.md`.

- [ ] **Step 4: Commit and finalize**
  ```bash
  git add docs/
  git commit -m "docs: finalize literary editorial redesign documentation"
  ```
