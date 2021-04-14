import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fastifyPlugin from "fastify-plugin"

async function authPluginCallback(fastify: FastifyInstance, options: FastifyPluginOptions) {
}

export const authPlugin = fastifyPlugin(authPluginCallback)