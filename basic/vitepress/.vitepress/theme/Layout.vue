<script setup>
import DefaultTheme from 'vitepress/theme'
import ShareButton from './components/ShareButton.vue'
import ShareFab from './components/ShareFab.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-after>
      <ShareButton />
      <ShareFab />
    </template>
  </Layout>
</template>
