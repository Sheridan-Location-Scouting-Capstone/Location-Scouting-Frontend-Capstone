-- Photos are no longer served from a public bucket URL. The bucket is private and the app mints a presigned URL
-- from the object key on every read, so only the key is stored.

-- Every row should already have its key (storageKey has been required since 20260302035913). Just in case, recover
-- any empty one from the old public URL, http://<host>:<port>/<bucket>/<key>.
UPDATE "Photo"
SET "storageKey" = regexp_replace("url", '^https?://[^/]+/[^/]+/', '')
WHERE "storageKey" = '';

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "url";
