# Inkline production backend

## Goal

Replace the prototype’s browser-only social state with a secure Lovable Cloud backend while preserving the existing text-first interface.

## Build

- Enable email/password and managed Google sign-in, with confirmed-session handling and sign-out.
- Create profiles, posts, likes, comments, followers, and notifications with timestamps, ownership, uniqueness rules, and feed-oriented indexes.
- Add strict row-level access rules: public reading for profiles/posts/comments and owner-only changes; signed-in-only likes, follows, notifications, and profile-image writes.
- Automatically create a profile at signup and generate notifications for likes, comments, and follows without notifying users about their own actions.
- Enable live updates for posts, comments, likes, and notifications.
- Create a profile-image-only storage area with image MIME and size restrictions; posts remain text-only by schema.
- Replace local sample state with database reads and mutations, live subscriptions, loading/error states, and signed-in user context.
- Protect authoring and notifications behind authentication while keeping reading, discovery, post detail, and public profiles shareable.

## Technical details

- Use database constraints for duplicate likes/follows and bounded text fields.
- Use indexed cursor-friendly ordering by `created_at` and IDs for feed/comment loading.
- Keep authorization enforced in database policies, not only hidden in the interface.
- Use generated database types after migration and validate the finished schema with the database linter and security scan.

## Validation

- Verify public feed/profile reading, email authentication, post creation, likes, comments, follows, notifications, sign-out, and live updates where a test session is available.
- Confirm anonymous writes fail and users cannot alter another user’s records.
