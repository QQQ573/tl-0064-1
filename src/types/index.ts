export interface Series {
  id: string
  name: string
  color: string
  hasHidden: boolean
}

export interface SeriesInventory {
  seriesId: string
  stock: number
  isLowStock: boolean
  isRestocked: boolean
  lastUpdated: number
}

export interface ConsumptionPoint {
  timestamp: number
  seriesId: string
  consumed: number
}

export interface MachineInventory {
  machineId: number
  series: SeriesInventory[]
  lastConsumption: ConsumptionPoint[]
}

export interface TimelineEvent {
  id: string
  machineId: number
  seriesId: string
  eventType: 'low_stock' | 'restocked'
  timestamp: number
  stockLevel: number
}

export interface FilterState {
  selectedMachines: number[]
  selectedSeries: string[]
  hasHiddenOnly: boolean
}

export type WorkOrderPriority = 'urgent' | 'normal'
export type WorkOrderStatus = 'pending' | 'picking' | 'shelved'

export interface WorkOrder {
  id: string
  machineId: number
  seriesId: string
  priority: WorkOrderPriority
  handler: string
  status: WorkOrderStatus
  createdAt: number
  completedAt: number | null
  actualQty: number | null
  remark: string
  creator: string
}
