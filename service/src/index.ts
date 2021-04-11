import { knex } from "knex"
import * as RssParser from "rss-parser"
import * as uuid from "uuid"
import { CreateSchema, FeedItemTable, FeedTable } from "./schema"

const db = knex({
    client: "sqlite3",
    connection: {
        filename: "db.sqlite"
    },
    debug: true
})

CreateSchema(db)
    .then(() => {
        let parser = new RssParser()
        return parser.parseURL("https://www.reddit.com/.rss")
    })
    .then(async feed => {
        const feedUuid = uuid.v4()
        await db
            .insert(
                FeedTable.createRow(
                    "Reddit",
                    new URL(feed.feedUrl || "https://www.reddit.com/.rss"),
                    feed.description,
                    undefined,
                    undefined,
                    undefined,
                    feedUuid))
            .into(FeedTable.name)
        
        for (const feedItem of feed.items) {
            await db.insert(FeedItemTable.createRow(feedUuid, feedItem)).into(FeedItemTable.name)
        }
    })
    .catch(err => console.error)
    .finally(() => console.log("done"))