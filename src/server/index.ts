import fastify from "fastify"
import fastifyCookie from "fastify-cookie"
import fastifyStatic from "fastify-static"

import * as path from "path"

import "make-promises-safe"
import { request } from "node:http"

const server = fastify({
    logger: true
})

// TODO: Properly set a secret here as an option once we get settings implemented.
server.register(fastifyCookie)

server.get("/", async (request, reply) => {
    return reply.sendFile("index.html")
})

server.get("/bundle.js", async (request, reply) => {
    return reply.sendFile("bundle.js")
})

server.listen(3000).catch(err => {
    server.log.error(err)
    process.exit(1)
})