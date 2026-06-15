<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  ClipboardList, PackageSearch, CheckCircle, ChevronRight, ChevronDown,
  GripVertical, User, Calendar, X, Edit3, Check, Trash2, AlertTriangle,
  Download, Filter, RefreshCw
} from 'lucide-vue-next'
import { useWorkOrderStore } from '@/stores/workOrderStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import type { WorkOrder, WorkOrderStatus } from '@/types'
import { formatDateTime, exportToCSV } from '@/utils'
import { useDevice } from '@/composables/useDevice'

const workOrderStore = useWorkOrderStore()
const inventoryStore = useInventoryStore()
const { isReadOnly } = useDevice()

const columns: { status: WorkOrderStatus; label: string; icon: any; color: string }[] = [
  { status: 'pending', label: '待处理', icon: ClipboardList, color: '#f59e0b' },
  { status: 'picking', label: '拣货中', icon: PackageSearch, color: '#3b82f6' },
  { status: 'shelved', label: '已上架', icon: CheckCircle, color: '#10b981' },
]

const showQtyModal = ref(false)
const qtyModalOrderId = ref<string | null>(null)
const qtyModalValue = ref<number>(12)
const showRemarkModal = ref(false)
const remarkModalOrderId = ref<string | null>(null)
const remarkModalValue = ref<string>('')
const showHandlerModal = ref(false)
const handlerModalValue = ref<string>('')

const batchQty = ref<number | null>(null)

const machines = computed(() => {
  const set = new Set(workOrderStore.workOrders.map(o => o.machineId))
  return Array.from(set).sort((a, b) => a - b)
})

const seriesOptions = computed(() => inventoryStore.seriesList)

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'picking', label: '拣货中' },
  { value: 'shelved', label: '已上架' },
]

function getStatusOrders(status: WorkOrderStatus) {
  if (status === 'pending') return workOrderStore.pendingOrders
  if (status === 'picking') return workOrderStore.pickingOrders
  return workOrderStore.shelvedOrders
}

function getSeriesName(seriesId: string) {
  return inventoryStore.getSeriesById(seriesId)?.name ?? seriesId
}

function getSeriesColor(seriesId: string) {
  return inventoryStore.getSeriesById(seriesId)?.color ?? '#8b5cf6'
}

function handleDragStart(e: DragEvent, order: WorkOrder) {
  if (isReadOnly.value) return
  e.dataTransfer?.setData('orderId', order.id)
  ;(e.target as HTMLElement).classList.add('dragging')
}

function handleDragEnd(e: DragEvent) {
  ;(e.target as HTMLElement).classList.remove('dragging')
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).classList.add('drag-over')
}

function handleDragLeave(e: DragEvent) {
  ;(e.currentTarget as HTMLElement).classList.remove('drag-over')
}

function handleDrop(e: DragEvent, targetStatus: WorkOrderStatus) {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).classList.remove('drag-over')
  if (isReadOnly.value) return
  
  const orderId = e.dataTransfer?.getData('orderId')
  if (!orderId) return
  
  workOrderStore.moveOrder(orderId, targetStatus)
}

function advanceOrder(id: string) {
  const order = workOrderStore.getOrderById(id)
  if (!order) return
  
  if (order.status === 'picking') {
    const seriesInv = inventoryStore.getSeriesInventory(order.machineId, order.seriesId)
    qtyModalValue.value = order.actualQty ?? Math.max(0, 12 - (seriesInv?.stock ?? 0))
    qtyModalOrderId.value = id
    showQtyModal.value = true
  } else {
    if (!order.handler) {
      handlerModalValue.value = workOrderStore.lastHandler
      showHandlerModal.value = true
      const doAdvance = () => {
        workOrderStore.setHandler(handlerModalValue.value)
        workOrderStore.advanceOrder(id)
        unwatch()
      }
      const unwatch = watch(() => showHandlerModal.value, (val) => {
        if (!val) doAdvance()
      })
    } else {
      workOrderStore.advanceOrder(id)
    }
  }
}

