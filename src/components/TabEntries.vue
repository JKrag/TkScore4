<script setup lang="ts">
import type { Catalog } from '../scoring/types'

defineProps<{ catalog: Catalog }>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-state-title">Entries</div>
    <div class="empty-state-sub">
      Cat name and breed entry is not required to generate a show report.
      Finals can be entered using entry numbers only.<br><br>
      Full entries editor coming soon.
    </div>
  </div>
</template>
