import { Transformer } from "web-streams-polyfill/ponyfill"
import { SaxesParser, SaxesTagNS } from "saxes"
import { AbstractGroupTagParserState, MissingXMLTagError, SimpleTextParserState, StateTransition, XMLParseEventHandlers } from "./XMLDataParser"

/** Union types of the objects emitted by the parser. */
type FeedObject = {channel: ChannelData}

interface ChannelData {
    title?: string;
    link?: string;
    description?: string;
    language?: string;
    copyright?: string;
    managingEditor?: string;
    webMaster?: string;
    pubDate?: Date;
    lastBuildDate?: Date;
    category?: string;
    generator?: string;
    cloud?: string;
    ttl?: number;
}

function isChannelDataKey(testString: string): testString is keyof ChannelData {
    return /title|link|description|language|copyright|managingEditor|webMaster|pubDate|lastBuildDate|category|generator|cloud|ttl/.test(testString)
}

function createChannelDataFeedObject<K extends keyof ChannelData, T extends Required<ChannelData>[K]>(key: K, value: T): { channel: ChannelData } {
    return {
        channel: {
            [key]: value
        }
    }
}

/**
 * Verifies that the first tag of a feed is valid for the RSS standard.
 */
class RootElementState implements XMLParseEventHandlers<SaxesTagNS, FeedObject> {
    public readonly stateName = "root"

    opentagHandler(tag: SaxesTagNS): StateTransition<SaxesTagNS, FeedObject> {
        if (tag.name !== "rss") {
            throw new MissingXMLTagError(`Feed does not begin with tag named "rss", instead got "${tag.name}"`)
        }

        return new StateTransition(new ChannelElementState())
    }
}

/**
 * Parser state that parses the channel tag.
 */
class ChannelElementState extends AbstractGroupTagParserState<SaxesTagNS, FeedObject> {
    public readonly stateName = "channel"

    constructor() {
        super("channel")
    }

    protected isAllowedTag(tag: SaxesTagNS): boolean {
        return isChannelDataKey(tag.name)
    }

    // We can add the additional type constraint here because isAllowedTag checks for this already.
    protected transitionExpectedTag(tag: SaxesTagNS & {name: keyof ChannelData}): StateTransition<SaxesTagNS, FeedObject> {
        if (tag.name === "ttl") {
            const tagName = tag.name
            return new StateTransition(new SimpleTextParserState(tag.name, this, t => createChannelDataFeedObject(tagName, parseInt(t))))
        }

        if (tag.name === "lastBuildDate" || tag.name === "pubDate") {
            const tagName = tag.name
            const nextState = new SimpleTextParserState(tag.name, this, t => createChannelDataFeedObject(tagName, new Date(t)))
            return new StateTransition(nextState)
        }

        const tagName = tag.name
        return new StateTransition(new SimpleTextParserState(tag.name, this, t => createChannelDataFeedObject(tagName, t)))
    }

    protected transitionFinishedState(): StateTransition<SaxesTagNS, FeedObject> {
        // Return to a new RootElementState, effectively resetting the parser.
        return new StateTransition(new RootElementState())
    }
}

export class RSSParserTransformer implements Transformer<string, FeedObject> {
    private _parser = new SaxesParser({ xmlns: true, fragments: true });

    private _error?: Error;

    private state: XMLParseEventHandlers<SaxesTagNS, FeedObject> = new RootElementState();

    start(controller: TransformStreamDefaultController<FeedObject>) {
        // Setup callbacks
        this._parser.on("error", err => {
            this._error = err
            controller.error(err)
        })

        this._parser.on("opentag", tag => {
            if (this.state.opentagHandler) {
                const handlerResult = this.state.opentagHandler(tag)
                this.handleStateTransition(controller, handlerResult)
            }
        })

        this._parser.on("closetag", tag => {
            if (this.state.closetagHandler) {
                const handlerResult = this.state.closetagHandler(tag)
                this.handleStateTransition(controller, handlerResult)
            }
        })

        this._parser.on("text", text => {
            if (this.state.textHandler) {
                const handlerResult = this.state.textHandler(text)
                this.handleStateTransition(controller, handlerResult)
            }
        })
    }

    transform(chunk: string, controller: TransformStreamDefaultController<FeedObject>) {
        this._parser.write(chunk)
    }

    private handleStateTransition(controller: TransformStreamDefaultController<FeedObject>, stateTransition: StateTransition<SaxesTagNS, FeedObject> | void) {
        if (stateTransition) {
            this.state = stateTransition.newState

            if (stateTransition.emitObject) {
                controller.enqueue(stateTransition.emitObject)
            }
        }
    }
}