import { RepositoryDepot } from "./schema"

declare module "fastify" {
    export interface FastifyInstance {
        repositories: RepositoryDepot;
    }
}