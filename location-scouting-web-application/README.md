## Versions
- Node.Js: v25.0
- NPM: v11.6.2
- Next.Js: 16.0
- TailwindCSS: v4.1

## Running the server

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## References:
- https://nextjs.org/docs
- https://tailwindcss.com/docs

## QoL Features (Future)
### Implement these QoL pages using the docs.
- https://nextjs.org/docs/app/api-reference/file-conventions
### Fully Utilize Light and Dark Mode (currently only developing light)
- using `@media (prefers-color-scheme: light) { }`

## Good Resource for Next.Js backend
- https://nextjs.org/docs/app/guides/authentication#2-validate-form-fields-on-the-server

## React Resources:
- lifecycle (useEffect): https://react.dev/learn/lifecycle-of-reactive-effects
- states (useState): https://react.dev/learn/managing-state

## Optimized Fonts for Next.Js
- https://fonts.google.com/variablefonts?vfquery=roboto

Note: schemas in Next/React.Js are equivalent to DOAs (Data Objects), and they are used as such, so data objects will reside in the schemas directory.

# Project Setup

## Download AI model
- Populate *./keyword-generation/labelled_scenes/* with labels.json
- Populate *./keyword-generation/models/* with model *checkpoint-29550*

## Docker Run Information
- run *Docker Desktop GUI*
- in project :
- `docker-compose up -d`
- `docker build`
- Run container from *Docker GUI*

## Object storage (Garage)
Photos are stored in [Garage](https://garagehq.deuxfleurs.fr/), an S3-compatible object store, run by the `garage`
service in `docker-compose.yml` (config: `garage/garage.toml`). It replaces MinIO.
- Copy the `OBJECT_STORE_*` and `GARAGE_RPC_SECRET` lines from `.env.example` into `.env`. On its first start Garage
  creates the access key and bucket named there.
- The bucket is private. The database stores each photo's object key, and the server hands clients a presigned URL
  that expires after `PHOTO_URL_TTL_SECONDS` (an hour by default). The server refuses to start if the storage settings
  are missing or invalid.
- Presigned URLs only work from the host they were signed for, `OBJECT_STORE_PUBLIC_ENDPOINT`. To view photos from a
  phone or emulator, set it to an address the device can reach (e.g. your machine's LAN IP).
- Garage won't start if `OBJECT_STORE_SECRET_ACCESS_KEY` changes after its first start. Reset its data to pick up new
  values: `docker compose rm -sf garage && docker volume rm location-scouting-web-application_garage_data`
  (`docker volume ls` shows the exact name).
- Coming from MinIO: no files carry over, so existing photo rows point at nothing. Reset the dev database
  (`npx prisma migrate reset`) or delete those locations, and remove the old container and volume
  (`docker rm -f location-scouting-minio`, then the volume ending in `_minio_data`).

## Prisma Setup
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx prisma deploy`
- `npm run test:db:push`

# rebuild database (after a pull)
- `npm run migrate:all`

# Running automated tests
- `npx vitest run`
