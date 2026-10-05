# Wryto

> A quiet place for words that matter.

Wryto is a modern, text-first publishing and social platform designed for writers and thoughtful readers. Built with a focus on simplicity, calm aesthetics, and deep readability, Wryto eliminates algorithmic noise and video distractions to put writing back at the center.

---

## Features

- **Distraction-Free Writing & Publishing**
  - Clean editor supporting rich typography, headers, quotes, lists, and topic tags.
  - Drafts and published stories with instant live previews.

- **Real-Time Social Graph & Feeds**
  - Personalized home feed with tabs for "For You" curated stories and "Following".
  - Follow / unfollow writers with live follower/following counts.
  - Interactive engagement: post claps/likes, bookmarks, and threaded comment discussions.

- **Real-Time Direct & Group Chat**
  - Seamless 1-on-1 private messaging with active presence status and read receipts.
  - Follow-restricted messaging options for author privacy.

- **Explore & Discover**
  - Topic-based navigation chips (Technology, Philosophy, Poetry, Design, Life, etc.).
  - Search engine for discovering writers, stories, and trending topics.

- **Customizable Reading & Privacy Settings**
  - **Reading Mode:** Custom font size scaling, reading width, and typography controls.
  - **Appearance:** Fluid dark, light, and system themes with glassmorphism design accents.
  - **Multilingual Support:** English, Bengali (বাংলা), and Hindi (हिन्दी).
  - **Privacy & Safety:** Account privacy toggles, follow/comment permission rules, and blocking system backed by database Row-Level Security (RLS).

---

## Tech Stack

- **Frontend Framework:** React 19 (TypeScript)
- **Routing:** TanStack Router (`@tanstack/react-router`)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS, Radix UI primitives, Lucide React icons
- **State & Data Fetching:** TanStack React Query (`@tanstack/react-query`)
- **Backend & Database:** [Supabase](https://supabase.com/)
  - PostgreSQL database with Row-Level Security (RLS)
  - Supabase Auth (session management, secure cookies/tokens)
  - Supabase Realtime (live notifications, chat messages, presence)

---

## Project Structure

```text
├── inkline/             # Project specification and architecture plans
├── public/              # Static public assets, icons, and fonts
├── src/
│   ├── components/      # Reusable UI components, layout shell, cards, modals
│   ├── hooks/           # Custom React hooks (realtime, auth, queries)
│   ├── integrations/    # Supabase client, database types, and schema helpers
│   ├── lib/             # Utility functions, settings provider, i18n
│   ├── routes/          # TanStack Router page routes (feed, post, chat, profile, settings)
│   └── main.tsx         # Application entry point
├── supabase/            # Database schema migrations, configuration, and setup scripts
├── .env.example         # Environment variable template
├── package.json         # Project metadata and dependencies
└── vite.config.ts       # Vite and router build configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- `npm`, `pnpm`, or `bun`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alokhalder3679-lang/wryto.git
   cd wryto
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and configure your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Supabase project URL and anon public key:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

### Production Build

To build the project for production deployment:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
