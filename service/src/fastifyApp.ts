/**
 * This module contains a method to setup fastify, and exports an appropriate type definition.
 */

import { fastify, FastifyInstance, FastifyLoggerInstance } from "fastify"
import { IncomingMessage, Server, ServerResponse } from "node:http"
import { RepositoryDepot } from "./schema"

export type DiatomicFastifyInstance =
    FastifyInstance<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance> &
    { 
        repositories: RepositoryDepot
    }

export function createFastifyInstance(repositoryDepot: RepositoryDepot): DiatomicFastifyInstance {
    var fastifyApp = fastify({
        logger: true
    })

    fastifyApp.decorate("repositories", repositoryDepot)

    return (fastifyApp as unknown) as DiatomicFastifyInstance
}