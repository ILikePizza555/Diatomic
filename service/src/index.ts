import { knex } from "knex"
import * as RssParser from "rss-parser"
import * as uuid from "uuid"
import { FeedItemModel, FeedItemRepository, FeedModel, FeedRepository, SubscriptionRepository, UserRepository } from "./schema"

const db = knex({
    client: "sqlite3",
    connection: {
        filename: "db.sqlite"
    },
    debug: true
})

const userRepository = new UserRepository(db)
const feedRepository = new FeedRepository(db)
const feedItemRepository = new FeedItemRepository(db)
const subscriptionRepository = new SubscriptionRepository(db)

function createUrl(urlStr?: string): URL | undefined {
    if (urlStr) {
        return new URL(urlStr)
    }
}

async function setupdb() {
    await userRepository.createTableInSchema()
    await feedRepository.createTableInSchema()
    await feedItemRepository.createTableInSchema()
    await subscriptionRepository.createTableInSchema()
}

async function parse_feed() {
    const parser = new RssParser()
    const feedUrl = new URL("https://www.reddit.com/.rss")

    const feedData = await parser.parseURL(feedUrl.href)
    const newFeedRow = new FeedModel(
        uuid.v4(),
        feedData.title || "", 
        createUrl(feedData.feedUrl) || feedUrl,
        null,
        feedData.description)

    const newFeedItems = feedData.items.map(v => new FeedItemModel(
        uuid.v4(),
        newFeedRow.feed_id,
        v
    ))

    return {feed: newFeedRow, feedItems: newFeedItems}
}

setupdb()
    .then(parse_feed)
    .then(async ({feed, feedItems}) => {
        await feedRepository.insertSingle(feed)
        await feedItemRepository.insertMany(feedItems)
    })
    .catch(console.error)