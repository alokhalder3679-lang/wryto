# Inkline — Text-first social app UI

## Overview

Build a polished, mobile-first interface for writers with eight connected screens, a distraction-free reading experience, and responsive desktop layouts. This is a front-end prototype: account actions and social interactions will work in the interface with local state, without a hosted account or database service.

## Experience

- Brand the app as **Inkline**, with a restrained editorial identity inspired by Medium and text-first social feeds.
- Use a warm paper-like light theme and an ink-rich dark theme, with a persistent theme switch.
- Pair a literary serif for post content and display moments with a clean sans-serif for navigation and controls.
- Keep cards softly rounded with light borders and restrained shadows; use motion only for transitions and immediate feedback.
- Ensure all layouts prioritize readable line length, generous spacing, strong contrast, and comfortable touch targets.

## Screens and navigation

1. **Splash** — brief branded opening with a subtle wordmark reveal, then entry into authentication.
2. **Login / Signup** — email flows, Google option, mode switching, and clear validation states.
3. **Home Feed** — chronological text-only posts, topic filtering, reactions, comments, following, and a floating create control.
4. **Create Post** — focused editor with title, rich-text controls, topic tags, character guidance, draft state, and publishing confirmation.
5. **Post Detail** — full reading view, reactions, author follow action, and threaded-looking comment list with comment composer.
6. **Profile** — writer bio, follower metrics, follow/edit action, post tabs, and authored text posts.
7. **Search & Discover** — search field, topic chips, suggested writers, and matching posts.
8. **Notifications** — grouped social activity with read/unread treatment and filters.

## Shared components

- Responsive app shell with bottom navigation on phones and compact side navigation on larger screens.
- Reusable post card, author row, reaction controls, follow button, hashtag chip, empty state, and floating create button.
- Route-specific page titles and sharing descriptions for every screen.

## Interactions

- Like/unlike posts with count updates and lightweight animation.
- Follow/unfollow writers across feed and profile views.
- Search and topic filtering over sample content.
- Compose, format, tag, and publish a post into the local feed.
- Add comments in the post detail view.
- Mark notifications as read and switch notification filters.
- Persist theme and prototype content locally in the browser.

## Validation

- Check desktop and mobile layouts in the running preview.
- Verify navigation, theme switching, creation, reactions, search, comments, and notification states.
- Confirm text never clips or overlaps and all pages remain readable in both themes.
