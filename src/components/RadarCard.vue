<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useFilterStore } from '@/stores/filterStore'
import { useSingleResize } from '@/composables/useResize'
import { useDevice } from '@/composables/useDevice'
import type { SeriesInventory } from '@/types'

const props = defineProps<{
  machineId: number
}>()

const emit = defineEmits<{
  (e: 'dblclick', machineId: number): void
}>()

const inventoryStore = useInventoryStore()
const filterStore = useFilterStore()
const { isReadOnly } = useDevice()

type EChartsInstance = {
  resize: () => void
  dispose: () => void
  setOption: (option: any, notMerge?: boolean) => void
  on: (event: string, handler: (params: any) => void) => void
} | null

const chartContainer = ref<HTMLElement | null>(null)
const chartInstance = ref<EChartsInstance>(null)
const lastClickTime = ref(0)
const CLICK_DELAY = 300
const animationFrame = ref(0)

const machine = computed(() => inventoryStore.getMachineById(props.machineId))
const isHighlighted = computed(() => filterStore.isMachineHighlighted(props.machineId))
const hasLowStock = computed(() => inventoryStore.hasLowStock(props.machineId))
const lowStockIndices = computed(() => {
  if (!machine.value) return []
  return machine.value.series
    .map((s, i) => (s.isLowStock && !s.isRestocked) ? i : -1)
    .filter(i => i >= 0)
})

function getSeriesColor(series: SeriesInventory, index: number): string {
  const seriesDef = inventoryStore.seriesList[index]
  if (series.isLowStock && !series.isRestocked) return '#ff3b30'
  if (series.isRestocked) return '#007aff'
  return seriesDef.color
}

function buildRadarOption(flashState = 0): any {
  if (!machine.value) return {}

  const { seriesList } = inventoryStore
  
  const indicators = seriesList.map((series, index) => {
    const seriesInv = machine.value!.series[index]
    let nameColor = '#a1a1aa'
    if (seriesInv.isLowStock && !seriesInv.isRestocked) {
      nameColor = flashState > 0.5 ? '#ff3b30' : '#ff6b60'
    } else if (seriesInv.isRestocked) {
      nameColor = '#007aff'
    }
    return {
      name: series.name,
      max: 12,
      color: nameColor,
    }
  })

  const stockValues = machine.value.series.map(s => s.stock)

  return {
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      center: ['50%', '55%'],
      radius: '65%',
      axisName: {
        color: (params: any) => {
          const idx = params.indicatorIndex ?? params.dataIndex
          if (idx == null) return '#a1a1aa'
          const seriesInv = machine.value!.series[idx]
          if (!seriesInv) return '#a1a1aa'
          if (seriesInv.isLowStock && !seriesInv.isRestocked) {
            return flashState > 0.5 ? '#ff3b30' : '#ff6b60'
          } else if (seriesInv.isRestocked) {
            return '#007aff'
          }
          return '#a1a1aa'
        },
        fontSize: 10,
        fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: (params: any) => {
          const idx = params.indicatorIndex ?? params.dataIndex
          if (idx == null) return 'normal'
          const seriesInv = machine.value!.series[idx]
          return (seriesInv?.isLowStock && !seriesInv?.isRestocked) ? 'bold' : 'normal'
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.08)',
        },
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.1)',
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: stockValues,
            name: '库存',
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(139,92,246,0.4)' },
                { offset: 1, color: 'rgba(255,45,120,0.15)' },
              ]),
            },
            lineStyle: {
              width: 2,
              color: '#8b5cf6',
            },
            itemStyle: {
              color: '#ff2d78',
            },
          },
        ],
        z: 1,
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,10,15,0.95)',
      borderColor: 'rgba(139,92,246,0.5)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12,
      },
      formatter: () => {
        if (!machine.value) return ''
        return machine.value.series
          .map((s, i) => {
            const series = inventoryStore.seriesList[i]
            let flag = ''
            if (s.isLowStock && !s.isRestocked) flag = ' 🔴低库存'
            else if (s.isRestocked) flag = ' 🔵已补货'
            return `${series.name}: ${s.stock} 盒${flag}`
          })
          .join('<br/>')
      },
    },
  }
}

let animationTimer: number | null = null
let flashState = 0

function initChart() {
  if (!chartContainer.value) return
  
  chartInstance.value = echarts.init(chartContainer.value, 'dark')
  updateChart()
  startAnimation()
  
  chartInstance.value.on('click', (params: any) => {
    const now = Date.now()
    
    if (now - lastClickTime.value < CLICK_DELAY) {
      emit('dblclick', props.machineId)
      lastClickTime.value = 0
      return
    }
    
    lastClickTime.value = now
    
    setTimeout(() => {
      if (lastClickTime.value === now && !isReadOnly.value) {
        handleRadarClick(params)
      }
    }, CLICK_DELAY)
  })
}

