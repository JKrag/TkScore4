<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Catalog } from '../scoring/types'
import { generateReport } from '../scoring/report'
import { downloadReport } from '../catalog/index'

const props = defineProps<{ catalog: Catalog }>()

const reportText = ref<string | null>(null)
const error = ref<string | null>(null)

const namewidth = computed({
  get: () => props.catalog.options.namewidth ?? 36,
  set: (v) => { props.catalog.options.namewidth = v },
})
const colwidth = computed({
  get: () => props.catalog.options.colwidth ?? 3,
  set: (v) => { props.catalog.options.colwidth = v },
})

function generate() {
  error.value = null
  try {
    reportText.value = generateReport(props.catalog, {
      namewidth: namewidth.value,
      colwidth: colwidth.value,
    })
  } catch (e) {
    error.value = String(e)
    reportText.value = null
  }
}

function doDownload() {
  if (!reportText.value) return
  downloadReport(reportText.value, props.catalog)
}
</script>

<template>
  <div>
    <div class="report-toolbar">
      <div class="form-field" style="flex-direction:row; align-items:center; gap:8px">
        <label style="white-space:nowrap">Name width</label>
        <select v-model.number="namewidth" style="width:auto">
          <option :value="36">36</option>
          <option :value="38">38</option>
          <option :value="40">40</option>
        </select>
      </div>
      <div class="form-field" style="flex-direction:row; align-items:center; gap:8px">
        <label style="white-space:nowrap">Col width</label>
        <select v-model.number="colwidth" style="width:auto">
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="5">5</option>
        </select>
      </div>
      <label class="checkbox-label" style="margin-left:4px">
        <input
          type="checkbox"
          :checked="!!props.catalog.options.printscore"
          @change="(e) => props.catalog.options.printscore = (e.target as HTMLInputElement).checked ? 1 : 0"
        />
        Print scores
      </label>
      <button class="btn btn-primary" @click="generate">Generate Report</button>
      <button v-if="reportText" class="btn" @click="doDownload">Download .txt</button>
    </div>

    <div v-if="error" style="color: var(--danger); margin-bottom: 12px; font-size: 13px">
      Error: {{ error }}
    </div>

    <div v-if="reportText" class="report-output">{{ reportText }}</div>

    <div v-else class="empty-state" style="min-height: 200px">
      <div class="empty-state-sub">Click "Generate Report" to produce the show report.</div>
    </div>
  </div>
</template>
