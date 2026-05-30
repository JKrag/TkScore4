<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { Catalog } from './scoring/types'
import {
  newCatalog, saveToStorage, loadFromStorage, downloadCatalog, normalizeCatalog,
  hasFileSystemAccess, saveAsWithPicker, saveToHandle,
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
const fileHandle = ref<FileSystemFileHandle | null>(null)
const currentFilename = ref<string | null>(null)
const isDirty = ref(false)

const displayFilename = computed(() => fileHandle.value?.name ?? currentFilename.value)

// ── Persistence ───────────────────────────────────────────────────────────────

onMounted(() => {
  const saved = loadFromStorage()
  if (saved) { catalog.value = saved; isDirty.value = false }
})

watch(catalog, (val) => {
  if (val) { saveToStorage(val); isDirty.value = true }
}, { deep: true })

// ── File operations ───────────────────────────────────────────────────────────

function doNew() {
  if (catalog.value) {
    if (!confirm('Start a new show? Unsaved changes will be lost.')) return
  }
  catalog.value = newCatalog()
  fileHandle.value = null
  currentFilename.value = null
  isDirty.value = false
}

async function doOpen() {
  if (hasFileSystemAccess) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'TkScore4 catalog', accept: { 'application/json': ['.json'] } }],
      })
      const file = await handle.getFile()
      const text = await file.text()
      catalog.value = normalizeCatalog(JSON.parse(text) as Catalog)
      fileHandle.value = handle
      currentFilename.value = handle.name
      isDirty.value = false
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        alert('Could not read file — make sure it is a TkScore4 JSON catalog.')
      }
    }
  } else {
    fileInput.value?.click()
  }
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      catalog.value = normalizeCatalog(JSON.parse(ev.target!.result as string) as Catalog)
      fileHandle.value = null
      currentFilename.value = file.name
      isDirty.value = false
    } catch {
      alert('Could not read file — make sure it is a TkScore4 JSON catalog.')
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function doSave() {
  if (!catalog.value) return
  if (fileHandle.value) {
    try {
      await saveToHandle(fileHandle.value, catalog.value)
      isDirty.value = false
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        alert('Save failed. Try Save As to choose a new location.')
      }
    }
  } else {
    await doSaveAs()
  }
}

async function doSaveAs() {
  if (!catalog.value) return
  if (hasFileSystemAccess) {
    try {
      const handle = await saveAsWithPicker(catalog.value, displayFilename.value ?? undefined)
      fileHandle.value = handle
      currentFilename.value = handle.name
      isDirty.value = false
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        alert('Save failed.')
      }
    }
  } else {
    downloadCatalog(catalog.value, currentFilename.value ?? undefined)
  }
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
      <template v-if="displayFilename">{{ displayFilename }}</template>
      <template v-else>{{ catalog.club || 'New Show' }}<template v-if="catalog.date"> — {{ catalog.date }}</template></template>
      <span v-if="isDirty" class="dirty-indicator" title="Unsaved changes"> ●</span>
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
