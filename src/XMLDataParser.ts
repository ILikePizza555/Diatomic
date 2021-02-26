/** Contains types to help build streaming parsers from XML data. */
import { State } from "fp-ts/lib/State"
import { SaxesTag } from "saxes"

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

export interface XMLParseEventHandlers<TagType extends SaxesTag, EmitObject> {
    opentagHandler?: (tag: TagType) => StateTransition<TagType, EmitObject> | void;
    textHandler?: (text: string) => StateTransition<TagType, EmitObject> | void;
    closetagHandler?: (tag: TagType) => StateTransition<TagType, EmitObject> | void;
}

/**
 * Class returned by parser states to signify a new state or an object to emitted to the stream.
 * @template TagType The specific SaxesTag type.
 * @template EmitObject The object type that will be emitted to the stream.
 */
export class StateTransition<TagType extends SaxesTag, EmitObject> {
    public newState: XMLParseEventHandlers<TagType, EmitObject>
    public emitObject?: EmitObject

    constructor(newState: XMLParseEventHandlers<TagType, EmitObject>, emitObject?: EmitObject) {
        this.newState = newState
        this.emitObject = emitObject
    }
}

export abstract class AbstractTextTagParserState<TagType extends SaxesTag, EmitObject> implements XMLParseEventHandlers<TagType, EmitObject> {
    /** The previous state to return too once this state is completed */
    protected returnState: XMLParseEventHandlers<TagType, EmitObject>
    /** The name of the tag currently being parsed. (Or the name of the closing tag we are listening for.) */
    protected tagName: string
    /** The text that was gathered from the XML parser. */
    protected text: string

    constructor(tagName: string, returnState: XMLParseEventHandlers<TagType, EmitObject>) {
        this.tagName = tagName
        this.returnState = returnState
        this.text = ""
    }

    opentagHandler(tag: TagType): never {
        throw new UnexpectedXMLTagError(tag, this.tagName)
    }

    textHandler(text: string): void {
        this.text += text
    }

    closetagHandler(tag: TagType): StateTransition<TagType, EmitObject> {
        // The only time we get an unexpected closing tag is if we have malformed XML because of the opentag check.
        // Therefore we don't need to check here.
        return new StateTransition(this.returnState, this.emitObject())
    }

    /** Returns a new instance of EmitObject to be emitted to the stream. */
    protected abstract emitObject(): EmitObject
}

/**
 * Implementation of AbstractTextTagParserState that allows the user to pass a function to construct an instance of EmitObject
 */
export class SimpleTextParserState<TagType extends SaxesTag, EmitObject> extends AbstractTextTagParserState<TagType, EmitObject> {
    protected emitObjectConstructor: (text: string) => EmitObject

    constructor(tagName: string, returnState: XMLParseEventHandlers<TagType, EmitObject>, emitObjectConstructor: (text: string) => EmitObject) {
        super(tagName, returnState)
        this.emitObjectConstructor = emitObjectConstructor
    }

    emitObject(): EmitObject {
        return this.emitObjectConstructor(this.text)
    }
}

export enum UnexpectedTagBehavior {
    Ignore,
    Error,
    Parse
}

export abstract class AbstractGroupTagParserState<TagType extends SaxesTag, EmitObject> implements XMLParseEventHandlers<TagType, EmitObject> {
    /** The name of the tag to start parsing. Other encountered tags follow the behavior of unexpectedTagBehavior. */
    protected tagName: string

    /** A flag to track if we encountered the open tag defined by tagName. */
    protected beginParse: boolean

    protected unexpectedTagBehavior: UnexpectedTagBehavior

    constructor(tagName: string, unexpectedTagBehavior: UnexpectedTagBehavior = UnexpectedTagBehavior.Ignore) {
        this.tagName = tagName
        this.unexpectedTagBehavior = unexpectedTagBehavior
        this.beginParse = false
    }

    opentagHandler(tag: TagType): StateTransition<TagType, EmitObject> | void {
        if (!this.beginParse) {
            return this.handleOpenTagBeforeBegin(tag)
        }
    }

    closetagHandler(tag: TagType): StateTransition<TagType, EmitObject> {
        if (tag.name !== this.tagName) {
            throw new InvalidXMLCloseTagError(tag, "Did you forget to handle a close tag in a previous state?")
        }

        return this.transitionFinishedState()
    }

