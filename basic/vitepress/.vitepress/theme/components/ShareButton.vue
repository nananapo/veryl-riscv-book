<script setup lang="ts">
import { useData } from 'vitepress'
import { ref } from 'vue'

const { page } = useData()
const copied = ref(false)

function shareTwitter() {
  const url = window.location.href
  const text = page.value.title
  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
}

function shareFacebook() {
  const url = window.location.href
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
}

async function copyLink() {
  const url = window.location.href
  const text = page.value.title
  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
</script>

<template>
  <div class="share-container">
    <button @click="shareTwitter" class="share-button twitter" title="Share on Twitter">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
      <span>Twitter</span>
    </button>
    <button @click="shareFacebook" class="share-button facebook" title="Share on Facebook">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
      <span>Facebook</span>
    </button>
    <button @click="copyLink" class="share-button copy" title="Copy Link">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 6v16h-16v-16h16zm2-2h-20v20h20v-20zm-24 17v-21h21v2h-19v19h-2z"/></svg>
      <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
    </button>
  </div>
</template>

<style scoped>
.share-container {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.share-button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: opacity 0.2s;
}
.share-button:hover {
  opacity: 0.9;
}
.twitter { background-color: #1da1f2; }
.facebook { background-color: #1877f2; }
.copy { background-color: #666; }
.icon {
  fill: white;
  width: 18px;
  height: 18px;
}
</style>
