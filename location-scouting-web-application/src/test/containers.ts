import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { execSync } from 'node:child_process'

let pg: StartedPostgreSqlContainer
let minio: StartedTestContainer

const reuse = process.env.TESTCONTAINERS_REUSE === 'true'

export default async function setup() {
    const pgBuilder = new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('location_scouting_test')
        .withUsername('postgres')
        .withPassword('postgres')

    const minioBuilder = new GenericContainer('minio/minio')
        .withCommand(['server', '/data'])
        .withEnvironment({
            MINIO_ROOT_USER: 'minioadmin',
            MINIO_ROOT_PASSWORD: 'minioadmin',
        })
        .withExposedPorts(9000)
        .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))

    ;[pg, minio] = await Promise.all([
        (reuse ? pgBuilder.withReuse() : pgBuilder).start(),
        (reuse ? minioBuilder.withReuse() : minioBuilder).start(),
    ])

    const databaseUrl = `${pg.getConnectionUri()}?schema=public`

    process.env.DATABASE_URL = databaseUrl
    process.env.TEST_DATABASE_URL = databaseUrl
    process.env.MINIO_ENDPOINT = minio.getHost()
    process.env.MINIO_PORT = String(minio.getMappedPort(9000))
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