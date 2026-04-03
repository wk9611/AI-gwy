<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuestionCard from '../components/QuestionCard.vue'
import { getExamRecord, getQuestion } from '../api'

const route = useRoute()
const router = useRouter()
const record = ref(null)
const questions = ref([])
const loading = ref(true)
const showWrongOnly = ref(false)

const displayQuestions = computed(() => {
  if (!record.value) return []
  const answersMap = new Map(record.value.answers.map((a) => [a.questionId, a]))
  return questions.value
    .map((q) => ({ ...q, answerDetail: answersMap.get(q.id) }))
    .filter((q) => !showWrongOnly.value || !q.answerDetail?.isCorrect)
})

const durationDisplay = computed(() => {
  if (!record.value) return ''
  const m = Math.floor(record.value.duration / 60)
  const s = record.value.duration % 60
  return `${m}分${s}秒`
})

// 按分类统计
const categoryStats = computed(() => {
  if (!record.value) return []
  const stats = {}
  for (const q of questions.value) {
    if (!stats[q.category]) stats[q.category] = { total: 0, correct: 0 }
    stats[q.category].total++
    const detail = record.value.answers.find((a) => a.questionId === q.id)
    if (detail?.isCorrect) stats[q.category].correct++
  }
  return Object.entries(stats).map(([cat, s]) => ({
    category: cat,
    total: s.total,
    correct: s.correct,
    rate: Math.round((s.correct / s.total) * 100),
  }))
})

onMounted(async () => {
  try {
    const { data } = await getExamRecord(route.params.id)
    record.value = data

    const qList = await Promise.all(
      data.answers.map((a) => getQuestion(a.questionId).then((r) => r.data).catch(() => null))
    )
    questions.value = qList.filter(Boolean)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="exam-result" v-loading="loading">
    <el-page-header @back="router.push('/')" style="margin-bottom:20px">
      <template #content><span>考试结果</span></template>
    </el-page-header>

    <template v-if="record">
      <el-row :gutter="16" class="score-cards">
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color:#409eff">{{ record.score }}</div>
            <div class="score-label">得分</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color:#67c23a">{{ record.correctCount }}</div>
            <div class="score-label">正确</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color:#f56c6c">{{ record.totalCount - record.correctCount }}</div>
            <div class="score-label">错误</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color:#e6a23c">{{ durationDisplay }}</div>
            <div class="score-label">用时</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card style="margin-bottom:20px">
        <h4 style="margin-bottom:12px">各题型正确率</h4>
        <div v-for="s in categoryStats" :key="s.category" class="cat-stat">
          <span class="cat-name">{{ s.category }}</span>
          <el-progress :percentage="s.rate" :stroke-width="14" style="flex:1">
            <span>{{ s.correct }}/{{ s.total }}</span>
          </el-progress>
        </div>
      </el-card>

      <div class="filter-bar">
        <el-switch v-model="showWrongOnly" active-text="只看错题" />
        <span class="result-count">共 {{ displayQuestions.length }} 题</span>
      </div>

      <QuestionCard
        v-for="(q, idx) in displayQuestions"
        :key="q.id"
        :question="q"
        :index="idx + 1"
        :show-answer="true"
        mode="review"
      />

      <div style="text-align:center;margin-top:24px">
        <el-button type="primary" @click="router.push('/exam')">再考一次</el-button>
        <el-button @click="router.push('/wrong-book')">查看错题本</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.score-cards { margin-bottom: 20px; }
.score-card { text-align: center; }
.score-value { font-size: 32px; font-weight: 700; }
.score-label { color: #909399; font-size: 14px; margin-top: 4px; }
.cat-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.cat-name { width: 80px; font-size: 14px; color: #606266; flex-shrink: 0; }
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.result-count { color: #909399; font-size: 14px; }
</style>
