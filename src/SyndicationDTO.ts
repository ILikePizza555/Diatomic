/** Defines DTOs (Data Transfer Objects) to use for parser results. */

/** Data describing a feed itself. */
export interface FeedData {
    title: string;
    link: string;
    description: string;
    language: string;
    copyright: string;
    managingEditor: string;
    webMaster: string;
    pubDate: Date;
    lastBuildDate: Date;
    category: string;
    generator: string;
    cloud: string;
    ttl: number;
}

export interface ItemData {
    title: string;
    link: string;
    description: string;
    author: string;
    category: string;
    comments: string;
    enclosure: {url: string; length: number; type: MimeType};
    guid: string;
    pubDate: Date;
    source: {url: string; name: string};
}

export type SyndicationDTO = FeedData | ItemData
