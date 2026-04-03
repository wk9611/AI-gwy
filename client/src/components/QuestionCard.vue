<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, default: 0 },
  showAnswer: { type: Boolean, default: false },
  mode: { type: String, default: 'practice' }, // practice | exam | review
})

const emit = defineEmits(['answer', 'next'])

const selectedAnswer = ref(null)
const isAnswered = ref(false)

const options = computed(() => [
  { label: 'A', text: props.question.optionA },
  { label: 'B', text: props.question.optionB },
  { label: 'C', text: props.question.optionC },
  { label: 'D', text: props.question.optionD },
])

const isCorrect = computed(() => selectedAnswer.value === props.question.answer)

function selectAnswer(label) {
  if (props.mode === 'exam') {
    selectedAnswer.value = label
    emit('answer', { questionId: props.question.id, userAnswer: label })
    return
  }
  if (isAnswered.value) return
  selectedAnswer.value = label
  isAnswered.value = true
  emit('answer', {
    questionId: props.question.id,
    userAnswer: label,
    isCorrect: label === props.question.answer,
  })
}

function getOptionClass(label) {
  if (props.mode === 'exam') {
    return selectedAnswer.value === label ? 'selected' : ''
  }
  if (!isAnswered.value && !props.showAnswer) return ''
  if (label === props.question.answer) return 'correct'
  if (selectedAnswer.value === label && label !== props.question.answer) return 'wrong'
  return ''
}

function reset() {
  selectedAnswer.value = null
  isAnswered.value = false
}

defineExpose({ reset, selectedAnswer })
</script>

<template>
  <el-card class="question-card">
    <div class="question-header">
      <el-tag size="small" type="info">{{ question.category }}</el-tag>
      <el-tag v-if="question.year" size="small">{{ question.year }}年</el-tag>
      <el-tag v-if="question.difficulty" size="small" :type="question.difficulty >= 4 ? 'danger' : question.difficulty >= 3 ? 'warning' : 'success'">
        难度 {{ question.difficulty }}
      </el-tag>
    </div>

    <div class="question-content">
      <span class="question-index" v-if="index">{{ index }}.</span>
      {{ question.content }}
    </div>

    <div class="options">
      <div
        v-for="opt in options"
        :key="opt.label"
        class="option-item"
        :class="getOptionClass(opt.label)"
        @click="selectAnswer(opt.label)"
      >
        <span class="option-label">{{ opt.label }}</span>
        <span class="option-text">{{ opt.text }}</span>
      </div>
    </div>

    <div v-if="(isAnswered || showAnswer) && mode !== 'exam'" class="answer-section">
      <el-divider />
      <div class="answer-line">
        <el-icon :color="isCorrect || showAnswer ? '#67c23a' : '#f56c6c'">
          <component :is="isCorrect || showAnswer ? 'CircleCheckFilled' : 'CircleCloseFilled'" />
        </el-icon>
        <span>正确答案：<strong>{{ question.answer }}</strong></span>
        <span v-if="selectedAnswer && !isCorrect">　你的答案：<strong style="color:#f56c6c">{{ selectedAnswer }}</strong></span>
      </div>

      <div class="explanation" v-if="question.explanation">
        <h5>答案解析</h5>
        <p>{{ question.explanation }}</p>
      </div>

      <div class="knowledge-point" v-if="question.knowledgePoint">
        <h5>知识点</h5>
        <el-tag type="info">{{ question.knowledgePoint }}</el-tag>
      </div>

      <div class="next-action" v-if="mode === 'practice'">
        <el-button type="primary" @click="emit('next')">下一题</el-button>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.question-card {
  margin-bottom: 16px;
}
.question-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.question-content {
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 16px;
}
.question-index {
  font-weight: 600;
  color: #409eff;
  margin-right: 4px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 10px;
}
.option-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.option-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.option-item.correct {
  border-color: #67c23a;
  background: #f0f9eb;
}
.option-item.wrong {
  border-color: #f56c6c;
  background: #fef0f0;
}
.option-label {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
  color: #606266;
}
.option-item.correct .option-label { background: #67c23a; color: #fff; }
.option-item.wrong .option-label { background: #f56c6c; color: #fff; }
.option-item.selected .option-label { background: #409eff; color: #fff; }
.option-text {
  line-height: 24px;
  color: #303133;
}
.answer-section {
  margin-top: 8px;
}
.answer-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  margin-bottom: 12px;
}
.explanation, .knowledge-point {
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.explanation h5, .knowledge-point h5 {
  font-size: 14px;
  color: #909399;
  margin-bottom: 6px;
}
.explanation p {
  line-height: 1.8;
  color: #606266;
}
.next-action {
  text-align: center;
  margin-top: 12px;
}
</style>
