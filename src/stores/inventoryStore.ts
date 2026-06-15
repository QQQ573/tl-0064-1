import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MachineInventory, Series } from '@/types'
import { SERIES_LIST, MOCK_MACHINES } from '@/data/mockData'
import { useTimelineStore } from './timelineStore'

export const useInventoryStore = defineStore('inventory', () => {
  const machines = ref<MachineInventory[]>([])
  const seriesList = ref<Series[]>(SERIES_LIST)

  function loadMockData() {
    machines.value = JSON.parse(JSON.stringify(MOCK_MACHINES))
    
    const timelineStore = useTimelineStore()
    const now = Date.now()
    let eventIdx = 0
    
    machines.value.forEach(machine => {
      machine.series.forEach(series => {
        if (series.isLowStock && !series.isRestocked) {
          timelineStore.addEvent({
            id: `auto-event-${eventIdx++}-${now}`,
            machineId: machine.machineId,
            seriesId: series.seriesId,
            eventType: 'low_stock',
            timestamp: now - Math.floor(Math.random() * 30) * 60 * 1000,
            stockLevel: series.stock,
          })
        }
      })
    })
  }

  const getMachineById = computed(() => {
    return (id: number) => machines.value.find(m => m.machineId === id)
  })

  const getSeriesById = computed(() => {
    return (id: string) => seriesList.value.find(s => s.id === id)
  })

  function getSeriesStock(machineId: number, seriesId: string): number {
    const machine = machines.value.find(m => m.machineId === machineId)
    if (!machine) return 0
    const series = machine.series.find(s => s.seriesId === seriesId)
    return series?.stock ?? 0
  }

  function hasLowStock(machineId: number): boolean {
    const machine = machines.value.find(m => m.machineId === machineId)
    if (!machine) return false
    return machine.series.some(s => s.isLowStock && !s.isRestocked)
  }

  function markRestocked(machineId: number, seriesId: string) {
    const timelineStore = useTimelineStore()
    const machine = machines.value.find(m => m.machineId === machineId)
    if (!machine) return

    const series = machine.series.find(s => s.seriesId === seriesId)
    if (!series) return

    series.isRestocked = true
    series.lastUpdated = Date.now()

    timelineStore.addEvent({
      id: `event-${Date.now()}`,
      machineId,
      seriesId,
      eventType: 'restocked',
      timestamp: Date.now(),
      stockLevel: series.stock,
    })
  }

  function updateStock(machineId: number, seriesId: string, newStock: number) {
    const timelineStore = useTimelineStore()
    const machine = machines.value.find(m => m.machineId === machineId)
    if (!machine) return

    const series = machine.series.find(s => s.seriesId === seriesId)
    if (!series) return

    const wasLowStock = series.isLowStock
    series.stock = newStock
    series.isLowStock = newStock <= 2
    series.lastUpdated = Date.now()

    if (series.isLowStock && !wasLowStock && !series.isRestocked) {
      timelineStore.addEvent({
        id: `event-${Date.now()}`,
        machineId,
        seriesId,
        eventType: 'low_stock',
        timestamp: Date.now(),
        stockLevel: newStock,
      })
    }
  }

  return {
    machines,
    seriesList,
    loadMockData,
    getMachineById,
    getSeriesById,
    getSeriesStock,
    hasLowStock,
    markRestocked,
    updateStock,
  }
})
