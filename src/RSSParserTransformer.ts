import { Transformer } from "web-streams-polyfill/ponyfill"
import { SaxesTagNS } from "saxes"
import { BaseParserState, Collector, GroupParserState, ParserStateFactoryRequiredParent, ReturnTextParserState, SimpleXMLParserController, StateTransition, TextParserState } from "./XMLDataParser"
import { SyndicationDTO, ItemData } from "./SyndicationDTO"

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
        ["ttl",             TextParserState.parserStateFactory<SyndicationDTO>((text) => ({ ttl: parseInt(text) }))],
        ["item",            (openTag, parent) => new ItemElementState(openTag, parent)]
    ])
    return new GroupParserState(tag, transitionTable, parent)
}

class ItemElementState extends BaseParserState<SyndicationDTO> {
    private _collector = new ItemCollector()

    onOpenTag(tag: SaxesTagNS): StateTransition<SyndicationDTO> | void {
        if (tag.name === "enclosure") {
            return this.createEnclosureStateTransition(tag)
        }

        if (tag.name === "source") {
            return this.createSourceStateTransition(tag)
        }

        return new StateTransition(new ReturnTextParserState<ItemData>(tag, this, this._collector, (text) => {
            return { [tag.name]: text }
        }))
    }

    onCloseTag() {
        if (this.parent) {
            return new StateTransition(this.parent, this._collector.itemData)
        }
    }

    private createEnclosureStateTransition(tag: SaxesTagNS): StateTransition<ItemData> {
        const newState = new ReturnTextParserState<ItemData>(tag, this, this._collector, (_, attr) => {
            const url = assertExists(attr.get("url")?.value, "attr.get('url')")
            const length = assertExists(attr.get("length")?.value, "attr.get('length')")
            const type = assertExists(attr.get("type")?.value, "attr.get('type')")

            return { enclosure: { url: url, length: parseInt(length), type: type } }
        })

        return new StateTransition(newState)
    }

    private createSourceStateTransition(tag: SaxesTagNS): StateTransition<ItemData> {
        const newState = new ReturnTextParserState<ItemData>(tag, this, this._collector, (_, attr) => {
            const url = assertExists(attr.get("url")?.value, "attr.get('url')")
            const name = assertExists(attr.get("name")?.value, "attr.get('name')")

            return { source: { url: url, name: name } }
        })

        return new StateTransition(newState)
    }
}

class ItemCollector implements Collector<ItemData> {
    itemData: ItemData = {}

    onFeed(data: ItemData) {
        this.itemData = { ...this.itemData, ...data }
    }
}

export class RSSParserTransformer implements Transformer<string, SyndicationDTO> {
    private parserController = new SimpleXMLParserController("rss", buildInitialState)

    start(controller: TransformStreamDefaultController<SyndicationDTO>) {
        this.parserController.onError = controller.error
        this.parserController.onEmit = controller.enqueue
    }

    transform(chunk: string, controller: TransformStreamDefaultController<SyndicationDTO>) {
        this.parserController.feed(chunk)
    }
}