function confirmQtyModal() {
  if (!qtyModalOrderId.value) return
  workOrderStore.completeOrder(qtyModalOrderId.value, qtyModalValue.value)
  closeQtyModal()
}

function closeQtyModal() {
  showQtyModal.value = false
  qtyModalOrderId.value = null
}

function openRemarkModal(order: WorkOrder) {
  if (isReadOnly.value) return
  remarkModalOrderId.value = order.id
  remarkModalValue.value = order.remark
  showRemarkModal.value = true
}

function confirmRemarkModal() {
  if (!remarkModalOrderId.value) return
  workOrderStore.updateOrder(remarkModalOrderId.value, { remark: remarkModalValue.value })
  closeRemarkModal()
}

function closeRemarkModal() {
  showRemarkModal.value = false
  remarkModalOrderId.value = null
}

function confirmHandlerModal() {
  if (handlerModalValue.value.trim()) {
    workOrderStore.setHandler(handlerModalValue.value.trim())
  }
  showHandlerModal.value = false
}

function handleBatchShelve() {
  if (isReadOnly.value || workOrderStore.selectedOrderIds.length === 0) return
  if (batchQty.value != null) {
    workOrderStore.batchShelve(workOrderStore.selectedOrderIds, batchQty.value)
  } else {
    workOrderStore.batchShelve(workOrderStore.selectedOrderIds)
  }
  batchQty.value = null
}

function handleExportCSV() {
  const data = workOrderStore.getExportData()
  const date = new Date().toISOString().slice(0, 10)
  exportToCSV(data, `补货工单_${date}.csv`)
}

function filterByMachine(id: number) {
  workOrderStore.setFilters({
    machineId: workOrderStore.filterMachine === id ? null : id,
  })
}

function filterBySeries(id: string) {
  workOrderStore.setFilters({
    seriesId: workOrderStore.filterSeries === id ? null : id,
  })
}

function toggleOrderSelect(id: string, e: MouseEvent) {
  e.stopPropagation()
  if (isReadOnly.value) return
  workOrderStore.toggleSelect(id)
}
</script>

