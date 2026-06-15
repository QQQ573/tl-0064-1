import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useDevice() {
  const isLandscape = ref(false)
  const isIPad = ref(false)

  const isReadOnly = computed(() => isIPad.value && isLandscape.value)

  function checkOrientation() {
    isIPad.value = /iPad/.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    isLandscape.value = window.innerWidth > window.innerHeight
  }

  onMounted(() => {
    checkOrientation()
    window.addEventListener('orientationchange', checkOrientation)
    window.addEventListener('resize', checkOrientation)
  })

  onUnmounted(() => {
    window.removeEventListener('orientationchange', checkOrientation)
    window.removeEventListener('resize', checkOrientation)
  })

  return {
    isIPad,
    isLandscape,
    isReadOnly,
  }
}
