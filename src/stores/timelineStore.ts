import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimelineEvent } from '@/types'
import { MOCK_TIMELINE } from '@/data/mockData'

export const useTimelineStore = defineStore('timeline', () => {
  const events = ref<TimelineEvent[]>([])

  function loadMockData() {
    events.value = JSON.parse(JSON.stringify(MOCK_TIMELINE))
  }

  const eventsByMachine = computed(() => {
    return (machineId: number) => events.value.filter(e => e.machineId === machineId)
  })

  const lowStockEvents = computed(() => {
    return events.value.filter(e => e.eventType === 'low_stock')
  })

  const restockedEvents = computed(() => {
    return events.value.filter(e => e.eventType === 'restocked')
  })

  function addEvent(event: TimelineEvent) {
    events.value.unshift(event)
  }

  function clearAll() {
    events.value = []
  }

  return {
    events,
    eventsByMachine,
    lowStockEvents,
    restockedEvents,
    addEvent,
    clearAll,
    loadMockData,
  }
})
