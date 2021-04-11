import { Knex, knex } from "knex"
import { Url } from "node:url"
import * as uuid from "uuid"

export const UserTable = Object.freeze({
    name: "users",
    columnNames: Object.freeze({
        id: "user_id",
        username: "username",
        email: "email",
        password: "password",
        salt: "salt"
    }),
    buildTable: function(table: Knex.CreateTableBuilder) {
        table.uuid(this.columnNames.id).unique().primary()
        table.string(this.columnNames.username)
        table.string(this.columnNames.email)
        table.string(this.columnNames.password)
        table.string(this.columnNames.salt)
        table.timestamps()
    }
})

export const FeedTable = Object.freeze({
    name: "feeds",
    columnNames: Object.freeze({
        id: "feed_id",
        title: "title",
        url: "feed_url",
        homePageURL: "home_page_url",
        description: "description",
        icon: "icon_url",
        favicon: "favicon_url",
    }),
    buildTable: function(table: Knex.CreateTableBuilder) {
        table.uuid(this.columnNames.id).unique().primary()
        table.text(this.columnNames.title).notNullable()
        table.text(this.columnNames.url).notNullable()
        table.text(this.columnNames.homePageURL)
        table.text(this.columnNames.description)
        table.text(this.columnNames.icon)
        table.text(this.columnNames.favicon)
        table.timestamps()
    },
    createRow: function(title: string,
                        url: Url,
                        uuidStr: string = uuid.v4(), 
                        homePageURL?: Url,
                        description?: string,
                        iconUrl?: Url,
                        faviconUrl?: Url) {
        if (!uuid.validate(uuidStr)) {
            throw new Error(`uuidStr ("${uuidStr}") is not a valid UUID.`)
        }

        return {
            [this.columnNames.id]: uuidStr,
            [this.columnNames.title]: title,
            [this.columnNames.url]: url.href,
            [this.columnNames.homePageURL]: homePageURL?.href,
            [this.columnNames.description]: description,
            [this.columnNames.icon]: iconUrl?.href,
            [this.columnNames.favicon]: faviconUrl?.href
        }
    }
})

export const FeedItemTable = Object.freeze({
    name: "feed_items",
    columnNames: Object.freeze({
        id: "item_id",
        feedFk: "feed_id",
        feedJson: "item_json",
    }),
    buildTable: function(table: Knex.CreateTableBuilder) {
        table.uuid(this.columnNames.id).unique().primary()
        table.uuid(this.columnNames.feedFk).references(FeedTable.columnNames.id).inTable(FeedTable.name)
        table.json(this.columnNames.feedJson)
        table.timestamps()
    }
})

export const SubscriptionTable = Object.freeze({
    name: "subscriptions",
    columnNames: Object.freeze({
        userIdFK: "user_id",
        feedIdFK: "feed_id"
    }),
    buildTable: function(table: Knex.CreateTableBuilder) {
        table.comment("Models the user to feed relationship.")
        table.uuid(this.columnNames.userIdFK)
             .unique()
             .references(UserTable.columnNames.id)
             .inTable(UserTable.name)
        table.uuid(this.columnNames.feedIdFK)
             .unique()
             .references(FeedTable.columnNames.id)
             .inTable(FeedTable.name)
        table.timestamps()
    }
})

export function CreateSchema(knex: Knex) {
    return knex.schema
        .createTableIfNotExists(UserTable.name, UserTable.buildTable)
        .createTableIfNotExists(FeedTable.name, FeedTable.buildTable)
        .createTableIfNotExists(FeedItemTable.name, FeedItemTable.buildTable)
        .createTableIfNotExists(SubscriptionTable.name, SubscriptionTable.buildTable)
}