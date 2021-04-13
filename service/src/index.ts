import { Knex, knex } from "knex"
import { fastify } from "fastify"
import { RepositoryDepot } from "./schema"
import { createFastifyInstance } from "./fastifyApp"
interface AppConfig {
    debug: boolean
}

async function setup(config: AppConfig) {
    const db = knex({
        client: "sqlite3",
        connection: {
            filename: "db.sqlite"
        },
        debug: config.debug
    })

    const repositories = RepositoryDepot.FromDatabase(db)
    await repositories.setupSchemas()

    return createFastifyInstance(repositories)
}

setup({debug: true})
    .then(fastifyApp => fastifyApp.listen(3000))
    .catch(console.error)