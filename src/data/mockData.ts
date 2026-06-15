import type { Series, MachineInventory, TimelineEvent } from '@/types'

export const SERIES_LIST: Series[] = [
  { id: 'labubu', name: 'LABUBU', color: '#ff2d78', hasHidden: true },
  { id: 'dimoo', name: 'DIMOO', color: '#8b5cf6', hasHidden: true },
  { id: 'molly', name: 'MOLLY', color: '#00d4ff', hasHidden: true },
  { id: 'hirono', name: 'HIRONO', color: '#f59e0b', hasHidden: true },
  { id: 'skullpanda', name: 'SKULLPANDA', color: '#10b981', hasHidden: true },
  { id: 'crybaby', name: 'CRYBABY', color: '#ec4899', hasHidden: false },
  { id: 'pucky', name: 'PUCKY', color: '#6366f1', hasHidden: false },
  { id: 'sweetbean', name: 'SweetBean', color: '#14b8a6', hasHidden: false },
]

const SERIES_IDS = SERIES_LIST.map(s => s.id)

function generateSeriesInventory(): MachineInventory['series'] {
  return SERIES_IDS.map(seriesId => {
    const stock = Math.floor(Math.random() * 13)
    return {
      seriesId,
      stock,
      isLowStock: stock <= 2,
      isRestocked: false,
      lastUpdated: Date.now(),
    }
  })
}

function generateConsumption(): MachineInventory['lastConsumption'] {
  const points: MachineInventory['lastConsumption'] = []
  const now = Date.now()
  for (let i = 0; i < 12; i++) {
    const timestamp = now - (11 - i) * 30 * 60 * 1000
    SERIES_IDS.forEach(seriesId => {
      points.push({
        timestamp,
        seriesId,
        consumed: Math.floor(Math.random() * 4),
      })
    })
  }
  return points
}

export function generateMockMachines(): MachineInventory[] {
  const machines: MachineInventory[] = []
  for (let i = 1; i <= 12; i++) {
    machines.push({
      machineId: i,
      series: generateSeriesInventory(),
      lastConsumption: generateConsumption(),
    })
  }
  return machines
}

export function generateMockTimeline(): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const now = Date.now()
  const eventTypes: Array<'low_stock' | 'restocked'> = ['low_stock', 'restocked']
  
  for (let i = 0; i < 15; i++) {
    const machineId = Math.floor(Math.random() * 12) + 1
    const seriesId = SERIES_IDS[Math.floor(Math.random() * SERIES_IDS.length)]
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    
    events.push({
      id: `event-${i}`,
      machineId,
      seriesId,
      eventType,
      timestamp: now - (i * 15 + Math.floor(Math.random() * 10)) * 60 * 1000,
      stockLevel: eventType === 'low_stock' ? Math.floor(Math.random() * 3) : 12,
    })
  }
  
  return events.sort((a, b) => b.timestamp - a.timestamp)
}

export const MOCK_MACHINES = generateMockMachines()
export const MOCK_TIMELINE = generateMockTimeline()
