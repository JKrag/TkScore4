<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Catalog } from './scoring/types'
import {
  newCatalog, saveToStorage, loadFromStorage, downloadCatalog,
} from './catalog/index'
import TabShowInfo from './components/TabShowInfo.vue'
import TabRings from './components/TabRings.vue'
import TabFinals from './components/TabFinals.vue'
import TabReport from './components/TabReport.vue'
import TabEntries from './components/TabEntries.vue'

const TABS = ['Show Info', 'Rings', 'Finals', 'Report', 'Entries'] as const
type Tab = typeof TABS[number]

const catalog = ref<Catalog | null>(null)
const activeTab = ref<Tab>('Show Info')
const fileInput = ref<HTMLInputElement | null>(null)
const currentFilename = ref<string | null>(null)

// ── Persistence ───────────────────────────────────────────────────────────────

onMounted(() => {
  const saved = loadFromStorage()
  if (saved) catalog.value = saved
})

watch(catalog, (val) => {
  if (val) saveToStorage(val)
}, { deep: true })

// ── File operations ───────────────────────────────────────────────────────────

function doNew() {
  if (catalog.value) {
    if (!confirm('Start a new show? Unsaved changes will be lost.')) return
  }
  catalog.value = newCatalog()
  currentFilename.value = null
}

function doOpen() {
  fileInput.value?.click()
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      catalog.value = JSON.parse(ev.target!.result as string) as Catalog
      currentFilename.value = file.name
    } catch {
      alert('Could not read file — make sure it is a TkScore4 JSON catalog.')
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

function doSave() {
  if (!catalog.value) return
  downloadCatalog(catalog.value, currentFilename.value ?? undefined)
}

function doSaveAs() {
  if (!catalog.value) return
  downloadCatalog(catalog.value)
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

function handleKey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key === 's') {
    e.preventDefault()
    e.shiftKey ? doSaveAs() : doSave()
  } else if (e.key === 'o') {
    e.preventDefault()
    doOpen()
  }
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <header class="app-header">
    <span class="app-title">TkScore4</span>
    <span v-if="catalog" class="app-filename">
      {{ catalog.club || 'New Show' }}
      <template v-if="catalog.date"> — {{ catalog.date }}</template>
    </span>
    <div class="toolbar">
      <button class="btn" @click="doNew">New</button>
      <button class="btn" @click="doOpen">Open…</button>
      <button class="btn" :disabled="!catalog" @click="doSave">Save</button>
      <button class="btn" :disabled="!catalog" @click="doSaveAs">Save As…</button>
    </div>
  </header>

  <nav class="tab-bar">
    <button
      v-for="tab in TABS"
      :key="tab"
      class="tab-btn"
      :class="{ active: activeTab === tab }"
      :disabled="!catalog"
      @click="activeTab = tab"
    >{{ tab }}</button>
  </nav>

  <main class="tab-content">
    <template v-if="catalog">
      <TabShowInfo v-if="activeTab === 'Show Info'" :catalog="catalog" />
      <TabRings    v-if="activeTab === 'Rings'"     :catalog="catalog" />
      <TabFinals   v-if="activeTab === 'Finals'"    :catalog="catalog" />
      <TabReport   v-if="activeTab === 'Report'"    :catalog="catalog" />
      <TabEntries  v-if="activeTab === 'Entries'"   :catalog="catalog" />
    </template>

    <div v-else class="empty-state">
      <div class="empty-state-title">No show loaded</div>
      <div class="empty-state-sub">Create a new show or open an existing catalog to get started.</div>
      <div class="empty-state-actions">
        <button class="btn btn-primary" @click="doNew">New Show</button>
        <button class="btn" @click="doOpen">Open Catalog…</button>
      </div>
    </div>
  </main>

  <!-- Hidden file input for Open dialog -->
  <input
    ref="fileInput"
    type="file"
    accept=".json"
    style="display:none"
    @change="onFileSelected"
  />
</template>
