import { Transformer } from "web-streams-polyfill/ponyfill"
import { SaxesParser, SaxesTagNS } from "saxes"
import { Either, right, left } from "fp-ts/lib/Either"

export class RSSParserError implements Error {
    name = "RSSParserError"
    message: string;

    constructor(msg: string) {
        this.message = "RSS Parsing Error: " + msg
    }
}

/** Union types of the objects emitted by the parser. */
type ParsedObject = any

interface ChannelData {
    title: string;
    link: string;
    description: string;
    language?: string;
    copyright?: string;
    managingEditor?: string;
    webMaster?: string;
    pubDate?: Date;
    lastBuildDate?: Date;
    category: string[];
    generator?: string;
    cloud?: string;
    ttl?: number;
}

function isChannelDataKey(testString: string): testString is keyof ChannelData {
    return /title|link|description|language|copyright|managingEditor|webMaster|pubDate|lastBuildDate|category|generator|cloud|ttl/.test(testString)
}

/** Union type of all parser states */
type RSSParserState = RootElementState | ChannelElementState | ItemElementState

/**
 * An object returned by parser states that defines the next state the parser should use and optionally an object to output to the stream.
 **/
class NextState {
    nextState: RSSParserState;
    streamOutput?: ParsedObject;

    constructor(nextState: RSSParserState, streamOutput?: ParsedObject) {
        this.nextState = nextState
        this.streamOutput = streamOutput
    }

    /**
     * Constructs a new NextState objects with the specified parameters and returns it as an Either.
     */
    static AsLeft<E>(nextState: RSSParserState, streamOutput?: ParsedObject): Either<NextState, E> {
        return left(new NextState(nextState, streamOutput))
    }
}

class ItemElementState {
    public readonly stateName = "item"
}

/**
 * Parser state that parses the channel tag.
 */
class ChannelElementState {
    public readonly stateName = "channel"

    private _tagData: Partial<ChannelData> = {}

    private _currentTag?: keyof ChannelData

    opentag(tag: SaxesTagNS): Either<NextState, Error> {
        if (!this._currentTag) {
            return right(new RSSParserError(`Encountered unexpected tag ${tag.name} in ${this._currentTag}`))
        }

        // Check if the tag is an item so we can change state
        if (tag.name === "item") {
            return NextState.AsLeft()
        }

        // If the tag is one of the ones we care about then start listening for text.
        if (isChannelDataKey(tag.name)) {
            this._currentTag = tag.name
            return NextState.AsLeft(this)
        }

        return NextState.AsLeft(this)
    }

    text(text: string): Error | void {
        if (!this._currentTag) {
            return new RSSParserError(`Recived unexpected text "${text}"`)
        }

        // This is typesafe only as long as _notableTags and _tagData are defined by the keys of _tagData
        // Note that no type-checking is done on Object.defineProperty
        Object.defineProperty(this._tagData, this._currentTag, text)
    }

    closetag(tag: SaxesTagNS): Either<NextState, Error> {
        if (tag.name === this._currentTag) {
            this._currentTag = undefined
            return NextState.AsLeft(this)
        }

        return right(new RSSParserError(`Encountered unexpected closing tag "${tag.name}", expected "${this._currentTag}"`))
    }
}

/**
 * Verifies that the first tag of a feed is valid for the RSS standard.
 */
class RootElementState {
    public readonly stateName = "root"

    opentag(tag: SaxesTagNS): Either<NextState, Error> {
        if (tag.name !== "rss") {
            return right(new RSSParserError(`Feed does not begin with tag named "rss", instead got "${tag.name}"`))
        }

        return NextState.AsLeft(new ChannelElementState())
    }
}

export class RSSParserTransformer implements Transformer<string, FeedDocument> {
    private _parser = new SaxesParser({ xmlns: true, fragments: true });

    private _error?: Error;

    private state: RSSParserState = new RootElementState();

    start(controller: TransformStreamDefaultController<FeedDocument>) {
        // Setup callbacks
        this._parser.on("error", err => {
            this._error = err
            controller.error(err)
        })

        this._parser.on("opentag", tag => {

        })
    }

    transform(chunk: string, controller: TransformStreamDefaultController<FeedDocument>) {

    }
}