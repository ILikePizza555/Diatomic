import fastify from "fastify"
import fastifyCookie from "fastify-cookie"
import "make-promises-safe"

const server = fastify({
    logger: true
})

// TODO: Properly set a secret here as an option once we get settings implemented.
server.register(fastifyCookie)

server.get("/", async (request, reply) => {
    return "Hello World!"
})

server.listen(3000).catch(err => {
    server.log.error(err)
    process.exit(1)
})