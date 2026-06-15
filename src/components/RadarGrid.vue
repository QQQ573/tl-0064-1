<script setup lang="ts">
import { computed } from 'vue'
import RadarCard from './RadarCard.vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useFilterStore } from '@/stores/filterStore'
import { useDevice } from '@/composables/useDevice'

const emit = defineEmits<{
  (e: 'machine-dblclick', machineId: number): void
}>()

const inventoryStore = useInventoryStore()
const filterStore = useFilterStore()
const { isReadOnly } = useDevice()

const visibleMachines = computed(() => {
  return filterStore.filterMachines(inventoryStore.machines, inventoryStore.seriesList)
})

const displayMachines = computed(() => {
  return inventoryStore.machines
})

function handleMachineDblclick(machineId: number) {
  emit('machine-dblclick', machineId)
}
</script>

<template>
  <div class="radar-grid" :class="{ 'read-only': isReadOnly }">
    <RadarCard
      v-for="machine in displayMachines"
      :key="machine.machineId"
      :machine-id="machine.machineId"
      @dblclick="handleMachineDblclick"
    />
  </div>
</template>

<style scoped>
.radar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
}

@media (max-width: 1400px) {
  .radar-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1024px) {
  .radar-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .radar-grid {
    grid-template-columns: 1fr;
  }
}
</style>
