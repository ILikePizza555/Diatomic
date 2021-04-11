/**
 * This module defines classes for interacting with the database. Due to typescript limitatations and a lack of 
 * metaprogramming, many of these classes have invariants that cannot be typechecked.
 * 
 * The two main kinds of classes this module exposes are Models and Repositories. 
 * 
 * Models are primarily data-transfer objects. They store data in an organization and format that makes sense before writing 
 * to the database and after reading from the database. The primary constraint of a model is that a public field's name 
 * should correspond to the name of a column on a table in the database. In the future, we may relax this constraint by 
 * implementing a static`GetColumnName` method that maps a field to a column name.
 * 
 * Repositories are responsible for defining the interaction between the rest of the app and the database.
 * Read and write operations, the database schema, and any queries are defined inside of a repository.
 * Repositories are also responsible for data validation and ensuring that all constraints are met. 
 */
import { Knex } from "knex"
import * as uuid from "uuid"

const nameof = <T>(name: Extract<keyof T, string>): string => name
export class UserModel {
    static readonly TableName = "users"

    user_id: string
    username: string
    email: string
    password: string
    salt: string
    created_at: Date
    modified_at: Date

    constructor(user_id: string,
                username: string,
                email: string,
                password: string,
                salt: string,
                created_at: Date,
                modified_at: Date) {
        this.user_id = user_id
        this.username = username
        this.email = email
        this.password = password
        this.salt = salt
        this.created_at = created_at
        this.modified_at = modified_at
    }
}

export class UserRepository {
    private _db: Knex

    constructor(db: Knex) {
        this._db = db;
    }

    async createTableInSchema(schemaName?: string) {
        const schema = schemaName ? this._db.schema.withSchema(schemaName) : this._db.schema

        const tableExists = await schema.hasTable(UserModel.TableName)
        if (!tableExists) {
            await schema.createTable(UserModel.TableName, table => {
                table.uuid(nameof<UserModel>("user_id")).unique().primary()
                table.string(nameof<UserModel>("username"))
                table.string(nameof<UserModel>("email"))
                table.string(nameof<UserModel>("password"))
                table.string(nameof<UserModel>("salt"))
                table.timestamps()
            })
        }
    }
}

export class FeedModel {
    static readonly TableName = "feeds"

    feed_id: string
    title: string
    feed_url: URL
    home_page_url?: URL
    description?: string
    icon_url?: URL
    favicon_url?: URL
    created_at: Date
    modified_at: Date

    constructor (feed_id: string,
                 title: string,
                 feed_url: URL,
                 home_page_url?: URL,
                 description?: string,
                 icon_url?: URL,
                 favicon_url?: URL,
                 created_at: Date = new Date(),
                 modified_at: Date = new Date(),) {
        if (!uuid.validate(feed_id)) {
            throw new Error(`feed_id (${feed_id}) is not a valid UUID`)
        }
        
        this.feed_id = feed_id
        this.title = title
        this.feed_url = feed_url
        this.home_page_url = home_page_url
        this.description = description
        this.icon_url = icon_url
        this.favicon_url = favicon_url
        this.created_at = created_at
        this.modified_at = modified_at
    }
}
export class FeedRepository {
    private _db: Knex

    constructor(db: Knex) {
        this._db = db;
    }

    async createTableInSchema(schemaName?: string) {
        const schema = schemaName ? this._db.schema.withSchema(schemaName) : this._db.schema

        const tableExists = await schema.hasTable(FeedModel.TableName)
        if (!tableExists) {
            await schema.createTable(FeedModel.TableName, table => {
                table.uuid(nameof<FeedModel>("feed_id")).unique().primary()
                table.text(nameof<FeedModel>("title")).notNullable()
                table.text(nameof<FeedModel>("feed_url")).notNullable()
                table.text(nameof<FeedModel>("home_page_url"))
                table.text(nameof<FeedModel>("description"))
                table.text(nameof<FeedModel>("icon_url"))
                table.text(nameof<FeedModel>("favicon_url"))
                table.timestamps()
            })
        }
    }

    async insertSingle(feed: FeedModel) {
        await this._db(FeedModel.TableName).insert(feed)
    }
}

export class FeedItemModel {
    static readonly TableName = "feed_items"

    feeditem_id: string
    feed_id: string
    feeditem_json: any
    created_at: Date
    modified_at: Date

    constructor(feeditem_id: string,
                feed_id: string,
                feeditem_json: any,
                created_at: Date = new Date(),
                modified_at: Date = new Date()) {
        this.feeditem_id = feeditem_id
        this.feed_id = feed_id
        this.feeditem_json = feeditem_json
        this.created_at = created_at
        this.modified_at = modified_at
    }
}

export class FeedItemRepository {
    private _db: Knex

    constructor(db: Knex) {
        this._db = db;
    }

    async createTableInSchema(schemaName?: string) {
        const schema = schemaName ? this._db.schema.withSchema(schemaName) : this._db.schema

        const tableExists = await schema.hasTable(FeedItemModel.TableName)
        if (!tableExists) {
            await schema.createTable(FeedItemModel.TableName, table => {
                table.uuid(nameof<FeedItemModel>("feeditem_id")).unique().primary()
                table.uuid(nameof<FeedItemModel>("feed_id"))
                    .references(nameof<FeedModel>("feed_id"))
                    .inTable(FeedModel.TableName)
                table.json(nameof<FeedItemModel>("feeditem_json"))
                table.timestamps()
            })
        }
    }

    async insertSingle(feedItemModel: FeedItemModel) {
        await this._db(FeedItemModel.TableName).insert(feedItemModel)
    }

    async insertMany(feedItemModels: FeedItemModel[]) {
        await this._db(FeedItemModel.TableName).insert(feedItemModels)
    }
}

export class SubscriptionModel {
    static readonly TableName = "subscriptions"
    
    user_id_fk: string
    feed_id_fk: string
    created_at: Date
    modified_at: Date

    constructor(user_id_fk: string, feed_id_fk: string, created_at: Date, modified_at: Date) {
        this.user_id_fk = user_id_fk
        this.feed_id_fk = feed_id_fk
        this.created_at = created_at
        this.modified_at = modified_at
    }
}

export class SubscriptionRepository {
    private _db: Knex

    constructor(db: Knex) {
        this._db = db;
    }

    async createTableInSchema(schemaName?: string) {
        const schema = schemaName ? this._db.schema.withSchema(schemaName) : this._db.schema

        const tableExists = await schema.hasTable(SubscriptionModel.TableName)
        if (!tableExists) {
            await schema.createTable(SubscriptionModel.TableName, table => {
                table.comment("Models the user to feed relationship.")
                table.uuid(nameof<SubscriptionModel>("user_id_fk"))
                    .unique()
                    .references(nameof<UserModel>("user_id"))
                    .inTable(UserModel.TableName)
                table.uuid(nameof<SubscriptionModel>("feed_id_fk"))
                    .unique()
                    .references(nameof<FeedModel>("feed_id"))
                    .inTable(FeedModel.TableName)
                table.timestamps()
            })
        }
    }
}