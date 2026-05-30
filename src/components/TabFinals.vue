<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Catalog } from '../scoring/types'
import {
  finalsKeysFor, setPlacement, setCount, ensureFinalsSlot,
  activeClassesForShow, CLASS_LABEL,
} from '../catalog/index'

const props = defineProps<{ catalog: Catalog }>()

const tableRef = ref<HTMLTableElement | null>(null)

const activeShowIdx = ref(0)
const activeClass = ref('')

// Recompute active class when show or rings change
const currentShow = computed(() => props.catalog.shows[activeShowIdx.value])

const activeClasses = computed(() => {
  const show = currentShow.value
  if (!show) return []
  return activeClassesForShow(show)
})

const currentClass = computed(() => {
  if (activeClass.value && activeClasses.value.includes(activeClass.value)) {
    return activeClass.value
  }
  return activeClasses.value[0] ?? ''
})

function selectShow(idx: number) {
  activeShowIdx.value = idx
}

// Build column descriptors for the current show + class
const columns = computed(() => {
  const show = currentShow.value
  const cls = currentClass.value
  if (!show || !cls) return []
  return show.rings.flatMap((ring, ringIdx) => {
    const keys = finalsKeysFor(ring, cls)
    return keys.map(key => ({ ring, ringIdx, key, lhsh: keys.length === 2 ? (key.startsWith('LH') ? 'LH' : 'SH') : null }))
  })
})

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function getCount(col: typeof columns.value[0]): string {
  ensureFinalsSlot(col.ring, col.key)
  const v = col.ring.finals[col.key].count
  return v == null ? '' : String(v)
}

function getRank(col: typeof columns.value[0], slot: number): string {
  ensureFinalsSlot(col.ring, col.key)
  const v = col.ring.finals[col.key].rank[slot - 1]
  return v == null ? '' : String(v)
}

function onCountInput(col: typeof columns.value[0], raw: string) {
  setCount(col.ring, col.key, raw)
}

function onPlacementInput(col: typeof columns.value[0], slot: number, raw: string) {
  setPlacement(col.ring, col.key, slot - 1, raw)
}

function onNav(e: KeyboardEvent, col: number, row: number) {
  const isForward = (e.key === 'Tab' && !e.shiftKey) || (e.key === 'Enter' && !e.shiftKey)
  const isBack    = (e.key === 'Tab' && e.shiftKey)  || (e.key === 'Enter' && e.shiftKey)
  if (!isForward && !isBack) return

  e.preventDefault()

  const numCols = columns.value.length
  const MAX_ROW = 10

  let nextCol = col
  let nextRow = row + (isForward ? 1 : -1)

  if (nextRow > MAX_ROW) {
    nextRow = 1
    nextCol = (col + 1) % numCols
  } else if (nextRow < 0) {
    nextRow = MAX_ROW
    nextCol = (col - 1 + numCols) % numCols
  }

  const target = tableRef.value?.querySelector<HTMLInputElement>(
    `input[data-col="${nextCol}"][data-row="${nextRow}"]`
  )
  target?.focus()
  target?.select()
}
</script>

<template>
  <div>
    <!-- Show selector -->
    <div v-if="props.catalog.shows.length > 1" class="show-tabs" style="margin-bottom: 16px">
      <button
        v-for="(show, i) in props.catalog.shows"
        :key="i"
        class="show-tab-btn"
        :class="{ active: activeShowIdx === i }"
        @click="selectShow(i)"
      >{{ show.label || `Show ${i+1}` }}</button>
    </div>

    <!-- No rings guard -->
    <div v-if="!currentShow?.rings.length" class="empty-state" style="min-height: 200px">
      <div class="empty-state-title">No rings configured</div>
      <div class="empty-state-sub">Add rings on the Rings tab first.</div>
    </div>

    <!-- No active classes guard -->
    <div v-else-if="!activeClasses.length" class="empty-state" style="min-height: 200px">
      <div class="empty-state-sub">No classes are enabled on any ring. Check the Rings tab.</div>
    </div>

    <template v-else>
      <!-- Class selector -->
      <div class="class-pills">
        <button
          v-for="cls in activeClasses"
          :key="cls"
          class="class-pill"
          :class="{ active: cls === currentClass }"
          @click="activeClass = cls"
        >{{ CLASS_LABEL[cls] ?? cls }}</button>
      </div>

      <!-- Placement grid -->
      <div class="finals-wrapper">
        <table class="finals-table" ref="tableRef">
          <thead>
            <!-- Ring name row -->
            <tr>
              <th class="row-label ring-header"></th>
              <template v-for="(col, ci) in columns" :key="ci">
                <!-- Span two sub-columns for SP rings, one for AB -->
                <th
                  class="ring-header"
                  :colspan="1"
                  :title="col.ring.name"
                >{{ col.ring.judge }}{{ col.lhsh ? ` ${col.lhsh}` : ` ${col.ring.absp}` }}</th>
              </template>
            </tr>
            <!-- Count row -->
            <tr class="count-row">
              <td class="row-label" style="font-size:11px">Count</td>
              <td v-for="(col, ci) in columns" :key="ci">
                <input
                  type="text"
                  :value="getCount(col)"
                  @input="onCountInput(col, ($event.target as HTMLInputElement).value)"
                  @keydown="onNav($event, ci, 0)"
                  :data-col="ci"
                  data-row="0"
                  placeholder="—"
                  inputmode="numeric"
                />
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in SLOTS" :key="slot">
              <td class="row-label">{{ slot }}</td>
              <td v-for="(col, ci) in columns" :key="ci">
                <input
                  type="text"
                  :value="getRank(col, slot)"
                  @input="onPlacementInput(col, slot, ($event.target as HTMLInputElement).value)"
                  @keydown="onNav($event, ci, slot)"
                  :data-col="ci"
                  :data-row="slot"
                  placeholder=""
                  inputmode="numeric"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="margin-top: 12px; font-size: 12px; color: var(--text)">
        Enter entry numbers (e.g. <code>401</code> or <code>401A</code>). Leave blank for no placement.
      </p>
    </template>
  </div>
</template>
