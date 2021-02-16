/* Types that generalize web feeds */

export interface FeedItemModel {
    heading: string;
    subheading: string;
    id: string;
    url: string;
    date: Date;
    summary: string;
}