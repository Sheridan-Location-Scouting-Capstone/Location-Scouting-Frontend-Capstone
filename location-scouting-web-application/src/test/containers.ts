import 'dotenv/config'
import path from 'node:path'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { execSync } from 'node:child_process'

let pg: StartedPostgreSqlContainer
let minio: StartedTestContainer
let externalMocks: StartedTestContainer | undefined

const reuse = process.env.TESTCONTAINERS_REUSE === 'true'

// Fixed host ports so the connection strings are knowable before anything starts.
// This is what lets the Playwright webServer and the test process agree on a DB.
const PG_HOST_PORT = 15432
const MINIO_HOST_PORT = 19000
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

export async function startContainers() {
    const pgBuilder = new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('location_scouting_test')
        .withUsername('postgres')
        .withPassword('postgres')
        .withExposedPorts({ container: 5432, host: PG_HOST_PORT })

    const minioBuilder = new GenericContainer('minio/minio')
        .withCommand(['server', '/data'])
        .withEnvironment({
            MINIO_ROOT_USER: 'minioadmin',
            MINIO_ROOT_PASSWORD: 'minioadmin',
        })
        .withExposedPorts({ container: 9000, host: MINIO_HOST_PORT })
        .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))

    const mocksBuilder = new GenericContainer('wiremock/wiremock:3.13.1')
        .withCopyDirectoriesToContainer([{ source: path.join(__dirname, '../../mocks/wiremock'), target: '/home/wiremock' }])
        .withCommand(['--disable-banner'])
        .withExposedPorts({ container: 8080, host: EXTERNAL_MOCKS_HOST_PORT })
        .withWaitStrategy(Wait.forHttp('/__admin/health', 8080))

    ;[pg, minio, externalMocks] = await Promise.all([
        (reuse ? pgBuilder.withReuse() : pgBuilder).start(),
        (reuse ? minioBuilder.withReuse() : minioBuilder).start(),
        externalServiceMocksEnabled() ? (reuse ? mocksBuilder.withReuse() : mocksBuilder).start() : undefined,
    ])

    const databaseUrl =
        `postgresql://postgres:postgres@localhost:${PG_HOST_PORT}/location_scouting_test?schema=public`

    process.env.DATABASE_URL = databaseUrl
    process.env.TEST_DATABASE_URL = databaseUrl
    process.env.MINIO_ENDPOINT = 'localhost'
    process.env.MINIO_PORT = String(MINIO_HOST_PORT)
    process.env.MINIO_ACCESS_KEY = 'minioadmin'
    process.env.MINIO_SECRET_KEY = 'minioadmin'
    process.env.MINIO_TEST_BUCKET = 'location-photos-test'
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
        await Promise.all([minio.stop(), pg.stop(), externalMocks?.stop()])
    }
}

export default startContainers
