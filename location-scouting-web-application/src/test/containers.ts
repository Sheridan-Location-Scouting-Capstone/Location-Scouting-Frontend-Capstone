import 'dotenv/config'
import path from 'node:path'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { execSync } from 'node:child_process'

let pg: StartedPostgreSqlContainer
let garage: StartedTestContainer
let externalMocks: StartedTestContainer | undefined

const reuse = process.env.TESTCONTAINERS_REUSE === 'true'

// Fixed host ports so the connection strings are knowable before anything starts.
// This is what lets the Playwright webServer and the test process agree on a DB.
const PG_HOST_PORT = 15432
const GARAGE_HOST_PORT = 13900
export const EXTERNAL_MOCKS_HOST_PORT = 18089
export const EXTERNAL_MOCKS_URL = `http://localhost:${EXTERNAL_MOCKS_HOST_PORT}`

/**
 * Tests use the WireMock stubs in mocks/wiremock instead of Google Vision, the keyword-generation service and
 * Nominatim, so a test run never spends Vision credits or depends on the network. Set EXTERNAL_SERVICE_MOCKS=off
 * (in .env, .env.e2e or the shell) to run against the real services configured in your environment instead.
 */
export function externalServiceMocksEnabled() {
    return process.env.EXTERNAL_SERVICE_MOCKS !== 'off'
}

/** Environment that routes the external services to the mock container, with no Vision key to leak */
export function externalServiceMockEnv() {
    return {
        GOOGLE_VISION_API: '',
        GOOGLE_VISION_API_URL: EXTERNAL_MOCKS_URL,
        KEYWORD_GENERATION_API_URL: `${EXTERNAL_MOCKS_URL}/keywords`,
        NOMINATIM_API_URL: EXTERNAL_MOCKS_URL,
    }
}

/**
 * Object storage settings for the Garage test container. Garage creates this key and bucket when it starts, and the
 * app and the tests both reach it on localhost, so the internal and public endpoints are the same.
 */
export function objectStoreTestEnv() {
    const url = `http://localhost:${GARAGE_HOST_PORT}`
    return {
        OBJECT_STORE_ENDPOINT: url,
        OBJECT_STORE_PUBLIC_ENDPOINT: url,
        OBJECT_STORE_REGION: 'garage',
        OBJECT_STORE_BUCKET: 'location-photos-test',
        OBJECT_STORE_ACCESS_KEY_ID: 'GKtestaccesskey',
        OBJECT_STORE_SECRET_ACCESS_KEY: 'test-secret-key-not-for-production',
    }
}

export async function startContainers() {
    const pgBuilder = new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('location_scouting_test')
        .withUsername('postgres')
        .withPassword('postgres')
        .withExposedPorts({ container: 5432, host: PG_HOST_PORT })

    const storage = objectStoreTestEnv()
    const garageBuilder = new GenericContainer('dxflrs/garage:v2.4.1')
        .withCopyFilesToContainer([{ source: path.join(__dirname, '../../garage/garage.toml'), target: '/etc/garage.toml' }])
        .withEnvironment({
            GARAGE_RPC_SECRET: 'a'.repeat(64),
            GARAGE_DEFAULT_ACCESS_KEY: storage.OBJECT_STORE_ACCESS_KEY_ID,
            GARAGE_DEFAULT_SECRET_KEY: storage.OBJECT_STORE_SECRET_ACCESS_KEY,
            GARAGE_DEFAULT_BUCKET: storage.OBJECT_STORE_BUCKET,
        })
        .withCommand(['/garage', 'server', '--single-node', '--default-bucket'])
        .withExposedPorts({ container: 3900, host: GARAGE_HOST_PORT }, 3903)
        // The key and bucket already exist by the time the admin API reports healthy
        .withWaitStrategy(Wait.forHttp('/health', 3903))

    const mocksBuilder = new GenericContainer('wiremock/wiremock:3.13.1')
        .withCopyDirectoriesToContainer([{ source: path.join(__dirname, '../../mocks/wiremock'), target: '/home/wiremock' }])
        .withCommand(['--disable-banner'])
        .withExposedPorts({ container: 8080, host: EXTERNAL_MOCKS_HOST_PORT })
        .withWaitStrategy(Wait.forHttp('/__admin/health', 8080))

    ;[pg, garage, externalMocks] = await Promise.all([
        (reuse ? pgBuilder.withReuse() : pgBuilder).start(),
        (reuse ? garageBuilder.withReuse() : garageBuilder).start(),
        externalServiceMocksEnabled() ? (reuse ? mocksBuilder.withReuse() : mocksBuilder).start() : undefined,
    ])

    const databaseUrl =
        `postgresql://postgres:postgres@localhost:${PG_HOST_PORT}/location_scouting_test?schema=public`

    process.env.DATABASE_URL = databaseUrl
    process.env.TEST_DATABASE_URL = databaseUrl
    // Set before the test workers start, so the .env values they load can't replace them
    Object.assign(process.env, storage)
    if (externalMocks) {
        // Set before the test workers start, so the .env values they load can't replace them
        Object.assign(process.env, externalServiceMockEnv())
    }

    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
    })

    return async () => {
        if (reuse) return
        await Promise.all([garage.stop(), pg.stop(), externalMocks?.stop()])
    }
}

export default startContainers
