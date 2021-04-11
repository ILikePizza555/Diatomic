import { Knex } from "knex"

export const UserTableName = "users"
export const FeedTableName = "feeds"
export const FeedItemTableName = "feed_items"
export const SubscriptionTableName = "subscriptions"

const UserColumnId = "user_id"
const UserColumnUsername = "username"
const UserColumnEmail = "email"
const UserColumnPassword = "password"
const UserColumnSalt = "salt"

const FeedColumnId = "feed_id"
const FeedColumnTitle = "title"
const FeedColumnUrl = "feed_url"
const FeedColumnHomePageURL = "home_page_url"
const FeedColumnDescription = "description"
const FeedColumnIcon = "icon_url"
const FeedColumnFavicon = "favicon_url"

const FeedItemColumnId = "item_id"
const FeedItemColumnFK = "feed_id"
const FeedItemColumnJson = "item_json"

const SubscriptionColumnUserIdFK = "user_id"
const SubscriptionColumnFeedIdFK = "feed_id"

export function CreateSchema(knex: Knex) {
    return knex.schema
        .createTable(UserTableName, table => {
            table.uuid(UserColumnId).unique().primary()
            table.string(UserColumnUsername)
            table.string(UserColumnEmail)
            table.string(UserColumnPassword)
            table.string(UserColumnSalt)
            table.timestamps()
        })
        .createTable(FeedTableName, table => {
            table.uuid(FeedColumnId).unique().primary()
            table.text(FeedColumnTitle).notNullable()
            table.text(FeedColumnUrl).notNullable()
            table.text(FeedColumnHomePageURL)
            table.text(FeedColumnDescription)
            table.text(FeedColumnIcon)
            table.text(FeedColumnFavicon)
            table.timestamps()
        })
        .createTable(FeedItemTableName, table => {
            table.uuid(FeedItemColumnId).unique().primary()
            table.uuid(FeedItemColumnFK).references(FeedColumnId).inTable(FeedTableName)
            table.json(FeedItemColumnJson)
            table.timestamps()
        })
        .createTable(SubscriptionTableName, table => {
            table.comment("Models the user to feed relationship.")
            table.uuid(SubscriptionColumnUserIdFK).unique().references(UserColumnId).inTable(UserTableName)
            table.uuid(SubscriptionColumnFeedIdFK).unique().references(FeedColumnId).inTable(FeedTableName)
        })
}