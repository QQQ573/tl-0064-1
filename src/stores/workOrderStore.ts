import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '@/types'
import { loadFromStorage, saveToStorage, generateId } from '@/utils'
import { useInventoryStore } from './inventoryStore'
import { useTimelineStore } from './timelineStore'

const STORAGE_KEY = 'work_orders_v1'
const HANDLER_STORAGE_KEY = 'last_handler'

export const useWorkOrderStore = defineStore('workOrder', () => {
  const workOrders = ref<WorkOrder[]>([])
  const selectedOrderIds = ref<string[]>([])
  const filterMachine = ref<number | null>(null)
  const filterSeries = ref<string | null>(null)
  const filterStatus = ref<WorkOrderStatus | 'all'>('all')
  const lastHandler = ref<string>(loadFromStorage(HANDLER_STORAGE_KEY, '店员A'))

  const pendingOrders = computed(() => filterOrdersByStatus('pending'))
  const pickingOrders = computed(() => filterOrdersByStatus('picking'))
  const shelvedOrders = computed(() => filterOrdersByStatus('shelved'))

  const filteredOrders = computed(() => {
    let result = workOrders.value
    
    if (filterMachine.value != null) {
      result = result.filter(o => o.machineId === filterMachine.value)
    }
    if (filterSeries.value != null) {
      result = result.filter(o => o.seriesId === filterSeries.value)
    }
    if (filterStatus.value !== 'all') {
      result = result.filter(o => o.status === filterStatus.value)
    }
    
    return result.sort((a, b) => {
      if (a.status !== b.status) {
        const order = { pending: 0, picking: 1, shelved: 2 }
        return order[a.status] - order[b.status]
      }
      if (a.priority !== b.priority) {
        return a.priority === 'urgent' ? -1 : 1
      }
      return b.createdAt - a.createdAt
    })
  })

  const hasSelected = computed(() => selectedOrderIds.value.length > 0)

  function loadFromStore() {
    workOrders.value = loadFromStorage(STORAGE_KEY, [])
  }

  function persist() {
    saveToStorage(STORAGE_KEY, workOrders.value)
  }

  function filterOrdersByStatus(status: WorkOrderStatus) {
    return filteredOrders.value.filter(o => o.status === status)
  }

  function getOrderById(id: string): WorkOrder | undefined {
    return workOrders.value.find(o => o.id === id)
  }

  function createOrder(params: {
    machineId: number
    seriesId: string
    priority?: WorkOrderPriority
    remark?: string
  }): WorkOrder {
    const existingOrder = workOrders.value.find(
      o => o.machineId === params.machineId
        && o.seriesId === params.seriesId
        && o.status !== 'shelved'
    )
    if (existingOrder) {
      return existingOrder
    }

    const inventoryStore = useInventoryStore()
    const seriesInv = inventoryStore.getSeriesInventory(params.machineId, params.seriesId)
    const currentStock = seriesInv?.stock ?? 0
    const suggestedQty = Math.max(0, 12 - currentStock)

    const order: WorkOrder = {
      id: generateId(),
      machineId: params.machineId,
      seriesId: params.seriesId,
      priority: params.priority ?? (currentStock <= 1 ? 'urgent' : 'normal'),
      handler: '',
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      actualQty: null,
      remark: params.remark ?? `建议补货 ${suggestedQty} 盒（当前库存 ${currentStock}）`,
      creator: lastHandler.value,
    }

    workOrders.value.push(order)
    persist()
    return order
  }

  function updateOrder(id: string, updates: Partial<WorkOrder>) {
    const order = workOrders.value.find(o => o.id === id)
    if (!order) return

    Object.assign(order, updates)

    if (updates.status === 'shelved' && order.completedAt == null) {
      order.completedAt = Date.now()
    }

    persist()
  }

  function advanceOrder(id: string) {
    const order = workOrders.value.find(o => o.id === id)
    if (!order) return

    const flow: Record<WorkOrderStatus, WorkOrderStatus | null> = {
      pending: 'picking',
      picking: 'shelved',
      shelved: null,
    }

    const nextStatus = flow[order.status]
    if (nextStatus == null) return

    if (!order.handler) {
      order.handler = lastHandler.value
    }

    updateOrder(id, { status: nextStatus })

    if (nextStatus === 'shelved') {
      completeOrder(id, order.actualQty ?? Math.max(0, 12 - (inventoryOrderStock(id) ?? 0)))
    }
  }

  function inventoryOrderStock(orderId: string): number | undefined {
    const order = getOrderById(orderId)
    if (!order) return undefined
    const inventoryStore = useInventoryStore()
    const seriesInv = inventoryStore.getSeriesInventory(order.machineId, order.seriesId)
    return seriesInv?.stock
  }

  function completeOrder(id: string, actualQty: number) {
    const order = workOrders.value.find(o => o.id === id)
    if (!order) return

    const qty = Math.min(Math.max(0, actualQty), 12)
    order.actualQty = qty
    order.status = 'shelved'
    order.completedAt = Date.now()

    const inventoryStore = useInventoryStore()
    const timelineStore = useTimelineStore()

    const seriesInv = inventoryStore.getSeriesInventory(order.machineId, order.seriesId)
    if (seriesInv) {
      const currentStock = seriesInv.stock
      const newStock = Math.min(12, currentStock + qty)
      inventoryStore.updateStockWithRestockMark(order.machineId, order.seriesId, newStock, order.handler, order.id)
    }

    timelineStore.addEvent({
      id: `wo-${order.id}`,
      machineId: order.machineId,
      seriesId: order.seriesId,
      eventType: 'restocked',
      timestamp: order.completedAt!,
      stockLevel: qty,
    })

    persist()
  }

  function batchShelve(ids: string[], defaultQty?: number) {
    const inventoryStore = useInventoryStore()
    const timelineStore = useTimelineStore()

    ids.forEach(id => {
      const order = workOrders.value.find(o => o.id === id)
      if (!order || order.status === 'shelved') return

      if (!order.handler) order.handler = lastHandler.value
      
      const seriesInv = inventoryStore.getSeriesInventory(order.machineId, order.seriesId)
      const currentStock = seriesInv?.stock ?? 0
      const qty = defaultQty != null ? defaultQty : Math.max(0, 12 - currentStock)
      const finalQty = Math.min(Math.max(0, qty), 12)

      order.actualQty = finalQty
      order.status = 'shelved'
      order.completedAt = Date.now()

      const newStock = Math.min(12, currentStock + finalQty)
      inventoryStore.updateStockWithRestockMark(order.machineId, order.seriesId, newStock, order.handler, order.id)

      timelineStore.addEvent({
        id: `wo-batch-${order.id}`,
        machineId: order.machineId,
        seriesId: order.seriesId,
        eventType: 'restocked',
        timestamp: order.completedAt!,
        stockLevel: finalQty,
      })
    })

    selectedOrderIds.value = []
    persist()
  }

  function moveOrder(id: string, newStatus: WorkOrderStatus) {
    const order = workOrders.value.find(o => o.id === id)
    if (!order) return

    if (!order.handler && newStatus !== 'pending') {
      order.handler = lastHandler.value
    }

    if (newStatus === 'shelved' && order.status !== 'shelved') {
      completeOrder(id, order.actualQty ?? 12 - (inventoryOrderStock(id) ?? 0))
    } else {
      updateOrder(id, { status: newStatus })
    }
  }

  function toggleSelect(id: string) {
    const idx = selectedOrderIds.value.indexOf(id)
    if (idx >= 0) {
      selectedOrderIds.value.splice(idx, 1)
    } else {
      selectedOrderIds.value.push(id)
    }
  }

  function clearSelection() {
    selectedOrderIds.value = []
  }

  function setFilters(params: {
    machineId?: number | null
    seriesId?: string | null
    status?: WorkOrderStatus | 'all'
  }) {
    if (params.machineId !== undefined) filterMachine.value = params.machineId
    if (params.seriesId !== undefined) filterSeries.value = params.seriesId
    if (params.status !== undefined) filterStatus.value = params.status
  }

  function clearFilters() {
    filterMachine.value = null
    filterSeries.value = null
    filterStatus.value = 'all'
  }

  function setHandler(handler: string) {
    lastHandler.value = handler
    saveToStorage(HANDLER_STORAGE_KEY, handler)
  }

  function deleteOrder(id: string) {
    const idx = workOrders.value.findIndex(o => o.id === id)
    if (idx >= 0) {
      workOrders.value.splice(idx, 1)
      const selIdx = selectedOrderIds.value.indexOf(id)
      if (selIdx >= 0) selectedOrderIds.value.splice(selIdx, 1)
      persist()
    }
  }

  function getExportData() {
    const inventoryStore = useInventoryStore()
    return workOrders.value.map(o => ({
      工单编号: o.id.slice(0, 12),
      机器: `#${o.machineId}`,
      系列: inventoryStore.getSeriesById(o.seriesId)?.name ?? o.seriesId,
      优先级: o.priority === 'urgent' ? '急' : '常',
      状态: o.status === 'pending' ? '待处理' : o.status === 'picking' ? '拣货中' : '已上架',
      经办人: o.handler || '-',
      创建人: o.creator,
      创建时间: new Date(o.createdAt).toLocaleString('zh-CN'),
      完成时间: o.completedAt ? new Date(o.completedAt).toLocaleString('zh-CN') : '-',
      实补盒数: o.actualQty ?? '-',
      备注: o.remark,
    }))
  }

  watch(workOrders, persist, { deep: true })

  return {
    workOrders,
    pendingOrders,
    pickingOrders,
    shelvedOrders,
    filteredOrders,
    selectedOrderIds,
    hasSelected,
    filterMachine,
    filterSeries,
    filterStatus,
    lastHandler,
    loadFromStore,
    getOrderById,
    createOrder,
    updateOrder,
    advanceOrder,
    completeOrder,
    batchShelve,
    moveOrder,
    toggleSelect,
    clearSelection,
    setFilters,
    clearFilters,
    setHandler,
    deleteOrder,
    getExportData,
  }
})
