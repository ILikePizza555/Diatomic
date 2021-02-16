<template>
    <main>
        <feed-item
            v-for="feedItem in feedItems"
            :key="feedItem.id"
            :heading="feedItem.heading"
            :summary="feedItem.summary">
        </feed-item>
    </main>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import FeedItem from "@/components/FeedItem.vue"
import { FeedItemModel } from "@/feeds/FeedModels"

export default defineComponent({
    name: "App",
    props: {
        feedItems: Array as PropType<FeedItemModel[]>
    },
    components: {
        FeedItem
    }
})
</script>
