import { Transformer } from "web-streams-polyfill/ponyfill"
import { SaxesTagNS } from "saxes"
import { BaseParserState, GroupParserState, ParserStateFactoryRequiredParent, SimpleXMLParserController, StateTransition, TextParserState } from "./XMLDataParser"
import { FeedData, SyndicationDTO } from "./SyndicationDTO"

function buildInitialState(tag: SaxesTagNS, parent?: BaseParserState<SyndicationDTO>) {
    const transitionTable = new Map([["channel", buildChannelElementState]])
    return new GroupParserState(tag, transitionTable, parent)
}

function buildChannelElementState(tag: SaxesTagNS, parent?: BaseParserState<SyndicationDTO>) {
    /* eslint no-multi-spaces: "off" */
    const transitionTable = new Map<string, ParserStateFactoryRequiredParent<SyndicationDTO>>([
        ["title",           TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ title: text }))],
        ["link",            TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ link: text }))],
        ["description",     TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ description: text }))],
        ["language",        TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ language: text }))],
        ["copyright",       TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ copyright: text }))],
        ["category",        TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ category: text }))],
        ["pubDate",         TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ pubDate: new Date(text) }))],
        ["lastBuildDate",   TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ lastBuildDate: new Date(text) }))],
        ["ttl",             TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ ttl: parseInt(text) }))]
    ])
    return new GroupParserState(tag, transitionTable, parent)
}

/**
 * Parser state that parses the channel tag.
 */
class ChannelElementState extends BaseParserState<SyndicationDTO> {
    protected isAllowedTag(tag: SaxesTagNS): boolean {
        return isChannelDataKey(tag.name) || tag.name === "item"
    }

    // We can add the additional type constraint here because isAllowedTag checks for this already.
    protected transitionExpectedTag(tag: SaxesTagNS & { name: keyof ChannelData | "item" } ): StateTransition<SaxesTagNS, FeedObject> {
        if (tag.name === "item") {
            
        }
        
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

class ItemElementState extends AbstractGroupTagParserState<SaxesTagNS, FeedObject> {
    public readonly stateName = "item"

    private previousState: ChannelElementState
    private itemData: ItemData = {}

    constructor(previousState: ChannelElementState) {
        super("item")
        this.beginParse = true
        this.previousState = previousState
    }

    protected isAllowedTag(tag: SaxesTagNS): boolean {
        return isItemDataKey(tag.name)
    }

    protected transitionExpectedTag(tag: SaxesTagNS & { name: keyof ItemData}): StateTransition<SaxesTagNS, FeedObject> {
        
    }

    protected transitionFinishedState(): StateTransition<SaxesTagNS, FeedObject> {
        return new StateTransition(this.previousState, {item: this.itemData})
    }
}

export class RSSParserTransformer implements Transformer<string, FeedObject> {
    private controller = new SimpleXMLParserController("rss", )

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