<template>
  <div class="dispatch-board">
    <div class="board-header">
      <div class="board-stats">
        <div v-for="col in columns" :key="col.status" class="stat-chip" :style="{ borderColor: col.color + '60' }">
          <component :is="col.icon" :size="14" :color="col.color" />
          <span class="stat-label">{{ col.label }}</span>
          <span class="stat-count" :style="{ color: col.color }">
            {{ getStatusOrders(col.status).length }}
          </span>
        </div>
      </div>
      <div class="board-actions">
        <div class="filter-row">
          <div class="filter-group">
            <Filter :size="12" class="text-zinc-500" />
            <select
              :value="workOrderStore.filterMachine ?? ''"
              @change="e => workOrderStore.setFilters({ machineId: (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : null })"
              class="filter-select"
            >
              <option value="">全部机器</option>
              <option v-for="m in machines" :key="m" :value="m">#{{ m }}</option>
            </select>
            <select
              :value="workOrderStore.filterSeries ?? ''"
              @change="e => workOrderStore.setFilters({ seriesId: (e.target as HTMLSelectElement).value || null })"
              class="filter-select"
            >
              <option value="">全部系列</option>
              <option v-for="s in seriesOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <select
              :value="workOrderStore.filterStatus"
              @change="e => workOrderStore.setFilters({ status: (e.target as HTMLSelectElement).value as any })"
              class="filter-select"
            >
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <button
            v-if="workOrderStore.filterMachine != null || workOrderStore.filterSeries != null || workOrderStore.filterStatus !== 'all'"
            class="clear-filter-btn"
            @click="workOrderStore.clearFilters()"
          >
            <X :size="12" /> 清除
          </button>
        </div>
        <div class="action-row">
          <button
            class="action-btn batch-btn"
            :disabled="!workOrderStore.hasSelected || isReadOnly"
            @click="handleBatchShelve"
          >
            <CheckCircle :size="14" />
            批量上架 ({{ workOrderStore.selectedOrderIds.length }})
          </button>
          <button
            v-if="workOrderStore.hasSelected"
            class="action-btn secondary"
            @click="workOrderStore.clearSelection()"
          >
            取消选择
          </button>
          <button
            class="action-btn export-btn"
            :disabled="workOrderStore.workOrders.length === 0"
            @click="handleExportCSV"
          >
            <Download :size="14" />
            导出 CSV
          </button>
        </div>
      </div>
    </div>

    <div class="kanban-columns">
      <div
        v-for="col in columns"
        :key="col.status"
        class="kanban-column"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="e => handleDrop(e, col.status)"
      >
        <div class="column-header" :style="{ borderLeftColor: col.color }">
          <div class="column-title">
            <component :is="col.icon" :size="15" :color="col.color" />
            <span class="column-name">{{ col.label }}</span>
          </div>
          <span class="column-count" :style="{ background: col.color + '20', color: col.color }">
            {{ getStatusOrders(col.status).length }}
          </span>
        </div>

        <div class="column-content">
          <TransitionGroup name="card-list">
            <div
              v-for="order in getStatusOrders(col.status)"
              :key="order.id"
              class="order-card"
              :class="{
                'is-urgent': order.priority === 'urgent',
                'is-selected': workOrderStore.selectedOrderIds.includes(order.id),
              }"
              draggable="true"
              @dragstart="e => handleDragStart(e, order)"
              @dragend="handleDragEnd"
              @click="toggleOrderSelect(order.id, $event)"
            >
              <div v-if="!isReadOnly" class="card-grip">
                <GripVertical :size="12" class="text-zinc-600" />
              </div>

              <div class="card-body">
                <div class="card-top-row">
                  <div class="priority-tag" :class="order.priority">
                    {{ order.priority === 'urgent' ? '急' : '常' }}
                  </div>
                  <div class="card-id">#{{ order.id.slice(-6) }}</div>
                  <button
                    v-if="order.status !== 'shelved' && !isReadOnly"
                    class="delete-btn"
                    @click.stop="workOrderStore.deleteOrder(order.id)"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>

                <div class="card-meta">
                  <span class="machine-tag">#{{ order.machineId }}</span>
                  <span class="series-tag" :style="{ background: getSeriesColor(order.seriesId) + '25', color: getSeriesColor(order.seriesId) }">
                    {{ getSeriesName(order.seriesId) }}
                  </span>
                </div>

                <div class="card-info">
                  <div class="info-item" v-if="order.handler">
                    <User :size="11" class="text-zinc-500" />
                    <span>{{ order.handler }}</span>
                  </div>
                  <div class="info-item text-zinc-600" v-else>
                    <User :size="11" />
                    <span>待分配</span>
                  </div>
                  <div class="info-item">
                    <Calendar :size="11" class="text-zinc-500" />
                    <span>{{ formatDateTime(order.createdAt) }}</span>
                  </div>
                </div>

                <div
                  v-if="order.remark"
                  class="card-remark"
                  @click.stop="openRemarkModal(order)"
                >
                  <Edit3 :size="10" />
                  <span>{{ order.remark.length > 30 ? order.remark.slice(0, 30) + '…' : order.remark }}</span>
                </div>
                <button
                  v-else-if="order.status !== 'shelved' && !isReadOnly"
                  class="card-add-remark"
                  @click.stop="openRemarkModal(order)"
                >
                  <Edit3 :size="10" /> 添加备注
                </button>

                <div v-if="order.status === 'shelved'" class="card-result">
                  <span class="result-label">实补盒数</span>
                  <span class="result-qty">{{ order.actualQty }} / 12</span>
                  <span class="result-time">{{ formatDateTime(order.completedAt!) }}</span>
                </div>

                <div class="card-actions" v-if="col.status !== 'shelved' && !isReadOnly">
                  <button
                    v-if="col.status === 'pending'"
                    class="advance-btn"
                    @click.stop="advanceOrder(order.id)"
                  >
                    <ChevronRight :size="14" /> 开始拣货
                  </button>
                  <button
                    v-else-if="col.status === 'picking'"
                    class="advance-btn shelve"
                    @click.stop="advanceOrder(order.id)"
                  >
                    <Check :size="14" /> 确认上架
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <div v-if="getStatusOrders(col.status).length === 0" class="column-empty">
            <component :is="col.icon" :size="24" class="text-zinc-700 mb-2" />
            <span>暂无{{ col.label }}工单</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showQtyModal" class="modal-overlay" @click.self="closeQtyModal">
          <div class="modal-sm">
            <h3 class="modal-title">确认实补盒数</h3>
            <div class="qty-input-wrap">
              <button class="qty-btn" @click="qtyModalValue = Math.max(0, qtyModalValue - 1)">-</button>
              <input
                v-model.number="qtyModalValue"
                type="number"
                min="0"
                max="12"
                class="qty-input"
              />
              <button class="qty-btn" @click="qtyModalValue = Math.min(12, qtyModalValue + 1)">+</button>
              <span class="qty-hint">/ 12 盒</span>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" @click="closeQtyModal">取消</button>
              <button class="btn-primary" @click="confirmQtyModal">确认上架</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showRemarkModal" class="modal-overlay" @click.self="closeRemarkModal">
          <div class="modal-sm">
            <h3 class="modal-title">编辑备注</h3>
            <textarea
              v-model="remarkModalValue"
              class="remark-input"
              placeholder="添加备注信息..."
              rows="3"
            />
            <div class="modal-actions">
              <button class="btn-secondary" @click="closeRemarkModal">取消</button>
              <button class="btn-primary" @click="confirmRemarkModal">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showHandlerModal" class="modal-overlay" @click.self="confirmHandlerModal">
          <div class="modal-sm">
            <h3 class="modal-title">设置经办人</h3>
            <input
              v-model="handlerModalValue"
              type="text"
              class="handler-input"
              placeholder="请输入经办人姓名"
              @keyup.enter="confirmHandlerModal"
            />
            <div class="modal-actions">
              <button class="btn-primary" @click="confirmHandlerModal">确认</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dispatch-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.board-header {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.board-stats {
  display: flex;
  gap: 8px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  font-size: 11px;
}

.stat-label {
  color: #a1a1aa;
}

.stat-count {
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
}

.board-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row, .action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.filter-select {
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: #e4e4e7;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

.filter-select:hover {
  border-color: rgba(139,92,246,0.4);
}

.filter-select option {
  background: #1a1a24;
  color: #e4e4e7;
}

.clear-filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.3);
  color: #fbbf24;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border: none;
  transition: all 0.2s;
}