    /**
     * Handles the opentag event before the main tag has been encountered.
     */
    protected handleOpenTagBeforeBegin(tag: TagType): StateTransition<TagType, EmitObject> {
        if (tag.name === this.tagName) {
            this.beginParse = true
            return new StateTransition(this)
        }

        return this.handleUnexpectedTag(tag)
    }

    /**
     * Handles the opentag event after the main tag has been encountered (i.e once parsing has begun).
     */
    protected handleOpenTagAfterBegin(tag: TagType): StateTransition<TagType, EmitObject> {
        if (this.isAllowedTag(tag)) {
            return this.transitionExpectedTag(tag)
        }

        return this.handleUnexpectedTag(tag)
    }

    /**
     * Returns true if the tag is one of the tags that this parser state is interested in.
     * @param tag The tag to check.
     */
    protected abstract isAllowedTag(tag: TagType): boolean

    /**
     * If unexpectedTagBehavior is set to Parse then this method is called to construct the appropriate StateTransition object.
     * @param tag The tag that was encountered.
     */
    protected abstract transitionUnexpectedTag(tag: TagType): StateTransition<TagType, EmitObject>

    /**
     * Called to transition the state when a tag defined by isAllowedTag is encountered.
     * @param tag The tag that was encountered.
     */
    protected abstract transitionExpectedTag(tag: TagType): StateTransition<TagType, EmitObject>

    /**
     * Called to transition out of this state when the close tag has been encountered.
     */
    protected abstract transitionFinishedState(): StateTransition<TagType, EmitObject>

    private handleUnexpectedTag(tag: TagType): StateTransition<TagType, EmitObject> {
        switch (this.unexpectedTagBehavior) {
        case UnexpectedTagBehavior.Error:
            throw new UnexpectedXMLTagError(tag)
        case UnexpectedTagBehavior.Ignore:
            return new StateTransition(this)
        case UnexpectedTagBehavior.Parse:
            return this.transitionUnexpectedTag(tag)
        }
    }
}

export type TransitionFunction<TagType extends SaxesTag, EmitObject> = (currentState: SimpleGroupParserState<TagType, EmitObject>, tag: TagType) => StateTransition<TagType, EmitObject>

export interface StateTransitionTable<TagType extends SaxesTag, EmitObject> {
    [key: string]: TransitionFunction<TagType, EmitObject>;
}

export class SimpleGroupParserState<TagType extends SaxesTag, EmitObject> extends AbstractGroupTagParserState<TagType, EmitObject> {

    /**
     * Provides a mapping of expected tags to a function to create a state transition object for that tag.
     */
    protected stateTransitionTable: StateTransitionTable<TagType, EmitObject>

    protected unexpectedTagTransitionFunction?: TransitionFunction<TagType, EmitObject>

    protected transitionFinishedStateFunction: () => StateTransition<TagType, EmitObject>

    constructor(
        tagName: string,
        stateTransitionTable: StateTransitionTable<TagType, EmitObject>,
        unexpectedTagBehavior: UnexpectedTagBehavior = UnexpectedTagBehavior.Ignore,
        transitionFinishedStateFunction: () => StateTransition<TagType, EmitObject>,
        unexpectedTagTransitionFunction?: TransitionFunction<TagType, EmitObject>) {
        super(tagName, unexpectedTagBehavior)
        this.stateTransitionTable = stateTransitionTable
        this.transitionFinishedStateFunction = transitionFinishedStateFunction
        this.unexpectedTagTransitionFunction = unexpectedTagTransitionFunction

        if (this.unexpectedTagBehavior === UnexpectedTagBehavior.Parse && this.unexpectedTagTransitionFunction === undefined) {
            throw new Error("unexpectedTagTransitionFunction cannot be undefined if unexpectedTagBehavior is set to Parse")
        }
    }

    protected isAllowedTag(tag: TagType) {
        return tag.name in this.stateTransitionTable
    }

    protected transitionUnexpectedTag(tag: TagType): StateTransition<TagType, EmitObject> {
        if (this.unexpectedTagTransitionFunction) {
            return this.unexpectedTagTransitionFunction(this, tag)
        }
        throw new Error("transitionUnexpectedTag called without transitionUnexpectedTagTransitionFunction being set to a valid instance.")
    }

    protected transitionExpectedTag(tag: TagType): StateTransition<TagType, EmitObject> {
        return this.stateTransitionTable[tag.name](this, tag)
    }

    protected transitionFinishedState(): StateTransition<TagType, EmitObject> {
        return this.transitionFinishedStateFunction()
    }
}