/**
 * =============================================================================
 * post.model.ts — Domain model for JSONPlaceholder "posts"
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   A typed contract for the Post resource. With it, `post.title` autocompletes
 *   and `post.titel` is a COMPILE error. Models are the "nouns" of the domain;
 *   services (repositories) are the "verbs" that act on them.
 *
 * DESIGN NOTE — separate create vs read types:
 *   The server ASSIGNS the `id` on create, so a NEW post must NOT carry one.
 *   `NewPost` (no id) for writes, `Post` (with id) for reads. This prevents the
 *   classic bug of sending a client-chosen id the server will ignore or reject.
 * =============================================================================
 */

/** A persisted post as returned by the API (server-assigned `id`). */
export interface Post {
  readonly id: number; // server-assigned identifier
  readonly userId: number; // id of the authoring user
  readonly title: string;
  readonly body: string;
}

/** Payload for CREATING a post — no `id` (the server generates it). */
export interface NewPost {
  readonly userId: number; // author the new post belongs to
  readonly title: string;
  readonly body: string;
}
