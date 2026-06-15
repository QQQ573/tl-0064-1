<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { X, TrendingDown } from 'lucide-vue-next'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useSingleResize } from '@/composables/useResize'
import { formatTime } from '@/utils'

const props = defineProps<{
  visible: boolean
  machineId: number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const inventoryStore = useInventoryStore()

type EChartsInstance = {
  resize: () => void
  dispose: () => void
  setOption: (option: any, notMerge?: boolean) => void
  on: (event: string, handler: (params: any) => void) => void
} | null

const chartContainer = ref<HTMLElement | null>(null)
const chartInstance = ref<EChartsInstance>(null)

const machine = computed(() => {
  if (props.machineId == null) return null
  return inventoryStore.getMachineById(props.machineId)
})

const timeLabels = computed(() => {
  if (!machine.value) return []
  const timestamps = [...new Set(machine.value.lastConsumption.map(p => p.timestamp))]
  return timestamps.sort((a, b) => a - b).map(t => formatTime(t))
})

function buildLineOption(): any {
  if (!machine.value) return {}

  const { seriesList } = inventoryStore
  const timestamps = [...new Set(machine.value.lastConsumption.map(p => p.timestamp))].sort((a, b) => a - b)

  const series = seriesList.map(seriesDef => {
    const data = timestamps.map(ts => {
      const point = machine.value!.lastConsumption.find(
        p => p.timestamp === ts && p.seriesId === seriesDef.id
      )
      return point?.consumed ?? 0
    })

    return {
      name: seriesDef.name,
      type: 'line',
      data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 3,
        color: seriesDef.color,
        shadowColor: seriesDef.color + '80',
        shadowBlur: 8,
      },
      itemStyle: {
        color: seriesDef.color,
        borderWidth: 2,
        borderColor: '#fff',
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 5,
        },
        itemStyle: {
          borderWidth: 3,
        },
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: seriesDef.color + '30' },
          { offset: 1, color: seriesDef.color + '00' },
        ]),
      },
    }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,10,15,0.98)',
      borderColor: 'rgba(139,92,246,0.6)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 13,
      },
      padding: [12, 16],
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: 'rgba(139,92,246,0.4)',
          type: 'dashed',
          width: 1,
        },
        label: {
          backgroundColor: 'rgba(139,92,246,0.8)',
          color: '#fff',
          fontSize: 11,
        },
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#e4e4e7">⏰ ${params[0].axisValue}</div>`
        params.forEach((p: any) => {
          html += `
            <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};box-shadow:0 0 6px ${p.color}"></span>
              <span style="flex:1;color:#a1a1aa">${p.seriesName}</span>
              <span style="font-weight:700;color:#fff;font-family:'Space Grotesk',sans-serif">${p.value} 盒</span>
            </div>
          `
        })
        const total = params.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
        html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between">
          <span style="color:#71717a">合计消耗</span>
          <span style="font-weight:700;color:#8b5cf6;font-family:'Space Grotesk',sans-serif">${total} 盒</span>
        </div>`
        return html
      },
    },
    legend: {
      data: seriesList.map(s => s.name),
      top: 10,
      textStyle: {
        color: '#a1a1aa',
        fontSize: 12,
        fontWeight: 500,
      },
      itemWidth: 20,
      itemHeight: 10,
      itemGap: 20,
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: 70,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timestamps.map(t => formatTime(t)),
      axisLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
        },
      },
      axisLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'Space Grotesk, sans-serif',
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '消耗盒数',
      nameTextStyle: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: 500,
        padding: [0, 0, 10, 0],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontFamily: 'Space Grotesk, sans-serif',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.06)',
          type: 'dashed',
        },
      },
    },
    series: series as echarts.EChartsOption['series'],
  }
}

function initChart() {
  if (!chartContainer.value) return
  chartInstance.value = echarts.init(chartContainer.value, 'dark')
  updateChart()
}

function updateChart() {
  if (!chartInstance.value) return
  const option = buildLineOption()
  chartInstance.value.setOption(option, true)
}

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      await nextTick()
      if (!chartInstance.value) {
        initChart()
      } else {
        updateChart()
        chartInstance.value.resize()
      }
    }
  }
)

watch(
  () => props.machineId,
  () => {
    if (props.visible) {
      updateChart()
    }
  }
)

useSingleResize(chartInstance, 300)

onMounted(() => {
  if (props.visible) {
    initChart()
  }
})

onUnmounted(() => {
  chartInstance.value?.dispose()
})

function handleClose() {
  emit('close')
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click="handleOverlayClick"
      >
        <div class="modal-container">
          <div class="modal-header">
            <div class="header-left">
              <TrendingDown :size="18" class="text-purple-400" />
              <span class="modal-title">
                机器 #{{ machineId }} - 近6小时消耗趋势
              </span>
            </div>
            <button class="close-btn" @click="handleClose">
              <X :size="18" />
            </button>
          </div>

          <div class="modal-body">
            <div ref="chartContainer" class="chart-container"></div>
          </div>

          <div class="modal-footer">
            <div class="footer-info">
              <span class="info-label">数据更新时间</span>
              <span class="info-value">
                {{ machine ? formatTime(machine.series[0]?.lastUpdated ?? Date.now()) : '--' }}
              </span>
            </div>
            <div class="footer-hint">
              每30分钟统计一次端盒消耗数量
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: linear-gradient(135deg, rgba(20,20,30,0.98) 0%, rgba(15,15,25,0.99) 100%);
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5),
              0 0 40px rgba(139,92,246,0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #e4e4e7;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  color: #a1a1aa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.3);
  color: #f87171;
}

.modal-body {
  flex: 1;
  padding: 24px 28px;
  min-height: 450px;
}

.chart-container {
  width: 100%;
  height: 420px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
  border-radius: 0 0 16px 16px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 11px;
  color: #71717a;
}

.info-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
  background: rgba(255,255,255,0.05);
  padding: 4px 10px;
  border-radius: 6px;
}

.footer-hint {
  font-size: 11px;
  color: #52525b;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-header {
    padding: 16px;
  }
  
  .modal-body {
    padding: 16px;
    min-height: 300px;
  }
  
  .chart-container {
    height: 280px;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding: 12px 16px;
  }
}
</style>
