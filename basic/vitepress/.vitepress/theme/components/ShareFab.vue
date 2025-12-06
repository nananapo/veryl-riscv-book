<script setup lang="ts">
import { useData } from 'vitepress'
import { ref } from 'vue'

const { page } = useData()
const isOpen = ref(false)
const copied = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

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
  <div class="fab-container">
    <div class="fab-actions" :class="{ open: isOpen }">
      <button @click="shareTwitter" class="fab-action twitter" title="Share on Twitter">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
      </button>
      <button @click="shareFacebook" class="fab-action facebook" title="Share on Facebook">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
      </button>
      <button @click="copyLink" class="fab-action copy" title="Copy Link">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 6v16h-16v-16h16zm2-2h-20v20h20v-20zm-24 17v-21h21v2h-19v19h-2z"/></svg>
        <span v-if="copied" class="tooltip">Copied!</span>
      </button>
    </div>
    <button @click="toggle" class="fab-main" :class="{ open: isOpen }">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
    </button>
  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s;
}

.fab-main.open {
  transform: rotate(45deg);
}

.fab-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
  transition: all 0.3s;
}

.fab-actions.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.fab-action {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  color: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.twitter { background-color: #1da1f2; }
.facebook { background-color: #1877f2; }
.copy { background-color: #666; }

.icon {
  fill: currentColor;
  width: 24px;
  height: 24px;
}

.fab-action .icon {
  width: 20px;
  height: 20px;
}

.tooltip {
  position: absolute;
  right: 50px;
  background-color: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}
</style>
