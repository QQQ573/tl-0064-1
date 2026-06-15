<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, AlertTriangle, Package, ChevronRight, ChevronLeft } from 'lucide-vue-next'
import { useTimelineStore } from '@/stores/timelineStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { formatDateTime } from '@/utils'
import { useDevice } from '@/composables/useDevice'

const timelineStore = useTimelineStore()
const inventoryStore = useInventoryStore()
const { isReadOnly } = useDevice()

const isCollapsed = ref(false)

const sortedEvents = computed(() => {
  return [...timelineStore.events].sort((a, b) => b.timestamp - a.timestamp)
})

function getSeriesName(seriesId: string): string {
  return inventoryStore.getSeriesById(seriesId)?.name ?? seriesId
}

function getEventTypeLabel(type: 'low_stock' | 'restocked'): string {
  return type === 'low_stock' ? '低库存预警' : '补货标记'
}

function getEventTypeClass(type: 'low_stock' | 'restocked'): string {
  return type === 'low_stock' ? 'event-low-stock' : 'event-restocked'
}
</script>

<template>
  <div
    class="timeline-sidebar"
    :class="{
      collapsed: isCollapsed,
      'read-only': isReadOnly,
    }"
  >
    <div class="sidebar-header">
      <div class="header-content" v-show="!isCollapsed">
        <Clock :size="16" class="text-purple-400" />
        <span class="header-title">历史记录</span>
        <span class="event-count">{{ timelineStore.events.length }}</span>
      </div>
      <button class="toggle-btn" @click="isCollapsed = !isCollapsed">
        <component :is="isCollapsed ? ChevronLeft : ChevronRight" :size="16" />
      </button>
    </div>

    <div class="sidebar-content" v-show="!isCollapsed">
      <div v-if="sortedEvents.length === 0" class="empty-state">
        <Clock :size="32" class="text-zinc-600 mb-2" />
        <span class="text-zinc-500 text-sm">暂无历史记录</span>
      </div>

      <div v-else class="timeline-list">
        <div
          v-for="event in sortedEvents"
          :key="event.id"
          class="timeline-item"
          :class="getEventTypeClass(event.eventType)"
        >
          <div class="timeline-dot">
            <component
              :is="event.eventType === 'low_stock' ? AlertTriangle : Package"
              :size="12"
            />
          </div>
          <div class="timeline-content">
            <div class="event-header">
              <span class="event-type">{{ getEventTypeLabel(event.eventType) }}</span>
              <span class="event-machine">#{{ event.machineId }}</span>
            </div>
            <div class="event-details">
              <span class="event-series">{{ getSeriesName(event.seriesId) }}</span>
              <span class="event-stock">库存: {{ event.stockLevel }}盒</span>
            </div>
            <span class="event-time">{{ formatDateTime(event.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-collapsed" v-show="isCollapsed">
      <div class="collapsed-icon">
        <Clock :size="20" class="text-purple-400" />
      </div>
      <div class="collapsed-count">
        {{ timelineStore.events.length }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-sidebar {
  width: 320px;
  background: linear-gradient(180deg, rgba(15,15,25,0.95) 0%, rgba(10,10,15,0.98) 100%);
  border-left: 1px solid rgba(139,92,246,0.2);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
}

.timeline-sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #e4e4e7;
}

.event-count {
  background: linear-gradient(135deg, #8b5cf6 0%, #ff2d78 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}

.toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  color: #a1a1aa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #e4e4e7;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  position: relative;
  transition: all 0.2s ease;
}

.timeline-item:hover {
  background: rgba(255,255,255,0.04);
  transform: translateX(-2px);
}

.timeline-item.event-low-stock {
  border-left: 3px solid #ff3b30;
}

.timeline-item.event-restocked {
  border-left: 3px solid #007aff;
}

.timeline-dot {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.event-low-stock .timeline-dot {
  background: rgba(255,59,48,0.15);
  color: #ff3b30;
}

.event-restocked .timeline-dot {
  background: rgba(0,122,255,0.15);
  color: #007aff;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.event-type {
  font-size: 12px;
  font-weight: 600;
}

.event-low-stock .event-type {
  color: #ff3b30;
}

.event-restocked .event-type {
  color: #007aff;
}

.event-machine {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  color: #a1a1aa;
  background: rgba(255,255,255,0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.event-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.event-series {
  font-size: 11px;
  font-weight: 500;
  color: #e4e4e7;
}

.event-stock {
  font-size: 10px;
  color: #71717a;
}

.event-time {
  font-size: 10px;
  color: #52525b;
}

.sidebar-collapsed {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 8px;
}

.collapsed-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(139,92,246,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapsed-count {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
}

@media (max-width: 1024px) {
  .timeline-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    height: 100vh;
    z-index: 200;
    transform: translateX(100%);
  }
  
  .timeline-sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  
  .timeline-sidebar.collapsed {
    transform: translateX(calc(100% - 60px));
  }
}
</style>
