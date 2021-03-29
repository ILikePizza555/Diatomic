import fastify from "fastify"
import "make-promises-safe"

const server = fastify({
    logger: true
})

server.get("/", async (request, reply) => {
    return "Hello World!"
})

server.listen(3000).catch(err => {
    server.log.error(err)
    process.exit(1)
})