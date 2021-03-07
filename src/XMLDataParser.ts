/** Contains types to help build streaming parsers from XML data. */

import { CloseTagHandler, CommonOptions, OpenTagHandler, SaxesAttributeNS, SaxesOptions, SaxesParser, SaxesTag, SaxesTagNS, TextHandler } from "saxes"

export type EmitObjectConstructor<T, EmitObject> = (data: T, attributes: Map<string, SaxesAttributeNS>) => EmitObject

/**
 * Exception type for when an unexpected opentag is encountered while parsing.
 */
export class UnexpectedXMLTagError implements Error {
    name = "UnexpectedXMLTagError"
    message: string

    constructor(unexpectedTag: SaxesTag, whileParsing?: SaxesTag | string, additionalMessage?: string) {
        if (whileParsing) {
            const whileParsingTagName = typeof whileParsing === "string" ? whileParsing : whileParsing.name
            this.message = `Unexpected XML tag while parsing ${whileParsingTagName}: <${unexpectedTag.name}> ${additionalMessage}`
        } else {
            this.message = `Unexpected XML tag: <${unexpectedTag.name}> ${additionalMessage}`
        }
    }
}

export class InvalidXMLCloseTagError implements Error {
    name = "InvalidXMLCloseTagError"
    message: string

    constructor(closeTag: SaxesTag, additionalMessage?: string) {
        this.message = `Invalid close tag: <\\${closeTag.name}> ${additionalMessage}`
    }
}

/**
 * Exception type for when an XML tag is expected but is missing.
 */
export class MissingXMLTagError implements Error {
    name = "MissingXMLTagError"
    message: string

    constructor(message: string) {
        this.message = message
    }
}

/**
 * Class returned by parser states to signify a new state or an object to emitted to the stream.
 * @template TagType The specific SaxesTag type.
 * @template EmitObject The object type that will be emitted to the stream.
 */
export class StateTransition<EmitObject> {
    public newState: BaseParserState<EmitObject>
    public emitObject?: EmitObject

    constructor(newState: BaseParserState<EmitObject>, emitObject?: EmitObject) {
        this.newState = newState
        this.emitObject = emitObject
    }
}

/**
 * Defines an that can be fed data directly from its children.
 */
export interface Collector<T> {
    /**
     * Called by the child to give data back to to parent.
     * @param data;
     */
    onFeed(data: T): void;
}

export interface BaseParserStateConstructor<EmitObject> {
    new (openTag: SaxesTagNS, parent?: BaseParserState<EmitObject>): BaseParserState<EmitObject>;
}

/**
 * Base class for ParserState objects.
 */
export abstract class BaseParserState<EmitObject> {
    /** The XML tag that that started this parser state. */
    protected openTag: SaxesTagNS;

    /** A map of attributes from openTag. This exists to provide the convienced of the Map object methods instead of using plain objects. */
    protected readonly attributes: Map<string, SaxesAttributeNS>;

    /** The parser state to return to after this state is finished. */
    protected parent?: BaseParserState<EmitObject>;

    constructor(openTag: SaxesTagNS, parent?: BaseParserState<EmitObject>) {
        this.openTag = openTag
        this.parent = parent

        this.attributes = new Map<string, SaxesAttributeNS>(Object.keys(openTag.attributes).map(key => [key, openTag.attributes[key]]))
    }

    /**
     * Called by the parser controller on an opentag event.
     * Can return a StateTransition object to emit an object and switch state.
     **/
    onOpenTag(tag: SaxesTagNS): StateTransition<EmitObject> | void {}

    /**
     * Called by the parser controller on a closetag event.
     * Can return a StateTransition object to emit an object and switch state.
     **/
    onText(text: string): StateTransition<EmitObject> | void {}

    /**
     * Called by the parser controller on a closetag event.
     * Can return a StateTransition object to emit an object and switch state.
     */
    abstract onCloseTag(tag: SaxesTagNS): StateTransition<EmitObject> | void
}

/**
 * Defines a parser state that parses text within a tag to emit it to the stream.
 */
export class TextParserState<EmitObject> extends BaseParserState<EmitObject> {
    protected text: string
    protected emitObjectTextConstructor: EmitObjectConstructor<string, EmitObject>

    constructor(openTag: SaxesTagNS, emitObjectTextConstructor: EmitObjectConstructor<string, EmitObject>, parent: BaseParserState<EmitObject>) {
        super(openTag, parent)
        this.emitObjectTextConstructor = emitObjectTextConstructor
        this.text = ""
    }

    onText(text: string): StateTransition<EmitObject> | void {
        this.text = this.text.concat(text)
    }

    onCloseTag(tag: SaxesTagNS): StateTransition<EmitObject> | void {
        if (this.parent) {
            return new StateTransition(this.parent, this.emitObjectTextConstructor(this.text, this.attributes))
        }
    }
}

