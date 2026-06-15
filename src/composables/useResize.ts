import { onMounted, onUnmounted, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

type EChartsInstance = {
  resize: () => void
  dispose: () => void
  setOption: (option: any, notMerge?: boolean) => void
  on: (event: string, handler: (params: any) => void) => void
} | null

export function useResize(chartRefs: Ref<EChartsInstance>[], delay = 300) {
  const debouncedResize = useDebounceFn(() => {
    chartRefs.forEach(chartRef => {
      chartRef.value?.resize()
    })
  }, delay)

  onMounted(() => {
    window.addEventListener('resize', debouncedResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedResize)
  })

  return {
    debouncedResize,
  }
}

export function useSingleResize(chartRef: Ref<EChartsInstance>, delay = 300) {
  const debouncedResize = useDebounceFn(() => {
    chartRef.value?.resize()
  }, delay)

  onMounted(() => {
    window.addEventListener('resize', debouncedResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedResize)
  })

  return {
    debouncedResize,
  }
}
