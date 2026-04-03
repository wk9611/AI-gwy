<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuestionCard from '../components/QuestionCard.vue'
import { getRandomQuestions, addWrongRecord } from '../api'

const route = useRoute()
const router = useRouter()
const category = decodeURIComponent(route.params.category)

const questions = ref([])
const currentIndex = ref(0)
const loading = ref(true)
const mode = ref('sequential') // sequential | random
const practiceCount = ref(20)
const stats = ref({ total: 0, correct: 0, wrong: 0 })
const finished = ref(false)

const currentQuestion = computed(() => questions.value[currentIndex.value])
const progress = computed(() => questions.value.length ? ((currentIndex.value + 1) / questions.value.length * 100) : 0)

onMounted(() => loadQuestions())

async function loadQuestions() {
  loading.value = true
  try {
    const { data } = await getRandomQuestions({ category, count: practiceCount.value })
    questions.value = data
    currentIndex.value = 0
    stats.value = { total: 0, correct: 0, wrong: 0 }
    finished.value = false
  } finally {
    loading.value = false
  }
}

async function handleAnswer({ questionId, userAnswer, isCorrect }) {
  stats.value.total++
  if (isCorrect) {
    stats.value.correct++
  } else {
    stats.value.wrong++
    await addWrongRecord({ questionId, userAnswer })
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
  } else {
    finished.value = true
  }
}
</script>

<template>
  <div class="practice">
    <div class="practice-header">
      <el-page-header @back="router.push('/')">
        <template #content>
          <span class="header-title">{{ category }} · 专项练习</span>
        </template>
      </el-page-header>

      <div class="practice-controls">
        <el-select v-model="practiceCount" @change="loadQuestions" style="width: 120px">
          <el-option :value="10" label="10题/组" />
          <el-option :value="20" label="20题/组" />
          <el-option :value="50" label="50题/组" />
        </el-select>
        <el-button @click="loadQuestions">
          <el-icon><RefreshRight /></el-icon>
          换一组
        </el-button>
      </div>
    </div>

    <div class="stats-bar">
      <el-progress :percentage="progress" :stroke-width="8" :show-text="false" />
      <div class="stats-text">
        <span>进度: {{ currentIndex + 1 }}/{{ questions.length }}</span>
        <span style="color:#67c23a">✓ {{ stats.correct }}</span>
        <span style="color:#f56c6c">✗ {{ stats.wrong }}</span>
      </div>
    </div>

    <div v-loading="loading">
      <div v-if="!finished && currentQuestion">
        <QuestionCard
          :key="currentQuestion.id"
          :question="currentQuestion"
          :index="currentIndex + 1"
          mode="practice"
          @answer="handleAnswer"
          @next="nextQuestion"
        />
      </div>

      <el-result v-else-if="finished" icon="success" title="练习完成！">
        <template #sub-title>
          <p>共 {{ stats.total }} 题，正确 {{ stats.correct }} 题，错误 {{ stats.wrong }} 题</p>
          <p>正确率: {{ stats.total ? Math.round(stats.correct / stats.total * 100) : 0 }}%</p>
        </template>
        <template #extra>
          <el-button type="primary" @click="loadQuestions">再练一组</el-button>
          <el-button @click="router.push('/wrong-book')">查看错题本</el-button>
          <el-button @click="router.push('/')">返回首页</el-button>
        </template>
      </el-result>

      <el-empty v-else-if="!loading && questions.length === 0" description="该分类暂无题目，请先导入题目">
        <el-button type="primary" @click="router.push('/admin/import')">去导入题目</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
}
.practice-controls {
  display: flex;
  gap: 8px;
}
.stats-bar {
  margin-bottom: 20px;
}
.stats-text {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
}
</style>
