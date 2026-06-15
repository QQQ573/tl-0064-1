<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Store, Zap } from 'lucide-vue-next'
import FilterBar from '@/components/FilterBar.vue'
import RadarGrid from '@/components/RadarGrid.vue'
import TimelineSidebar from '@/components/TimelineSidebar.vue'
import ConsumptionModal from '@/components/ConsumptionModal.vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useDevice } from '@/composables/useDevice'

const inventoryStore = useInventoryStore()
const timelineStore = useTimelineStore()
const { isReadOnly } = useDevice()

const showModal = ref(false)
const selectedMachineId = ref<number | null>(null)

function handleMachineDblclick(machineId: number) {
  selectedMachineId.value = machineId
  showModal.value = true
}

function handleCloseModal() {
  showModal.value = false
  selectedMachineId.value = null
}

onMounted(() => {
  timelineStore.loadMockData()
  inventoryStore.loadMockData()
})
</script>

<template>
  <div class="app-container" :class="{ 'read-only': isReadOnly }">
    <header class="app-header">
      <div class="header-brand">
        <div class="brand-icon">
          <Store :size="24" />
        </div>
        <div class="brand-text">
          <h1 class="brand-title">Pop Mart 抽盒机监控</h1>
          <p class="brand-subtitle">上海静安大悦城 · 快闪角</p>
        </div>
      </div>
      <div class="header-status">
        <div class="status-badge live">
          <span class="status-dot"></span>
          <span>实时监控</span>
        </div>
        <div v-if="isReadOnly" class="status-badge readonly">
          <Zap :size="14" />
          <span>iPad 只读模式</span>
        </div>
      </div>
    </header>

    <FilterBar />

    <div class="main-content">
      <div class="content-area">
        <RadarGrid @machine-dblclick="handleMachineDblclick" />
      </div>
      <TimelineSidebar />
    </div>

    <ConsumptionModal
      :visible="showModal"
      :machine-id="selectedMachineId"
      @close="handleCloseModal"
    />

    <div class="app-footer">
      <span class="footer-text">
        双击雷达图查看近6小时消耗趋势 · 点击低库存系列标记补货
      </span>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: 
    radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(255,45,120,0.06) 0%, transparent 50%),
    linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 100%);
  position: relative;
  overflow: hidden;
}

.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: rgba(10,10,15,0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(139,92,246,0.15);
  position: relative;
  z-index: 10;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #ff2d78 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 20px rgba(139,92,246,0.4);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 12px;
  color: #71717a;
  margin: 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.live {
  background: rgba(16,185,129,0.1);
  color: #34d399;
  border: 1px solid rgba(16,185,129,0.3);
}

.status-badge.readonly {
  background: rgba(245,158,11,0.1);
  color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.3);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  animation: pulse-green 2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(52,211,153,0.6); }
  50% { opacity: 0.6; box-shadow: 0 0 12px rgba(52,211,153,0.3); }
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 5;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
}

.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
}

.app-footer {
  padding: 12px 24px;
  background: rgba(10,10,15,0.9);
  border-top: 1px solid rgba(255,255,255,0.05);
  text-align: center;
  position: relative;
  z-index: 10;
}

.footer-text {
  font-size: 11px;
  color: #52525b;
}

.read-only .app-container {
  cursor: default;
}

@media (max-width: 768px) {
  .app-header {
    padding: 16px 20px;
  }
  
  .brand-title {
    font-size: 16px;
  }
  
  .brand-subtitle {
    font-size: 11px;
  }
  
  .header-status {
    display: none;
  }
  
  .app-footer {
    padding: 10px 16px;
  }
}
</style>
