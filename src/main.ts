import { createApp } from "vue"
import { FeedItemModel } from "./feeds/FeedModels"
import App from "./App.vue"


// Some urls to use for protyping/testing.
const cadeysRssFeedUrl = "https://christine.website/blog.rss"
const cadeysAtomFeedUrl = "https://christine.website/blog.atom"
const cadeysJsonFeedUrl = "https://christine.website/blog.json"
const rFurryRssFeedUrl = "https://www.reddit.com/r/furry/.rss"
const rProgRssFeedUrl = "https://www.reddit.com/r/programming/.rss"

const model = {
    feedItems: [] as Array<FeedItemModel>
}
const vm = createApp(App, model)
vm.mount("#app")
