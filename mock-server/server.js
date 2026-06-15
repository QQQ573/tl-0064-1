const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

const SERIES_LIST = [
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

function generateSeriesInventory() {
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

function generateConsumption() {
  const points = []
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

let machines = []
let timeline = []

function initializeData() {
  machines = []
  for (let i = 1; i <= 12; i++) {
    machines.push({
      machineId: i,
      series: generateSeriesInventory(),
      lastConsumption: generateConsumption(),
    })
  }

  timeline = []
  const now = Date.now()
  const eventTypes = ['low_stock', 'restocked']
  for (let i = 0; i < 15; i++) {
    const machineId = Math.floor(Math.random() * 12) + 1
    const seriesId = SERIES_IDS[Math.floor(Math.random() * SERIES_IDS.length)]
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    timeline.push({
      id: `event-${i}`,
      machineId,
      seriesId,
      eventType,
      timestamp: now - (i * 15 + Math.floor(Math.random() * 10)) * 60 * 1000,
      stockLevel: eventType === 'low_stock' ? Math.floor(Math.random() * 3) : 12,
    })
  }
  timeline.sort((a, b) => b.timestamp - a.timestamp)
}

initializeData()

app.get('/api/series', (req, res) => {
  res.json(SERIES_LIST)
})

app.get('/api/inventory', (req, res) => {
  res.json(machines)
})

app.get('/api/inventory/:machineId', (req, res) => {
  const machineId = parseInt(req.params.machineId)
  const machine = machines.find(m => m.machineId === machineId)
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' })
  }
  res.json(machine)
})

app.get('/api/consumption/:machineId', (req, res) => {
  const machineId = parseInt(req.params.machineId)
  const machine = machines.find(m => m.machineId === machineId)
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' })
  }
  res.json(machine.lastConsumption)
})

app.post('/api/restock', (req, res) => {
  const { machineId, seriesId } = req.body
  const machine = machines.find(m => m.machineId === machineId)
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' })
  }

  const series = machine.series.find(s => s.seriesId === seriesId)
  if (!series) {
    return res.status(404).json({ error: 'Series not found' })
  }

  series.isRestocked = true
  series.lastUpdated = Date.now()

  const event = {
    id: `event-${Date.now()}`,
    machineId,
    seriesId,
    eventType: 'restocked',
    timestamp: Date.now(),
    stockLevel: series.stock,
  }
  timeline.unshift(event)

  res.json({ success: true, series, event })
})

app.get('/api/timeline', (req, res) => {
  const { machineId, type } = req.query
  let filtered = [...timeline]

  if (machineId) {
    filtered = filtered.filter(e => e.machineId === parseInt(machineId))
  }
  if (type) {
    filtered = filtered.filter(e => e.eventType === type)
  }

  res.json(filtered)
})

app.post('/api/timeline', (req, res) => {
  const event = {
    ...req.body,
    id: `event-${Date.now()}`,
    timestamp: Date.now(),
  }
  timeline.unshift(event)
  res.json({ success: true, event })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`)
})
