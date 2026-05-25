<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Catalog } from '../scoring/types'
import {
  allEntryNumbers, isInFinals,
  setEntryName, setEntryBreed, addEntry, removeEntry,
} from '../catalog/index'

const props = defineProps<{ catalog: Catalog }>()

// ── Sorted entry list ─────────────────────────────────────────────────────────

const rows = computed(() =>
  allEntryNumbers(props.catalog).map(num => ({
    num,
    entry: props.catalog.entries[num] ?? { name: '', breed: '' },
    inFinals: isInFinals(props.catalog, num),
  }))
)

// ── Add-entry form ────────────────────────────────────────────────────────────

const addOpen = ref(false)
const addNum = ref('')
const addName = ref('')
const addBreed = ref('')
const addNumInput = ref<HTMLInputElement | null>(null)

function openAdd() {
  addOpen.value = true
  addNum.value = ''
  addName.value = ''
  addBreed.value = ''
  // focus the entry number field on next tick
  setTimeout(() => addNumInput.value?.focus(), 0)
}

function commitAdd() {
  const n = addNum.value.trim()
  if (!n) return
  addEntry(props.catalog, n)
  if (addName.value) setEntryName(props.catalog, n, addName.value)
  if (addBreed.value) setEntryBreed(props.catalog, n, addBreed.value)
  addOpen.value = false
}

function cancelAdd() {
  addOpen.value = false
}

// ── Delete ────────────────────────────────────────────────────────────────────

function doDelete(num: string, inFinals: boolean) {
  if (inFinals && !confirm(`Entry #${num} is referenced in finals. Delete name/breed anyway?`)) return
  removeEntry(props.catalog, num)
}
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="entries-toolbar">
      <span class="entries-count">
        {{ rows.length }} {{ rows.length === 1 ? 'entry' : 'entries' }}
      </span>
      <button class="btn btn-primary btn-sm" :disabled="addOpen" @click="openAdd">
        + Add Entry
      </button>
    </div>

    <!-- Add-entry form -->
    <div v-if="addOpen" class="add-entry-form">
      <input
        ref="addNumInput"
        v-model="addNum"
        type="text"
        placeholder="Entry #"
        class="add-entry-num"
        @keydown.enter="commitAdd"
        @keydown.escape="cancelAdd"
      />
      <input
        v-model="addName"
        type="text"
        placeholder="Name"
        class="add-entry-name"
        @keydown.enter="commitAdd"
        @keydown.escape="cancelAdd"
      />
      <input
        v-model="addBreed"
        type="text"
        placeholder="Breed"
        class="add-entry-breed"
        @keydown.enter="commitAdd"
        @keydown.escape="cancelAdd"
      />
      <button class="btn btn-primary btn-sm" @click="commitAdd">Add</button>
      <button class="btn btn-sm" @click="cancelAdd">Cancel</button>
    </div>

    <!-- Empty state -->
    <div v-if="rows.length === 0" class="empty-state" style="min-height: 240px">
      <div class="empty-state-title">No entries yet</div>
      <div class="empty-state-sub">
        Add entries here to record cat names and breeds.<br>
        Entry numbers typed in the Finals tab appear automatically.
      </div>
      <div class="empty-state-actions">
        <button class="btn btn-primary" @click="openAdd">+ Add Entry</button>
      </div>
    </div>

    <!-- Entry table -->
    <div v-else class="entries-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 80px">Entry #</th>
            <th>Name</th>
            <th style="width: 90px">Breed</th>
            <th style="width: 32px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.num">
            <td class="entry-num-cell">
              <span class="entry-num">{{ row.num }}</span>
              <span v-if="row.inFinals" class="finals-badge" title="Referenced in finals">F</span>
            </td>
            <td>
              <input
                type="text"
                :value="row.entry.name"
                placeholder="—"
                @input="setEntryName(props.catalog, row.num, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td>
              <input
                type="text"
                :value="row.entry.breed"
                placeholder="—"
                maxlength="6"
                class="breed-input"
                @input="setEntryBreed(props.catalog, row.num, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td>
              <button
                class="btn btn-ghost btn-sm btn-danger"
                title="Remove entry"
                @click="doDelete(row.num, row.inFinals)"
              >✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="entries-hint">
        Entry numbers from the Finals tab appear automatically.
        Breed codes follow TICA abbreviations (e.g. <code>MC</code>, <code>PS</code>).
        Breed is left blank for Household Pets.
      </p>
    </div>
  </div>
</template>

<style scoped>
.entries-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.entries-count {
  font-size: 13px;
  color: var(--text);
}

.add-entry-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 8px;
}

.add-entry-num {
  width: 80px !important;
  font-family: var(--mono);
}

.add-entry-name {
  flex: 1;
  min-width: 0;
}

.add-entry-breed {
  width: 80px !important;
}

.add-entry-form input {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 13px;
  font-family: var(--sans);
}

.add-entry-form input:focus {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.entries-wrapper {
  overflow-x: auto;
}

.entry-num-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.entry-num {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text-h);
}

.finals-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  flex-shrink: 0;
}

.breed-input {
  font-family: var(--mono) !important;
}

.entries-hint {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text);
}
</style>
