<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  duration: { type: Number, required: true }, // 总时长（秒）
})

const emit = defineEmits(['timeout'])

const remaining = ref(props.duration)
let timer = null

const display = computed(() => {
  const h = Math.floor(remaining.value / 3600)
  const m = Math.floor((remaining.value % 3600) / 60)
  const s = remaining.value % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const isWarning = computed(() => remaining.value < 600) // 最后10分钟
const isDanger = computed(() => remaining.value < 120) // 最后2分钟

const elapsed = computed(() => props.duration - remaining.value)

onMounted(() => {
  timer = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      clearInterval(timer)
      emit('timeout')
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

defineExpose({ elapsed, remaining })
</script>

<template>
  <div class="timer" :class="{ warning: isWarning, danger: isDanger }">
    <el-icon><Timer /></el-icon>
    <span class="time-display">{{ display }}</span>
  </div>
</template>

<style scoped>
.timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #303133;
  padding: 8px 16px;
  background: #f0f2f5;
  border-radius: 8px;
}
.timer.warning {
  color: #e6a23c;
  background: #fdf6ec;
}
.timer.danger {
  color: #f56c6c;
  background: #fef0f0;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
