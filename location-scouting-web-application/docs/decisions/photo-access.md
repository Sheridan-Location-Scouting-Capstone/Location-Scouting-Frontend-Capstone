# Photo access: how photo bytes reach a client

- **Status:** Proposed in LS-182. The owner path described here is implemented; the look book (LS-175) and edge cache
  (LS-180) parts are the direction those stories should confirm or amend.
- **Date:** 2026-09-29

## Context

Scouts photograph private homes, so a leaked or guessed URL must not expose a property's interior.

- The bucket is private (LS-226). Garage has no anonymous bucket policies, so every unsigned request is refused,
  listing the bucket included. The database stores object keys only.
- Three kinds of reader need photos:
  1. **The owner**, in the web app today and in native apps later.
  2. **An anonymous look book viewer** (LS-175): a producer with no account, usually on a phone.
  3. **A distant viewer behind an edge cache** (LS-180), where round trips to a single self-hosted origin hurt.
- Photo bytes should not flow through the application server. LS-168 moves uploads off it, and LS-175 notes that
  serving look books through the app defeats the delivery work.
- SigV4 presigned URLs last at most 7 days and cannot be revoked individually.

## Decision

**One mechanism for every reader: the app issues short-lived, per-photo read grants, and only after an authorization
check made in one place.** Who is checked, and how the grant is signed, varies by reader.

### Owner (implemented in LS-182)

- Photos are served through short-lived presigned GET URLs straight from Garage.
- `photoService.withPhotoUrls` is the only code that mints them. It checks each photo's location belongs to the
  requesting user (`Location.userId`), and signs the key it reads from the database, never one the caller passes.
- If any photo isn't the user's, the call fails with NOT_FOUND and mints nothing.
- URLs live for `PHOTO_URL_TTL_SECONDS` (default an hour). They're signed at the start of a TTL/4 window, so repeat
  page loads reuse the browser's cached image. Each photo comes with `urlExpiresAt`, so native clients know when to
  fetch the list again.
- Objects live under the owner's prefix, `users/<userId>/photos/<name>.<ext>`. The prefix organises storage and is
  where LS-168 scopes presigned uploads, but it grants nothing: access is always decided from the database.

### Anonymous look book viewer (LS-175)

- The app owns share tokens: a table row per share, with its look book, expiry and a revoked timestamp.
- The public endpoint validates the token, then mints presigned GETs for that look book's photos only. It uses a
  share-scoped sibling of `withPhotoUrls` in `photoService`, whose check is "this photo is in this look book" rather
  than "this user owns it".
- Each URL reaches exactly one object, so a look book's URLs cannot be used to reach anything else in the owner's
  library.
- Revoking a share stops new URLs at once, and URLs already issued die within their TTL. Keep that TTL short for
  anonymous viewers (tens of minutes).

### Edge cache (LS-180)

- Presigned S3 URLs are cache-hostile at a shared edge: the signature is in the URL, so every re-issue is a cache
  miss. The edge must instead validate a grant and cache by object key.
- The proposal is to keep the same issuing point and change the signature it produces. The issuer mints URLs (or
  cookies) the edge can verify: CDN signed URLs or cookies, or an app HMAC over key plus expiry checked by an edge
  worker.
- The edge validates the grant, drops it from the cache key, serves the cached object, and fetches from Garage with
  its own credentials on a miss. Grants remain per-photo and short-lived, issued after the same checks.
- Keys are never reused (a new key per upload), so objects are immutable and can be cached for a long time.
- Stored objects currently say `Cache-Control: private, …`, which shared caches won't store. LS-180 needs an
  edge-side cache rule that overrides it.
- Revoked or deleted photos need a purge by key.

## Alternatives considered

- **An authenticated proxy route**, e.g. `/api/photos/:id`, either streaming the bytes or redirecting to a fresh
  presigned URL.
  - Gains: stable URLs, instant revocation, and an authorization check on every request.
  - Costs: every image request hits Next.js and the database. Streaming pushes all photo bandwidth through the app
    server, and redirecting adds a round trip per image, which is worst for phones and distant viewers.
  - Not chosen. Worth revisiting only if owner URLs must be revocable instantly.
- **A public bucket or Garage website mode:** anything leaked or guessed is exposed forever. Rejected.
- **Long-lived presigned URLs per share:** capped at 7 days and not revocable, so a leak is exposed until expiry.
  Rejected in favour of tokens that mint short-lived URLs.

## Consequences

- **Leaked owner URLs:** one reaches one photo, for at most TTL + TTL/4 (75 minutes at the defaults). Individual
  URLs can't be revoked; rotating the storage credentials revokes all of them.
- **Cost:** reading photos costs one extra indexed query per request, for the ownership check.
- **New read paths:** a new way to read photos means a new issuer beside `withPhotoUrls`, not a direct call to
  `ObjectStore.presignGet`.
- **Existing objects:** objects stored before LS-182 are moved into their owners' prefixes by
  `npm run storage:migrate-photo-keys` (see the README).
