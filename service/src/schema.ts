/**
 * This module defines classes for interacting with the database. Due to typescript limitatations and a lack of 
 * metaprogramming, many of these classes have constraints that cannot be typechecked.
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
import * as argon2 from "argon2"
import * as crypto from "node:crypto"

const nameof = <T>(name: Extract<keyof T, string>): string => name

type Nullable<T> = T | null
export class UserModel {
    static readonly TableName = "users"

    user_id: string
    username: string
    email: string
    password: string
    salt: string
    created_at: Date
    updated_at: Date

    constructor(user_id: string,
                username: string,
                email: string,
                password: string,
                salt: string,
                created_at: Date,
                updated_at: Date) {
        this.user_id = user_id
        this.username = username
        this.email = email
        this.password = password
        this.salt = salt
        this.created_at = created_at
        this.updated_at = updated_at
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

    async createNewUser(username: string, email: string, password: string) {
        const passwordSalt = crypto.randomBytes(128).toString("hex")
        const passwordHash = await argon2.hash(password + passwordSalt)
        const model = new UserModel(uuid.v4(), username, email, passwordHash, passwordSalt, new Date(), new Date())

        await this._db(UserModel.TableName).insert(model)
        return model
    }

    async queryUser(identifier: string): UserModel | null {
        const result = await this._db(UserModel.TableName)
            .where(nameof<UserModel>("username"), identifier)
            .orWhere(nameof<UserModel>("email"), identifier)
            .limit(1)
            .first()
        
        if (!result) {
            return null
        }

        return this.createModelFromQueryResult(result)
    }

    protected createModelFromQueryResult(result: any) {
        return new UserModel(
            result[nameof<UserModel>("user_id")],
            result[nameof<UserModel>("username")],
            result[nameof<UserModel>("email")],
            result[nameof<UserModel>("password")],
            result[nameof<UserModel>("salt")],
            result[nameof<UserModel>("created_at")],
            result[nameof<UserModel>("updated_at")]
        )
    }
}

export class FeedModel {
    static readonly TableName = "feeds"

    feed_id: string
    title: string
    feed_url: URL
    home_page_url: Nullable<URL>
    description: Nullable<string>
    icon_url: Nullable<URL>
    favicon_url: Nullable<URL>
    created_at: Date
    updated_at: Date

    constructor (feed_id: string,
                 title: string,
                 feed_url: URL,
                 home_page_url: URL | null = null,
                 description: string | null = null,
                 icon_url: URL | null = null,
                 favicon_url: URL | null = null,
                 created_at: Date = new Date(),
                 updated_at: Date = new Date(),) {
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
        this.updated_at = updated_at
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
    content: string
    content_type: "text" | "html"
    url: Nullable<URL>
    title: Nullable<string>
    summary: Nullable<string>
    content_published: Nullable<Date>
    content_updated: Nullable<Date>
    created_at: Date
    updated_at: Date

    constructor(feeditem_id: string,
                feed_id: string,
                content: string,
                content_type: "text" | "html" = "text",
                url: Nullable<URL> = null,
                title: Nullable<string> = null,
                summary: Nullable<string> = null,
                content_published: Nullable<Date> = null,
                content_updated: Nullable<Date> = null,
                created_at: Date = new Date(),
                updated_at: Date = new Date()) {
        this.feeditem_id = feeditem_id
        this.feed_id = feed_id
        this.content = content
        this.content_type = content_type
        this.url = url
        this.title = title
        this.summary = summary
        this.content_published = content_published
        this.content_updated = content_updated
        this.created_at = created_at
        this.updated_at = updated_at
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
                    .notNullable()
                    .references(nameof<FeedModel>("feed_id"))
                    .inTable(FeedModel.TableName)
                table.text(nameof<FeedItemModel>("content"))
                table.enu(nameof<FeedItemModel>("content_type"), ["text", "html"])
                table.text(nameof<FeedItemModel>("url"))
                table.text(nameof<FeedItemModel>("title"))
                table.text(nameof<FeedItemModel>("summary"))
                table.dateTime(nameof<FeedItemModel>("content_published"))
                table.dateTime(nameof<FeedItemModel>("content_updated"))
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
    updated_at: Date

    constructor(user_id_fk: string, feed_id_fk: string, created_at: Date, updated_at: Date) {
        this.user_id_fk = user_id_fk
        this.feed_id_fk = feed_id_fk
        this.created_at = created_at
        this.updated_at = updated_at
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

export class RepositoryDepot {
    user: UserRepository
    feed: FeedRepository
    feedItem: FeedItemRepository
    subscription: SubscriptionRepository

    static FromDatabase(db: Knex) {
        return new RepositoryDepot(
            new UserRepository(db),
            new FeedRepository(db),
            new FeedItemRepository(db),
            new SubscriptionRepository(db)
        )
    }

    constructor(userRepository: UserRepository,
                feedRepository: FeedRepository,
                feedItemRepository: FeedItemRepository,
                subscriptionRepository: SubscriptionRepository) {
        this.user = userRepository
        this.feed = feedRepository
        this.feedItem = feedItemRepository
        this.subscription = subscriptionRepository
    }

    async setupSchemas() {
        await this.user.createTableInSchema()
        await this.feed.createTableInSchema()
        await this.feedItem.createTableInSchema()
        await this.subscription.createTableInSchema()
    }
}