.batch-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 2px 8px rgba(16,185,129,0.3);
}

.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-btn:not(:disabled):hover {
  box-shadow: 0 3px 12px rgba(16,185,129,0.5);
}

.action-btn.secondary {
  background: rgba(255,255,255,0.05);
  color: #a1a1aa;
  border: 1px solid rgba(255,255,255,0.1);
}

.export-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  box-shadow: 0 2px 8px rgba(59,130,246,0.3);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kanban-columns {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px 16px;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1400px) {
  .kanban-columns {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.kanban-column {
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  min-height: 0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.kanban-column.drag-over {
  background: rgba(139,92,246,0.08);
  border-color: rgba(139,92,246,0.4);
  box-shadow: 0 0 20px rgba(139,92,246,0.15);
}

.column-header {
  flex-shrink: 0;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  border-left: 3px solid;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #e4e4e7;
}

.column-count {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
}

.column-content {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.column-content::-webkit-scrollbar {
  width: 4px;
}
.column-content::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.card-list-move,
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.3s ease;
}
.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.card-list-leave-active {
  position: absolute;
}

.order-card {
  display: flex;
  gap: 4px;
  background: linear-gradient(135deg, rgba(30,30,45,0.9) 0%, rgba(20,20,30,0.95) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;
}

.order-card:active {
  cursor: grabbing;
}

.order-card.dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

.order-card:hover {
  border-color: rgba(139,92,246,0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.order-card.is-urgent {
  border-left: 3px solid #ff3b30;
}

.order-card.is-selected {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(20,20,30,0.95) 100%);
  box-shadow: 0 0 0 1px rgba(139,92,246,0.4), 0 4px 12px rgba(139,92,246,0.15);
}

.card-grip {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.order-card:hover .card-grip {
  opacity: 1;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.card-top-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.priority-tag {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.priority-tag.urgent {
  background: linear-gradient(135deg, #ff3b30, #ff6b60);
  box-shadow: 0 2px 6px rgba(255,59,48,0.4);
}

.priority-tag.normal {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 2px 6px rgba(99,102,241,0.4);
}

.card-id {
  font-size: 10px;
  color: #71717a;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
}

.delete-btn {
  margin-left: auto;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: rgba(255,59,48,0.1);
  color: #ff3b30;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.order-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255,59,48,0.2);
}

.card-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.machine-tag {
  padding: 2px 6px;
  background: rgba(255,255,255,0.06);
  color: #a1a1aa;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: 'Space Grotesk', sans-serif;
}

.series-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #a1a1aa;
}

.card-remark {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 5px 8px;
  background: rgba(139,92,246,0.08);
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 6px;
  font-size: 10px;
  color: #c4b5fd;
  cursor: pointer;
  transition: all 0.2s;
}

.card-remark:hover {
  background: rgba(139,92,246,0.15);
}

.card-add-remark {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 10px;
  color: #71717a;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.card-add-remark:hover {
  border-color: rgba(139,92,246,0.4);
  color: #c4b5fd;
}

.card-result {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: 6px;
}

.result-label {
  font-size: 10px;
  color: #6ee7b7;
}

.result-qty {
  font-size: 12px;
  font-weight: 700;
  color: #10b981;
  font-family: 'Space Grotesk', sans-serif;
}

.result-time {
  margin-left: auto;
  font-size: 9px;
  color: #6ee7b7;
  opacity: 0.7;
}

.card-actions {
  margin-top: 2px;
}

.advance-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 10px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  color: #fff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(59,130,246,0.3);
  font-family: inherit;
}

.advance-btn:hover {
  box-shadow: 0 3px 10px rgba(59,130,246,0.5);
  transform: translateY(-1px);
}

.advance-btn.shelve {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 2px 6px rgba(16,185,129,0.3);
}

.column-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  font-size: 11px;
  color: #52525b;
  opacity: 0.7;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-sm {
  background: linear-gradient(135deg, rgba(25,25,35,0.98) 0%, rgba(18,18,28,0.99) 100%);
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 12px;
  width: 100%;
  max-width: 320px;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #e4e4e7;
  margin: 0 0 14px 0;
  font-family: 'Space Grotesk', sans-serif;
}

.qty-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.qty-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #e4e4e7;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:hover {
  border-color: rgba(139,92,246,0.4);
  background: rgba(139,92,246,0.1);
}

.qty-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
  text-align: center;
  outline: none;
}

.qty-input:focus {
  border-color: #8b5cf6;
}

.qty-hint {
  font-size: 12px;
  color: #71717a;
}

.remark-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e4e4e7;
  font-size: 12px;
  font-family: inherit;
  resize: none;
  outline: none;
  margin-bottom: 14px;
}

.remark-input:focus {
  border-color: #8b5cf6;
}

.handler-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e4e4e7;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  margin-bottom: 14px;
}

.handler-input:focus {
  border-color: #8b5cf6;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 7px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #a1a1aa;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: rgba(255,255,255,0.2);
  color: #e4e4e7;
}

.btn-primary {
  padding: 7px 14px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(139,92,246,0.3);
}

.btn-primary:hover {
  box-shadow: 0 3px 12px rgba(139,92,246,0.5);
}
</style>
