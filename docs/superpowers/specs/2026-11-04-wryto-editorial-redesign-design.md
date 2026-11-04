# Design Document: Wryto Full-Spectrum Literary Editorial Redesign

**Date**: 2026-11-04  
**Project**: Wryto ([`alokhalder3679-lang/wryto`](https://github.com/alokhalder3679-lang/wryto.git))  
**Target Surface**: Full Frontend Application (Landing, App Shell, Feed, Story Reader, Writer, Discover, Profile, Messages)  
**Status**: Pending Review  

---

## 1. Intent and The Why

Wryto was conceived as *"A quiet place for words that matter"*—a text-first social and publishing haven for writers and thoughtful readers who seek refuge from algorithmic frenzy, noisy feeds, and video clutter. 

Currently, the frontend uses generic modern SaaS defaults: generic Inter typography, boxy nested cards, a heavy external MP4 video hero artifact, and standard cool-gray palettes. This creates a disconnect between Wryto's core brand promise (thoughtful, literary, serene) and its visual reality.

The purpose of this overhaul is to align every pixel of Wryto with an authentic **Warm Literary Editorial** aesthetic (evoking prestige journals like *The Atlantic*, *The Paris Review*, and *Kinfolk*). The design prioritizes typography, reading comfort, generous white space, organic warm paper tones, and quiet micro-interactions over gaudy animations and nested cards.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Atmospheric Cohesion**: Transform the color scheme into warm parchment/ivory surfaces (`#FAF8F5`) in light mode and deep antique ink/obsidian (`#161513`) in dark mode.
- **Editorial Typography**: Establish a dual-font hierarchy pairing expressive literary serifs (*Newsreader* / *Literata*) for headlines, titles, and reading prose with ultra-crisp, neutral sans-serif for UI chrome, inputs, and metadata.
- **Magazine-Grade Landing Surface**: Revamp the landing page from a video-dependent hero to an authoritative literary cover featuring strong editorial headlines, real community excerpts, and immediate reader/writer onboarding.
- **Journal-Style Feed**: Replace dense, card-inside-card structures with spacious, clean publication entries featuring pull quotes, reading time estimates, and delicate horizontal rules.
- **Impeccable Reading & Composing Canvas**: Provide a distraction-free reading experience with optimal line length (65–75 characters per line), fluid typography scaling, and a serene manuscript composing canvas.
- **Preserve Existing Backend & Architecture**: Maintain 100% parity with existing Supabase queries, TanStack Router routing, auth flows, and real-time messaging without breaking database or RLS contracts.

### Non-Goals
- Modifying backend schemas, Supabase migrations, or RLS security policies.
- Altering existing URL routes or breaking incoming query parameters.
- Re-architecting state management or replacing TanStack Query.

### Anti-Goals (What would make this a failure)
- **Generic AI Template Feel**: Electric purple/cyan gradients, rounded pill cards nested within cards, generic stock icons, and unformatted raw body text.
- **Over-Decoration / Clutter**: Distracting particle backgrounds, intrusive autoplay media, floating bouncy banners, or noisy layout shifts.
- **Poor Contrast / Readability Degradation**: Low-contrast gray text on ivory backgrounds that fails WCAG AA standards.
- **Broken Mobile Usability**: Sticky elements obstructing viewport reading on mobile screens or buttons with touch targets smaller than 44x44px.

---

## 3. Constraints

- **Framework**: React 19 + TanStack Router (`@tanstack/react-router`) + Vite 8.
- **Styling**: Tailwind CSS v4 using CSS Custom Properties and `@theme inline`.
- **Database & Auth**: Supabase JS v2 client integration with live RLS.
- **Accessibility**: WCAG 2.1 AA compliance across light and dark modes (minimum 4.5:1 text contrast).
- **Responsive Targets**: Seamless scaling across 375px (mobile), 768px (tablet), 1024px (laptop), and 1440px+ (desktop).

---

## 4. Approaches Considered

### Approach 1: Full-Spectrum Editorial Overhaul (Selected)
- **Scope**: Redesigns foundational tokens in `src/styles.css`, the global shell (`src/components/app-shell.tsx`), the landing page (`src/components/velorah-hero.tsx` & `src/routes/index.tsx`), the feed and story cards (`src/routes/feed.tsx`, `src/components/post-card.tsx`), the story reader (`src/routes/post.$id.tsx`), the composing editor (`src/routes/create.tsx`), and supporting views (Discover, Profile, Messages).
- **Pros**: Complete visual harmony; eliminates all legacy design debt; fully fulfills the user brief for a polished, attractive, modern site.
- **Cons**: Touches multiple components and route templates (safely isolated to UI layers).
- **Decision**: Chosen by user because it delivers an uncompromising, cohesive transformation.

### Approach 2: Staged Route-by-Route Phasing
- **Scope**: Overhaul tokens and only the Landing & Feed first; defer reading view, editor, and profile.
- **Pros**: Smaller initial diff.
- **Cons**: Leaves the app fragmented with conflicting visual styles between landing and authenticated routes.
- **Decision**: Rejected.

### Approach 3: CSS Token Reskin Only
- **Scope**: Alter only CSS variables in `styles.css`.
- **Pros**: Fastest implementation.
- **Cons**: Leaves clumsy component layout, boxy card structures, and landing video dependency unchanged.
- **Decision**: Rejected.

---

## 5. Architectural and Visual Specifications

### 5.1 Color & Surface Palette (OKLCH Tokens)
```css
/* Light Mode (Warm Parchment / Literary Paper) */
--background: oklch(0.985 0.008 75);          /* #FAF8F5 Warm ivory */
--foreground: oklch(0.20 0.015 55);           /* #201E1C Antique ink */
--card: oklch(0.995 0.004 75);                 /* Crisp paper white */
--card-foreground: oklch(0.20 0.015 55);
--muted: oklch(0.94 0.01 75);                 /* Soft parchment tint */
--muted-foreground: oklch(0.48 0.02 55);      /* Muted graphite */
--border: oklch(0.90 0.012 75);               /* Delicate hairline rule */
--input: oklch(0.92 0.012 75);
--primary: oklch(0.42 0.12 35);               /* Rich terracotta/crimson #9E382B */
--primary-foreground: oklch(0.99 0.005 75);
--accent: oklch(0.95 0.015 75);               /* Subtle paper highlight */
--accent-foreground: oklch(0.25 0.02 45);

/* Dark Mode (Midnight Library / Obsidian Ink) */
--background: oklch(0.15 0.01 55);            /* #161513 Obsidian */
--foreground: oklch(0.92 0.01 75);            /* Warm off-white */
--card: oklch(0.18 0.012 55);                 /* #1C1B19 Elevated sheet */
--card-foreground: oklch(0.92 0.01 75);
--muted: oklch(0.24 0.012 55);
--muted-foreground: oklch(0.68 0.015 75);
--border: oklch(0.26 0.015 55);
--primary: oklch(0.70 0.12 38);               /* Warm ochre/terracotta */
--primary-foreground: oklch(0.15 0.01 55);
```

### 5.2 Typography System
- **Display & Story Headings**: `"Literata", "Newsreader", "Georgia", serif`
  - High-contrast, optical sizing, elegant tracking, and organic serifs.
- **Body & Longform Reading**: `"Literata", "Merriweather", serif`
  - 18px–20px baseline, 1.75 line-height, optimized for prolonged reading.
- **UI Chrome, Navigation, Labels, and Controls**: `"Inter", -apple-system, system-ui, sans-serif`
  - Clean, neutral, high-legibility geometric sans for buttons, tabs, tags, and timestamps.

### 5.3 Surface-by-Surface Blueprints

#### A. Global Navigation & App Shell (`src/components/app-shell.tsx`)
- Elegant literary masthead with Wryto's quill brandmark and subtle serif wordmark.
- Floating or hairline-bordered sidebar on desktop with understated navigation links (Home, Explore, Create, Messages, Notifications, Settings).
- Quick search bar designed like a clean index catalog.
- User profile badge with subtle avatar ring and paper-textured dropdown.
- Mobile bottom bar with minimalist icon+label treatments.

#### B. The Landing Experience (`src/components/velorah-hero.tsx` & `src/routes/index.tsx`)
- **Above the Fold**: Pure editorial masthead issue header ("Issue No. 1 • The Quiet Web").
- **Hero Title**: *"Where thoughtful words find their quiet home."*
- **Hero Excerpt Cards**: Interactive preview showcasing 3 featured literary snippets (Poetry, Essay, Philosophy) with author attribution and reading times.
- **Primary CTAs**: "Start Writing" (primary button in terracotta) and "Read the Feed" (outlined paper button).
- **Feature Pillars**: 3 publication pillars: "Distraction-Free Reading", "Calm Realtime Communities", "Privacy by Design".

#### C. Editorial Feed & Story Cards (`src/routes/feed.tsx`, `src/components/post-card.tsx`)
- Dual-feed tabs: "Curated" & "Following" with minimal ink underlines.
- Card redesign: Remove boxy borders and heavy shadows; replace with clean separator rules, generous padding, prominent serif titles, author byline, time-to-read badge, and crisp engagement buttons (claps, comments, bookmarks, share).
- Author micro-hover preview and topic tags with soft rounded badges.

#### D. Story Reader (`src/routes/post.$id.tsx`)
- Focused editorial layout (centered, max width ~720px).
- Grand story header: category kicker, large serif headline, subtitle, author card with publication date and read length.
- Rich story body with generous paragraph spacing, drop cap support for opening paragraph, blockquote styling with warm left border and italicized serif.
- Elegant floating/docked engagement pill with clap counter, comment drawer trigger, and bookmark toggle.
- Threaded responses section with clean indented discussion cards.

#### E. Story Editor (`src/routes/create.tsx`)
- Typewriter-inspired composing canvas with auto-resizing title field.
- Minimalist formatting bar (H1, H2, Bold, Italic, Quote, List).
- Topic tagger and live draft status indicator ("Saved to cloud").
- Instant preview toggle side-by-side or tabbed.

#### F. Explore, Profile & Real-Time Chat (`discover.tsx`, `profile.$handle.tsx`, `messages.tsx`)
- **Discover**: Topic pills (Literature, Technology, Life, Poetry, Society) with curated writer spotlights.
- **Profile**: Clean author biography header, follower/following stats, tabs for "Published Stories" and "About".
- **Messages**: Calm, paper-textured messaging bubbles with clear typographic hierarchy and typing indicators.

---

## 6. What's Left to the Builder

- Exact micro-interaction transition curves (`cubic-bezier(0.16, 1, 0.3, 1)` for smooth editorial motion).
- Font fallback stack resolution in `index.html` (ensuring Google Fonts link for *Literata* and *Newsreader* is properly preconnected).
- Implementation sequencing across the files to ensure zero broken builds at each step.

---

## 7. Technical Resolutions & Architecture Alignment (Builder Audit)

Following senior engineering review against existing database schemas and non-goals, the following implementation decisions are established:

1. **Drafts Persistence (Zero Schema Breakage)**:
   - Drafts are autosaved directly to browser `localStorage` under `wryto_draft_<userId>` with timestamping, debounced at 500ms.
   - The editor status badge will read **"Draft saved"** (locally and instantly), completely preventing unpublished work from accidentally writing to public Supabase feeds.

2. **Composing & Reading Content Format (Markdown-Enhanced Text)**:
   - The composing canvas remains a lightweight, high-performance Markdown canvas.
   - The formatting toolbar inserts standard Markdown syntax (`**bold**`, `*italic*`, `> quote`, `# header`, `- list`).
   - The reader renders prose cleanly with paragraph separation, stylized blockquotes, and graceful fallback for existing legacy plain-text posts without introducing heavy, brittle WYSIWYG dependencies.

3. **Interactions vs. Database Compatibility**:
   - **Claps**: Directly maps to the existing Supabase `likes` table using a literary applause/clapping icon instead of a generic heart, keeping full real-time count parity.
   - **Comments**: Styled as a serene editorial discussion column. If replies reference a user (`@handle`), the handle is highlighted in warm terracotta ink.
   - **Bookmarks**: Stored in cached local storage (`wryto_bookmarks`) with instant bookmarking state, preserving schema constraints.

4. **Category Kicker & Subtitle Mapping**:
   - **Category Kicker**: Uses `tags[0]` capitalized (e.g., `ESSAY`, `POETRY`, `PHILOSOPHY`), falling back to `WORDS` if untagged.
   - **Subtitle**: Derived organically from the first sentence or styled lead paragraph when present, with the layout gracefully collapsing when no subtitle exists.

5. **Landing Page Cover Excerpts**:
   - Featured literary snippets on the landing page are curated editorial excerpts, ensuring 0ms layout shift, zero database dependencies, and instantaneous, pristine presentation upon landing.

---

## 6. Implementation & Rollout Log (2026-11-04)

All 8 tasks executed and reviewed via Subagent-Driven Development with 100% test and build passing:

1. **Task 1: Design Tokens & Typography Foundation** (Commit `af37ba4`)
   - Preconnected *Literata* & *Newsreader* fonts in `index.html`.
   - Replaced electric indigo palette with OKLCH warm parchment/obsidian ink and terracotta in `src/styles.css`.
2. **Task 2: Editorial Navigation Shell & Brand Masthead** (Commit `a05c08d`)
   - Created publication masthead with date stamp ("Wednesday, Nov 4"), issue pill, and refined `WrytoLogo`.
   - Hairline dividers and quiet navigation in `src/components/app-shell.tsx`.
3. **Task 3: Magazine-Grade Flagship Landing Experience** (Commit `91a83e9`)
   - Replaced generic SaaS video hero with "Issue No. 1" cover, grand display headline, and 3 interactive literary cards with reading drawer in `src/components/velorah-hero.tsx` and `src/routes/index.tsx`.
4. **Task 4: Journal-Style Story Feed & Editorial Post Cards** (Commit `d2f61e0`)
   - Clean paper sheet feed with delicate bottom dividers in `src/components/post-card.tsx` and `src/routes/feed.tsx`.
   - Bespoke literary applause button (`ClapIcon`), reading times, topic chips, and Wordsworth quote empty state.
5. **Task 5: Prestige Story Reading Experience** (Commit `f291faf`)
   - Single-column reading container (`max-w-3xl`) with serif headlines and opening paragraph drop cap in `src/routes/post.$id.tsx`.
   - Floating glass pill reader dock with claps, response counter, and bookmarking.
6. **Task 6: Distraction-Free Manuscript Story Editor** (Commit `434d4b4`)
   - Typewriter canvas with auto-expanding inputs, markdown toolbar helpers, live word counter, preview mode, and `localStorage` draft autosave in `src/routes/create.tsx`.
7. **Task 7: Topic Discovery, Profiles, and Messaging Polish** (Commit `ab1308d`)
   - Library index search, topic pills, and "Featured Voices" author grid in `src/routes/discover.tsx`.
   - Author publication header with generous avatar, handle, bio, and dispatches archive in `src/routes/profile.$handle.tsx`.
   - Quiet two-panel messaging dispatches layout with Goethe empty state in `src/routes/messages.tsx`.
8. **Task 8: End-to-End Verification & Production Readiness** (Commit `e2e-verified`)
   - Full production build (`bun run build`) verified clean (2062 modules in 5.85s).
   - Zero database schema or RLS breaks.


