import { Knex, knex } from "knex"
import { RepositoryDepot } from "./schema"
import { fastify } from "fastify"

interface AppConfig {
    debug: boolean
}

function createFastifyInstance(repositoryDepot: RepositoryDepot): FastifyInstance {
    var fastifyApp = fastify({
        logger: true
    })

    fastifyApp.decorate("repositories", repositoryDepot)

    return fastifyApp
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