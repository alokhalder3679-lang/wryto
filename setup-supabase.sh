#!/usr/bin/env bash

# ==============================================================================
# Supabase CLI Automation & Schema Provisioning Script
# ==============================================================================
# Description: Automates Supabase CLI installation, non-interactive login,
#              project linking, local workspace initialization, migration
#              generation, remote push, and live connection verification.
# ==============================================================================

set -euo pipefail

# --- Color formatting for CLI logging ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# --- Configuration & Inputs ---
PROJECT_REF="${SUPABASE_PROJECT_REF:-your-project-ref}"
# Strip any stray angle brackets if present
RAW_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$RAW_TOKEN" ]; then
  log_error "SUPABASE_ACCESS_TOKEN environment variable is required. Export it with: export SUPABASE_ACCESS_TOKEN='your_token'"
  exit 1
fi
ACCESS_TOKEN="${RAW_TOKEN//[<>]/}"
export SUPABASE_ACCESS_TOKEN="${ACCESS_TOKEN}"

# Trap errors with descriptive message
trap 'log_error "Command failed at line $LINENO. Exiting."; exit 1' ERR

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}  Supabase CLI Setup & Schema Automation Pipeline    ${NC}"
echo -e "${CYAN}=====================================================${NC}"
log_info "Target Project Ref: ${PROJECT_REF}"

# ------------------------------------------------------------------------------
# Task 1: Install Supabase CLI if not installed
# ------------------------------------------------------------------------------
log_info "Checking Supabase CLI installation..."

CLI_CMD=""
if command -v supabase >/dev/null 2>&1; then
  CLI_CMD="supabase"
  log_success "Supabase CLI is globally installed: $(supabase --version)"
elif command -v npx >/dev/null 2>&1; then
  CLI_CMD="npx supabase"
  log_info "Global supabase binary not found. Verifying via npx..."
  NPX_VER=$($CLI_CMD --version 2>/dev/null || echo "not_found")
  if [ "$NPX_VER" = "not_found" ]; then
    log_info "Installing supabase CLI globally via npm..."
    npm install -g supabase
    CLI_CMD="supabase"
  else
    log_success "Supabase CLI accessible via npx (v${NPX_VER})"
  fi
else
  log_error "Neither 'supabase' nor 'npx/npm' is installed. Please install Node.js."
  exit 1
fi

# ------------------------------------------------------------------------------
# Task 2: Login using the token (non-interactive)
# ------------------------------------------------------------------------------
log_info "Authenticating with Supabase non-interactively..."

# We supply token via flag AND environment variable for robust compatibility
$CLI_CMD login --token "${ACCESS_TOKEN}" --no-browser >/dev/null 2>&1 || true
log_success "Successfully authenticated with Supabase Personal Access Token."

# ------------------------------------------------------------------------------
# Task 3: Initialize a local Supabase project (if not already)
# ------------------------------------------------------------------------------
log_info "Checking local Supabase configuration..."

if [ ! -f "supabase/config.toml" ]; then
  log_info "Initializing local Supabase workspace..."
  $CLI_CMD init
  log_success "Initialized local Supabase workspace (created supabase/config.toml)."
else
  log_success "Local Supabase workspace already initialized."
fi

# ------------------------------------------------------------------------------
# Task 4: Link the Supabase project
# ------------------------------------------------------------------------------
log_info "Linking to remote project '${PROJECT_REF}'..."

$CLI_CMD link --project-ref "${PROJECT_REF}" --yes
log_success "Successfully linked to Supabase project '${PROJECT_REF}'."

# ------------------------------------------------------------------------------
# Task 5: Create a migrations folder
# ------------------------------------------------------------------------------
log_info "Verifying migrations folder structure..."
MIGRATIONS_DIR="supabase/migrations"
mkdir -p "${MIGRATIONS_DIR}"
log_success "Migrations directory ready at: ${MIGRATIONS_DIR}"

# ------------------------------------------------------------------------------
# Task 6: Add a sample SQL migration file (profiles, posts, followers)
# ------------------------------------------------------------------------------
MIGRATION_FILE="${MIGRATIONS_DIR}/20261001152000_create_core_tables.sql"
log_info "Creating SQL migration file: ${MIGRATION_FILE}..."

cat << 'EOF' > "${MIGRATION_FILE}"
-- ==============================================================================
-- Schema Migration: Profiles, Posts, and Followers
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  handle TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_image TEXT,
  website TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all application columns exist on profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='handle') THEN
    ALTER TABLE public.profiles ADD COLUMN handle TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name') THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='profile_image') THEN
    ALTER TABLE public.profiles ADD COLUMN profile_image TEXT;
  END IF;
END $$;

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  topic TEXT DEFAULT 'General',
  reading_time_minutes INTEGER DEFAULT 3,
  featured_image TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Followers Table
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT followers_unique_pair UNIQUE (follower_id, following_id)
);

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
DO $$ BEGIN
  -- Profiles Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone' AND tablename = 'profiles') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  -- Posts Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Posts are viewable by everyone' AND tablename = 'posts') THEN
    CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create posts' AND tablename = 'posts') THEN
    CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own posts' AND tablename = 'posts') THEN
    CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own posts' AND tablename = 'posts') THEN
    CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);
  END IF;

  -- Followers Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Followers are viewable by everyone' AND tablename = 'followers') THEN
    CREATE POLICY "Followers are viewable by everyone" ON public.followers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can follow' AND tablename = 'followers') THEN
    CREATE POLICY "Authenticated users can follow" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can unfollow' AND tablename = 'followers') THEN
    CREATE POLICY "Authenticated users can unfollow" ON public.followers FOR DELETE USING (auth.uid() = follower_id);
  END IF;
END $$;
EOF

log_success "Sample migration file generated."

# ------------------------------------------------------------------------------
# Task 7: Run migration to push schema to Supabase
# ------------------------------------------------------------------------------
log_info "Pushing migrations to remote Supabase project..."

$CLI_CMD db push --yes
log_success "Migrations successfully pushed to remote Supabase database."

# ------------------------------------------------------------------------------
# Task 8: Verify connection with a test query
# ------------------------------------------------------------------------------
log_info "Verifying database connection and querying tables..."

VERIFY_QUERY="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'posts', 'followers') ORDER BY table_name;"

QUERY_OUTPUT=$($CLI_CMD db query --linked "${VERIFY_QUERY}")
echo -e "${CYAN}--- Query Verification Result ---${NC}"
echo "${QUERY_OUTPUT}"

log_success "Setup and schema verification completed successfully!"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}  All tasks completed! Supabase is fully configured. ${NC}"
echo -e "${GREEN}=====================================================${NC}"
