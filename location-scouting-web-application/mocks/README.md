# External service mocks

A [WireMock](https://wiremock.org/) container that stands in for the three external HTTP services the app calls,
so the app and its tests run without API keys, network access, rate limits or Vision charges, and with predictable
results. Photos are still analyzed on upload and scenes still get keywords; the answers just come from these stubs.

## In automated tests (automatic)

The integration tests and the Playwright E2E setup start this container themselves (`src/test/containers.ts`, host
port 18089) and point all three services at it, with the Vision key blanked. That happens even if your `.env` has a
real `GOOGLE_VISION_API`, so a test run never spends Vision credits.

To deliberately run the tests against the real services in your environment, set `EXTERNAL_SERVICE_MOCKS=off` in
`.env` (Vitest), `.env.e2e` (Playwright) or the shell.

## In the running app (opt-in)

| Service | Real endpoint | Env var | Point it at |
|---|---|---|---|
| Google Vision (photo labels) | `https://vision.googleapis.com` | `GOOGLE_VISION_API_URL` | `http://localhost:8089` |
| Scene keyword generation | `http://localhost:8080/` (BERT container) | `KEYWORD_GENERATION_API_URL` | `http://localhost:8089/keywords` |
| Nominatim (geocoding) | `https://nominatim.openstreetmap.org` | `NOMINATIM_API_URL` | `http://localhost:8089` |

Each variable is independent, so you can mock one service and use the real thing for the others. Unset means
"use the real service".

### Running

```bash
docker compose --profile mocks up -d external-mocks
```

Then set the variables above in `.env` (they're in `.env.example`, commented out) and restart `npm run dev`.
`GOOGLE_VISION_API` can stay empty when Vision points at the mock.

The `mocks` profile keeps the container out of a plain `docker compose up`.

## Canned responses

The stubs live in `wiremock/mappings/`. Edit them to change what the app sees; WireMock reloads on restart
(`docker compose --profile mocks restart external-mocks`).

- **Vision** (`POST /v1/images:annotate`): labels *Building*, *Street*, *Urban area* (score ≥ 0.8) and *Sky*
  (0.62). The app keeps the top three labels scoring at least 0.8, so every upload adds
  `Building, Street, Urban area` to the location's keywords.
- **Keyword generation** (`POST /keywords`): `["house", "backyard", "interior"]` for every scene.
- **Nominatim** (`GET /search`): every address geocodes to downtown Toronto (43.6532, -79.3832).

## Simulating outages

Every service also has an `/unavailable` variant that returns `503`, for checking that the app degrades
gracefully:

```dotenv
GOOGLE_VISION_API_URL=http://localhost:8089/unavailable          # uploads succeed, no labels added
KEYWORD_GENERATION_API_URL=http://localhost:8089/unavailable/keywords  # scenes save without keywords
NOMINATIM_API_URL=http://localhost:8089/unavailable              # locations save without coordinates
```

## Inspecting requests

WireMock records every request it receives:

```bash
curl http://localhost:8089/__admin/requests
```
