import { Knex, knex } from "knex"

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
        .createTable(UserTable.name, UserTable.buildTable)
        .createTable(FeedTable.name, FeedTable.buildTable)
        .createTable(FeedItemTable.name, FeedItemTable.buildTable)
        .createTable(SubscriptionTable.name, SubscriptionTable.buildTable)
}