/**
 * Similar to TextParserState, but feeds text to a collector instead of emitting it.
 */
export class ReturnTextParserState<EmitObject> extends BaseParserState<EmitObject> {
    protected collector: Collector<string>
    protected text: string

    constructor(openTag: SaxesTagNS, collector: Collector<string>, parent: BaseParserState<EmitObject>) {
        super(openTag, parent)
        this.collector = collector
        this.text = ""
    }

    onText(text: string): StateTransition<EmitObject> | void {
        this.text = this.text.concat(text)
    }

    onCloseTag(tag: SaxesTagNS): StateTransition<EmitObject> | void {
        this.collector.onFeed(this.text)
    }
}

export abstract class XMLParserController<EmitObject, O extends SaxesOptions & {xmlns: true; fragment: true} = {xmlns: true; fragment: true}> {
    /** The SAX parser. */
    protected parser: SaxesParser<O>;

    /**
     * If true, the controller is in a preinit state. If false the controller has started parsing.
     * 
     * Once this is set to false. It is expected that state has a value and the openTag event handler on the parser is set to saxOpenTagHandler
     **/
    private _preinitState: boolean;

    /**
     * Constructs the first state once the first tag has been encountered.
     */
    protected initialStateConstructor: BaseParserStateConstructor<EmitObject>

    /** The current parser state. */
    protected state?: BaseParserState<EmitObject>;

    protected emitDataHandler?: (data: EmitObject) => void
    protected errorHandler?: (error: Error) => void

    constructor(parserOptions: O, initalStateConstuctor: BaseParserStateConstructor<EmitObject>) {
        this.parser = new SaxesParser<O>(parserOptions)
        this.initialStateConstructor = initalStateConstuctor
        this._preinitState = true

        this.parser.on("error", this.saxErrorHandler)
        this.parser.on("opentag", this.saxPreInitOpenTagHandler)
    }

    /**
     * Set a handler for the emit event. This is called whenever the parser needs to emit data to the stream.
     */
    set onEmit(handler: (data: EmitObject) => void) {
        this.emitDataHandler = handler
    }

    /**
     * Set a handler for the error event. This is called whenever the parser throws an error.
     */
    set onError(handler: (error: Error) => void) {
        this.errorHandler = handler
    }

    /**
     * Tests if the controller has encountered the first tag and has started parsing.
     */
    get preInitState() {
        return this._preinitState
    }

    /**
     * Feeds a chunk of data to the parser.
     */
    feed(chunk: string | {} | null) {
        this.parser.write(chunk)
    }

    /**
     * Handler for error events from the sax parser.
     */
    protected saxErrorHandler(error: Error) {
        if (this.errorHandler) {
            this.errorHandler(error)
        }
    }

    /**
     * Handler for openTag Events from the sax parser.
     */
    protected saxOpenTagHandler(tag: SaxesTagNS) {
        if (this.state) {
            this.handleStateTransition(this.state.onOpenTag(tag))
        }
    }

    /**
     * Handler for text events from the sax parser.
     */
    protected saxTextHandler(text: string) {
        if (this.state) {
            this.handleStateTransition(this.state.onText(text))
        }
    }

    /**
     * Handler for close tag events from the sax parser.
     */
    protected saxCloseTagHandler(tag: SaxesTagNS) {
        if (this.state) {
            this.handleStateTransition(this.state.onCloseTag(tag))
        }
    }

    /**
     * Tests if the tag encountered is the first tag.
     */
    protected abstract isFirstTag(tag: SaxesTagNS): boolean

    /**
     * Handles the return values of ParserState events.
     * @param stateTransition A StateTransition object or nothing, indicating that nothing should be done.
     */
    protected handleStateTransition(stateTransition: StateTransition<EmitObject> | void) {
        if (stateTransition) {
            this.state = stateTransition.newState
            if (stateTransition.emitObject && this.emitDataHandler) {
                this.emitDataHandler(stateTransition.emitObject)
            }
        }
    }

    private saxPreInitOpenTagHandler(tag: SaxesTagNS) {
        if (this.isFirstTag(tag)) {
            this._preinitState = false

            this.state = new this.initialStateConstructor(tag)

            this.parser.off("opentag")
            this.parser.on("opentag", this.saxOpenTagHandler)
            this.parser.on("text", this.saxTextHandler)
            this.parser.on("closetag", this.saxCloseTagHandler)
        }
    }
}

export class SimpleXMLParserController<EmitObject> extends XMLParserController<EmitObject> {
    public readonly firstTag: string

    constructor(firstTag: string, initalStateConstuctor: BaseParserStateConstructor<EmitObject>) {
        super({xmlns: true, fragment: true}, initalStateConstuctor)
        this.firstTag = firstTag
    }

    isFirstTag(tag: SaxesTagNS): boolean {
        return tag.name === this.firstTag
    }
}