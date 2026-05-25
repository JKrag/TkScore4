<script setup lang="ts">
import { ref } from 'vue'
import type { Catalog, Ring } from '../scoring/types'
import { addRing, removeRing, initials, CLASS_ORDER, CLASS_LABEL } from '../catalog/index'

const props = defineProps<{ catalog: Catalog }>()

const activeShowIdx = ref(0)

function onNameInput(ring: Ring, value: string) {
  const oldInitials = initials(ring.name)
  ring.name = value
  // Auto-update judge code only if it still matches the auto-derived value
  if (ring.judge === oldInitials || ring.judge === '') {
    ring.judge = initials(value)
  }
}

function toggleAbsp(ring: Ring, val: 'AB' | 'SP') {
  ring.absp = val
}

function toggleClass(ring: Ring, cls: string) {
  ring.classes[cls] = ring.classes[cls] ? 0 : 1
}
</script>

<template>
  <div>
    <!-- Show selector -->
    <div v-if="props.catalog.shows.length > 1" class="show-tabs">
      <button
        v-for="(show, i) in props.catalog.shows"
        :key="i"
        class="show-tab-btn"
        :class="{ active: activeShowIdx === i }"
        @click="activeShowIdx = i"
      >{{ show.label || `Show ${i+1}` }}</button>
    </div>

    <template v-for="(show, showIdx) in props.catalog.shows" :key="showIdx">
      <div v-show="activeShowIdx === showIdx">
        <table class="data-table" v-if="show.rings.length">
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Judge Name</th>
              <th style="width:60px">Code</th>
              <th style="width:80px">Type</th>
              <th>Classes</th>
              <th style="width:80px">Congress</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ring, ringIdx) in show.rings" :key="ringIdx">
              <td style="text-align:center; color:var(--text)">{{ ringIdx + 1 }}</td>

              <td>
                <input
                  type="text"
                  :value="ring.name"
                  @input="onNameInput(ring, ($event.target as HTMLInputElement).value)"
                  placeholder="Judge full name"
                  style="min-width: 180px"
                />
              </td>

              <td>
                <input
                  type="text"
                  v-model="ring.judge"
                  maxlength="4"
                  placeholder="YP"
                  style="width: 50px; text-align:center; font-family: var(--mono)"
                />
              </td>

              <td>
                <div class="toggle-group">
                  <button
                    :class="{ active: ring.absp === 'AB' }"
                    @click="toggleAbsp(ring, 'AB')"
                  >AB</button>
                  <button
                    :class="{ active: ring.absp === 'SP' }"
                    @click="toggleAbsp(ring, 'SP')"
                  >SP</button>
                </div>
              </td>

              <td>
                <div class="checkbox-group">
                  <label
                    v-for="cls in CLASS_ORDER"
                    :key="cls"
                    class="checkbox-label"
                    :title="CLASS_LABEL[cls]"
                  >
                    <input
                      type="checkbox"
                      :checked="!!ring.classes[cls]"
                      @change="toggleClass(ring, cls)"
                    />
                    {{ cls }}
                  </label>
                </div>
              </td>

              <td style="text-align:center">
                <label class="checkbox-label" style="justify-content:center">
                  <input
                    type="checkbox"
                    :checked="!!ring.congress"
                    @change="ring.congress = ($event.target as HTMLInputElement).checked ? 1 : 0"
                  />
                </label>
              </td>

              <td>
                <button
                  class="btn btn-sm btn-danger btn-ghost"
                  @click="removeRing(props.catalog, showIdx, ringIdx)"
                  title="Remove ring"
                >✕</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state" style="min-height: 160px">
          <div style="color:var(--text)">No rings yet for {{ show.label || `Show ${showIdx + 1}` }}</div>
        </div>

        <div class="section-actions">
          <button class="btn btn-sm" @click="addRing(props.catalog, showIdx)">+ Add Ring</button>
        </div>
      </div>
    </template>
  </div>
</template>
