<script setup lang="ts">
import type { Catalog } from '../scoring/types'
import { addShow, removeShow } from '../catalog/index'

const props = defineProps<{ catalog: Catalog }>()

const SHOW_LABELS = ['Saturday', 'Sunday', 'Monday', 'Tuesday']
</script>

<template>
  <div>
    <!-- Show metadata -->
    <div class="form-section">
      <div class="form-section-title">Show Information</div>
      <div class="form-grid">
        <div class="form-field">
          <label>Club Name</label>
          <input type="text" v-model="props.catalog.club" placeholder="e.g. International Specialty Club" />
        </div>
        <div class="form-field">
          <label>Location</label>
          <input type="text" v-model="props.catalog.location" placeholder="e.g. Enumclaw, Washington" />
        </div>
        <div class="form-field">
          <label>Date</label>
          <input type="text" v-model="props.catalog.date" placeholder="e.g. May 26-27, 2026" />
        </div>
        <div class="form-field">
          <label>Reporter</label>
          <input type="text" v-model="props.catalog.reporter" placeholder="Reporter name" />
        </div>
        <div class="form-field">
          <label>Email</label>
          <input type="email" v-model="props.catalog.email" placeholder="reporter@example.com" />
        </div>
      </div>
    </div>

    <!-- Show days -->
    <div class="form-section">
      <div class="form-section-title">Show Days</div>
      <div class="form-grid">
        <div
          v-for="(show, i) in props.catalog.shows"
          :key="i"
          class="form-field"
        >
          <label>Show {{ i + 1 }} Label</label>
          <div style="display:flex; gap:6px; align-items:center">
            <input type="text" v-model="show.label" :placeholder="SHOW_LABELS[i] ?? `Show ${i+1}`" />
            <button
              v-if="props.catalog.shows.length > 1"
              class="btn btn-sm btn-danger btn-ghost"
              @click="removeShow(props.catalog, i)"
              title="Remove this show day"
            >✕</button>
          </div>
        </div>
      </div>
      <div class="section-actions">
        <button
          class="btn btn-sm"
          :disabled="props.catalog.shows.length >= 4"
          @click="addShow(props.catalog)"
        >+ Add Show Day</button>
      </div>
    </div>

    <!-- Report options -->
    <div class="form-section">
      <div class="form-section-title">Report Options</div>
      <div class="form-grid">
        <div class="form-field">
          <label>Name Width</label>
          <select v-model.number="props.catalog.options.namewidth">
            <option :value="36">36 characters</option>
            <option :value="38">38 characters</option>
            <option :value="40">40 characters</option>
          </select>
        </div>
        <div class="form-field">
          <label>Column Width</label>
          <select v-model.number="props.catalog.options.colwidth">
            <option :value="3">3 (narrow)</option>
            <option :value="4">4 (medium)</option>
            <option :value="5">5 (wide)</option>
          </select>
        </div>
        <div class="form-field">
          <label>Display</label>
          <div class="checkbox-group" style="margin-top: 4px">
            <label class="checkbox-label">
              <input type="checkbox" :checked="!!props.catalog.options.printscore" @change="(e) => props.catalog.options.printscore = (e.target as HTMLInputElement).checked ? 1 : 0" />
              Print scores
            </label>
            <label class="checkbox-label">
              <input type="checkbox" :checked="!!props.catalog.options.mixedcase" @change="(e) => props.catalog.options.mixedcase = (e.target as HTMLInputElement).checked ? 1 : 0" />
              Mixed case
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
