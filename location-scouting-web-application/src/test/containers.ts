import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { execSync } from 'node:child_process'

let pg: StartedPostgreSqlContainer
let minio: StartedTestContainer

const reuse = process.env.TESTCONTAINERS_REUSE === 'true'

// Fixed host ports so the connection strings are knowable before anything starts.
// This is what lets the Playwright webServer and the test process agree on a DB.
const PG_HOST_PORT = 15432
const MINIO_HOST_PORT = 19000

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

    ;[pg, minio] = await Promise.all([
        (reuse ? pgBuilder.withReuse() : pgBuilder).start(),
        (reuse ? minioBuilder.withReuse() : minioBuilder).start(),
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

    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
    })

    return async () => {
        if (reuse) return
        await Promise.all([minio.stop(), pg.stop()])
    }
}

export default startContainers