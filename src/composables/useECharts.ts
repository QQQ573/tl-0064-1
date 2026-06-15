import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as echarts from 'echarts'

export function useECharts(containerRef: Ref<HTMLElement | null>) {
  const chartInstance = ref<echarts.ECharts | null>(null)

  function initChart() {
    if (!containerRef.value) return
    chartInstance.value = echarts.init(containerRef.value, 'dark')
  }

  function setOption(option: echarts.EChartsOption) {
    chartInstance.value?.setOption(option, true)
  }

  function resize() {
    chartInstance.value?.resize()
  }

  function dispose() {
    chartInstance.value?.dispose()
    chartInstance.value = null
  }

  onMounted(() => {
    initChart()
  })

  onUnmounted(() => {
    dispose()
  })

  return {
    chartInstance,
    setOption,
    resize,
    dispose,
  }
}