function handleRadarClick(params: any) {
  if (!machine.value || isReadOnly.value) return
  
  let targetIndex: number | null = null
  
  if (params.componentType === 'radar' || params.seriesType === 'radar') {
    targetIndex = params.indicatorIndex ?? params.dataIndex ?? null
  }
  
  if (params.name && typeof params.name === 'string') {
    const foundIndex = inventoryStore.seriesList.findIndex(s => s.name === params.name)
    if (foundIndex >= 0) {
      targetIndex = foundIndex
    }
  }
  
  if (targetIndex != null && targetIndex >= 0 && targetIndex < machine.value.series.length) {
    const targetSeries = machine.value.series[targetIndex]
    if (targetSeries.isLowStock && !targetSeries.isRestocked) {
      inventoryStore.markRestocked(props.machineId, targetSeries.seriesId)
    }
  }
}

function handleLegendClick(index: number) {
  if (!machine.value || isReadOnly.value) return
  
  const series = machine.value.series[index]
  if (series.isLowStock && !series.isRestocked) {
    inventoryStore.markRestocked(props.machineId, series.seriesId)
  }
}

function startAnimation() {
  stopAnimation()
  if (lowStockIndices.value.length > 0) {
    const animate = () => {
      flashState = (Math.sin(Date.now() / 400) + 1) / 2
      updateChart(flashState)
      animationTimer = requestAnimationFrame(animate)
    }
    animationTimer = requestAnimationFrame(animate)
  }
}

function stopAnimation() {
  if (animationTimer) {
    cancelAnimationFrame(animationTimer)
    animationTimer = null
  }
}

function updateChart(state = 0) {
  if (!chartInstance.value) return
  const option = buildRadarOption(state)
  chartInstance.value.setOption(option, true)
}

watch(() => machine.value?.series, () => {
  updateChart()
}, { deep: true })

watch(isHighlighted, () => {
  updateChart()
})

watch(lowStockIndices, (newVal, oldVal) => {
  if (newVal.length > 0 && oldVal.length === 0) {
    startAnimation()
  } else if (newVal.length === 0 && oldVal.length > 0) {
    stopAnimation()
    updateChart(0)
  }
})

useSingleResize(chartInstance, 300)

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  stopAnimation()
  chartInstance.value?.dispose()
})
</script>

<template>
  <div
    class="radar-card"
    :class="{
      'opacity-30': !isHighlighted,
      'low-stock-active': hasLowStock && isHighlighted,
      'read-only': isReadOnly,
    }"
  >
    <div class="card-header">
      <span class="machine-id">机器 #{{ machineId }}</span>
      <span v-if="hasLowStock && isHighlighted" class="low-stock-dot"></span>
    </div>
    
    <div ref="chartContainer" class="chart-container"></div>
    
    <div class="stock-legend" v-if="machine">
      <div
        v-for="(series, index) in machine.series"
        :key="series.seriesId"
        class="legend-item"
        :class="{
          'low-stock': series.isLowStock && !series.isRestocked,
          'restocked': series.isRestocked,
          'clickable': series.isLowStock && !series.isRestocked && !isReadOnly,
        }"
        @click="handleLegendClick(index)"
      >
        <span
          class="legend-dot"
          :style="{ backgroundColor: getSeriesColor(series, index) }"
        ></span>
        <span class="legend-text">{{ inventoryStore.seriesList[index].name }}</span>
        <span class="legend-stock">{{ series.stock }}</span>
      </div>
    </div>
    <div v-if="!isReadOnly && hasLowStock && isHighlighted" class="restock-hint">
      点击红色系列标记补货
    </div>
  </div>
</template>

<style scoped>
.radar-card {
  background: linear-gradient(135deg, rgba(20,20,30,0.8) 0%, rgba(15,15,25,0.9) 100%);
  border: 1px solid rgba(139,92,246,0.2);
  border-radius: 16px;
  padding: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.radar-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.radar-card:hover::before {
  opacity: 1;
}

.radar-card:hover {
  border-color: rgba(139,92,246,0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(139,92,246,0.15);
}

.radar-card.low-stock-active {
  border-color: rgba(255,59,48,0.4);
  animation: border-pulse 2s ease-in-out infinite;
}

.radar-card.read-only {
  cursor: default;
}

@keyframes border-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(255,59,48,0); }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.machine-id {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #e4e4e7;
  letter-spacing: 0.5px;
}

.low-stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  animation: pulse-red 1.2s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255,59,48,0.6);
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.chart-container {
  width: 100%;
  height: 180px;
}

.stock-legend {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #a1a1aa;
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}

.legend-item.clickable {
  cursor: pointer;
}

.legend-item.clickable:hover {
  background: rgba(255,59,48,0.15);
  transform: scale(1.02);
}

.legend-item.low-stock {
  animation: text-pulse 1.2s ease-in-out infinite;
}

.legend-item.restocked {
  color: #007aff;
}

@keyframes text-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-item.low-stock .legend-dot {
  box-shadow: 0 0 6px rgba(255,59,48,0.8);
}

.legend-item.restocked .legend-dot {
  box-shadow: 0 0 6px rgba(0,122,255,0.6);
}

.legend-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
}

.legend-stock {
  font-weight: 600;
  color: #e4e4e7;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 10px;
}

.legend-item.low-stock .legend-stock {
  color: #ff3b30;
}

.legend-item.restocked .legend-stock {
  color: #007aff;
}

.restock-hint {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 9px;
  color: #ff3b30;
  opacity: 0.7;
  animation: text-pulse 1.5s ease-in-out infinite;
}
</style>
