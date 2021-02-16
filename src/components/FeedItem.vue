<template>
    <article>
        <header>
            <h2><a href="{{ url }}">{{ heading }}</a></h2>
            <p v-if="subheading" class="subheading">{{ subheading }}</p>
        </header>
        <p v-if="summary">{{ summary }}</p>
    </article>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "feed-item",
    props: {
        heading: String,
        subheading: String,
        url: String,
        date: Date,
        summary: String
    }
})
</script>
