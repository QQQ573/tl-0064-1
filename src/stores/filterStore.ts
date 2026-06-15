import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MachineInventory } from '@/types'

export const useFilterStore = defineStore('filter', () => {
  const selectedMachines = ref<number[]>([])
  const selectedSeries = ref<string[]>([])
  const hasHiddenOnly = ref(false)

  function toggleMachine(machineId: number) {
    const index = selectedMachines.value.indexOf(machineId)
    if (index === -1) {
      selectedMachines.value.push(machineId)
    } else {
      selectedMachines.value.splice(index, 1)
    }
  }

  function toggleSeries(seriesId: string) {
    const index = selectedSeries.value.indexOf(seriesId)
    if (index === -1) {
      selectedSeries.value.push(seriesId)
    } else {
      selectedSeries.value.splice(index, 1)
    }
  }

  function setHasHiddenOnly(value: boolean) {
    hasHiddenOnly.value = value
  }

  function clearFilters() {
    selectedMachines.value = []
    selectedSeries.value = []
    hasHiddenOnly.value = false
  }

  function isMachineHighlighted(machineId: number): boolean {
    if (selectedMachines.value.length === 0) return true
    return selectedMachines.value.includes(machineId)
  }

  function isSeriesHighlighted(seriesId: string): boolean {
    if (selectedSeries.value.length === 0) return true
    return selectedSeries.value.includes(seriesId)
  }

  const hasActiveFilters = computed(() => {
    return selectedMachines.value.length > 0 || 
           selectedSeries.value.length > 0 || 
           hasHiddenOnly.value
  })

  function filterMachines(machines: MachineInventory[], seriesList: { id: string; hasHidden: boolean }[]): MachineInventory[] {
    return machines.filter(machine => {
      if (selectedMachines.value.length > 0 && !selectedMachines.value.includes(machine.machineId)) {
        return false
      }
      
      if (hasHiddenOnly.value) {
        const hasHiddenSeries = machine.series.some(s => {
          const series = seriesList.find(sl => sl.id === s.seriesId)
          return series?.hasHidden
        })
        if (!hasHiddenSeries) return false
      }
      
      return true
    })
  }

  return {
    selectedMachines,
    selectedSeries,
    hasHiddenOnly,
    hasActiveFilters,
    toggleMachine,
    toggleSeries,
    setHasHiddenOnly,
    clearFilters,
    isMachineHighlighted,
    isSeriesHighlighted,
    filterMachines,
  }
})
