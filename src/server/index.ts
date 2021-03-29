import fastify from "fastify"
import fastifyCookie from "fastify-cookie"

import * as fs from "fs"
import * as path from "path"

import "make-promises-safe"
import { request } from "node:http"

const server = fastify({
    logger: true
})

// TODO: Properly set a secret here as an option once we get settings implemented.
server.register(fastifyCookie)

server.get("/", (request, reply) => {
    const fileStream = fs.createReadStream("index.html", "utf8")
    reply.header("Content-Type", "text/html")
    reply.send(fileStream)
})

server.get("/bundle.js", (request, reply) => {
    const fileStream = fs.createReadStream("bundle.js", "utf8")
    reply.header("Content-Type", "application/javascript")
    reply.send(fileStream)
})

server.listen(3000).catch(err => {
    server.log.error(err)
    process.exit(1)
})