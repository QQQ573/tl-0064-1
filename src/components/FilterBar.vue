<script setup lang="ts">
import { ref } from 'vue'
import { X, Filter, Eye, EyeOff } from 'lucide-vue-next'
import { useFilterStore } from '@/stores/filterStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useDevice } from '@/composables/useDevice'

const filterStore = useFilterStore()
const inventoryStore = useInventoryStore()
const { isReadOnly } = useDevice()

const showSeriesFilter = ref(false)

const machineIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
</script>

<template>
  <div class="filter-bar" :class="{ 'read-only': isReadOnly }">
    <div class="filter-section">
      <span class="filter-label">
        <Filter :size="14" class="inline mr-1" />
        机器筛选
      </span>
      <div class="filter-buttons">
        <button
          v-for="id in machineIds"
          :key="id"
          class="filter-btn"
          :class="{ active: filterStore.selectedMachines.includes(id) }"
          @click="filterStore.toggleMachine(id)"
        >
          #{{ id }}
        </button>
      </div>
    </div>

    <div class="filter-section">
      <span class="filter-label">系列筛选</span>
      <button
        class="toggle-btn"
        @click="showSeriesFilter = !showSeriesFilter"
      >
        <component :is="showSeriesFilter ? EyeOff : Eye" :size="14" class="inline mr-1" />
        {{ showSeriesFilter ? '收起' : '展开' }}
      </button>
      
      <div v-if="showSeriesFilter" class="filter-buttons series-buttons">
        <button
          v-for="series in inventoryStore.seriesList"
          :key="series.id"
          class="filter-btn series-btn"
          :class="{ active: filterStore.selectedSeries.includes(series.id) }"
          :style="{ '--series-color': series.color }"
          @click="filterStore.toggleSeries(series.id)"
        >
          <span
            class="series-dot"
            :style="{ backgroundColor: series.color }"
          ></span>
          {{ series.name }}
          <span v-if="series.hasHidden" class="hidden-badge">隐</span>
        </button>
      </div>
    </div>

    <div class="filter-section">
      <label class="toggle-switch">
        <input
          type="checkbox"
          :checked="filterStore.hasHiddenOnly"
          @change="filterStore.setHasHiddenOnly(($event.target as HTMLInputElement).checked)"
        />
        <span class="toggle-slider"></span>
        <span class="toggle-label">仅显示含隐藏款</span>
      </label>
    </div>

    <button
      v-if="filterStore.hasActiveFilters"
      class="clear-btn"
      @click="filterStore.clearFilters()"
    >
      <X :size="14" class="inline mr-1" />
      清除筛选
    </button>
  </div>
</template>

<style scoped>
.filter-bar {
  background: linear-gradient(180deg, rgba(15,15,25,0.95) 0%, rgba(10,10,15,0.9) 100%);
  border-bottom: 1px solid rgba(139,92,246,0.2);
  padding: 16px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 9999px;
  background: rgba(139,92,246,0.05);
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-btn:hover {
  border-color: rgba(139,92,246,0.6);
  background: rgba(139,92,246,0.1);
  color: #e4e4e7;
}

.filter-btn.active {
  background: linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(255,45,120,0.3) 100%);
  border-color: rgba(139,92,246,0.8);
  color: #fff;
  box-shadow: 0 0 12px rgba(139,92,246,0.3);
}

.series-buttons {
  width: 100%;
  margin-top: 8px;
}

.series-btn {
  padding: 6px 10px;
}

.series-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hidden-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: #fff;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.toggle-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  color: #a1a1aa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.toggle-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #e4e4e7;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-switch input {
  display: none;
}

.toggle-slider {
  width: 36px;
  height: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #a1a1aa;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.3s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #8b5cf6 0%, #ff2d78 100%);
}

.toggle-switch input:checked + .toggle-slider::before {
  left: 18px;
  background: #fff;
}

.toggle-label {
  font-size: 12px;
  color: #a1a1aa;
}

.clear-btn {
  margin-left: auto;
  padding: 8px 16px;
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px;
  background: rgba(239,68,68,0.05);
  color: #f87171;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.clear-btn:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.6);
}

@media (max-width: 768px) {
  .filter-bar {
    padding: 12px 16px;
    gap: 12px;
  }
  
  .clear-btn {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
}
</style>
