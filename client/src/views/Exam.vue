<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import QuestionCard from '../components/QuestionCard.vue'
import TimerComp from '../components/Timer.vue'
import { generateExam, submitExam } from '../api'

const router = useRouter()

const stage = ref('config') // config | exam | submitting
const questions = ref([])
const currentIndex = ref(0)
const answers = ref({}) // { questionId: userAnswer }
const duration = ref(7200) // 秒
const totalCount = ref(120)
const timerRef = ref(null)
const loading = ref(false)

const currentQuestion = computed(() => questions.value[currentIndex.value])
const answeredCount = computed(() => Object.keys(answers.value).length)
const progress = computed(() => questions.value.length ? (answeredCount.value / questions.value.length * 100) : 0)

async function startExam() {
  loading.value = true
  try {
    const { data } = await generateExam({ totalCount: totalCount.value })
    questions.value = data.questions
    duration.value = data.duration
    answers.value = {}
    currentIndex.value = 0
    stage.value = 'exam'
  } finally {
    loading.value = false
  }
}

function handleAnswer({ questionId, userAnswer }) {
  answers.value[questionId] = userAnswer
}

async function handleSubmit() {
  const unanswered = questions.value.length - answeredCount.value
  if (unanswered > 0) {
    try {
      await ElMessageBox.confirm(
        `还有 ${unanswered} 题未作答，确定交卷吗？`,
        '提示',
        { confirmButtonText: '确定交卷', cancelButtonText: '继续做题', type: 'warning' }
      )
    } catch {
      return
    }
  }

  stage.value = 'submitting'
  const answerList = questions.value.map((q) => ({
    questionId: q.id,
    userAnswer: answers.value[q.id] || '',
  }))

  const elapsed = timerRef.value?.elapsed || 0
  const { data } = await submitExam({ answers: answerList, duration: elapsed })
  router.push(`/exam/result/${data.id}`)
}

function handleTimeout() {
  ElMessage.warning('考试时间到，自动交卷！')
  handleSubmit()
}

function goTo(idx) {
  currentIndex.value = idx
}
</script>

<template>
  <div class="exam">
    <!-- 考试配置 -->
    <div v-if="stage === 'config'" class="exam-config">
      <el-card>
        <h2 style="text-align:center;margin-bottom:24px">模拟考试</h2>
        <el-form label-width="100px" style="max-width:400px;margin:0 auto">
          <el-form-item label="题目数量">
            <el-select v-model="totalCount">
              <el-option :value="30" label="30题（快速练习）" />
              <el-option :value="60" label="60题（半套卷）" />
              <el-option :value="120" label="120题（完整模考）" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" @click="startExam" :loading="loading" style="width:100%">
              开始考试
            </el-button>
          </el-form-item>
        </el-form>
        <div style="text-align:center;color:#909399;font-size:14px;margin-top:16px">
          <p>• 从六大题型按比例随机抽题</p>
          <p>• 考试时长120分钟，时间到自动交卷</p>
          <p>• 答错的题目自动加入错题本</p>
        </div>
      </el-card>
    </div>

    <!-- 考试进行中 -->
    <div v-else-if="stage === 'exam'" class="exam-active">
      <div class="exam-toolbar">
        <TimerComp ref="timerRef" :duration="duration" @timeout="handleTimeout" />
        <div class="exam-progress">
          <span>已答: {{ answeredCount }}/{{ questions.length }}</span>
          <el-progress :percentage="progress" :stroke-width="6" :show-text="false" style="width:200px" />
        </div>
        <el-button type="danger" @click="handleSubmit">交卷</el-button>
      </div>

      <div class="exam-body">
        <div class="exam-main">
          <QuestionCard
            v-if="currentQuestion"
            :key="currentQuestion.id"
            :question="currentQuestion"
            :index="currentIndex + 1"
            mode="exam"
            @answer="handleAnswer"
          />
          <div class="nav-buttons">
            <el-button :disabled="currentIndex === 0" @click="currentIndex--">上一题</el-button>
            <el-button :disabled="currentIndex >= questions.length - 1" @click="currentIndex++">下一题</el-button>
          </div>
        </div>

        <div class="answer-sheet">
          <h4>答题卡</h4>
          <div class="sheet-grid">
            <div
              v-for="(q, idx) in questions"
              :key="q.id"
              class="sheet-item"
              :class="{
                active: idx === currentIndex,
                answered: answers[q.id],
              }"
              @click="goTo(idx)"
            >
              {{ idx + 1 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提交中 -->
    <div v-else class="submitting">
      <el-card style="text-align:center;padding:40px">
        <el-icon :size="48" class="is-loading" color="#409eff"><Loading /></el-icon>
        <p style="margin-top:16px;font-size:16px">正在批改试卷...</p>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.exam-config {
  max-width: 600px;
  margin: 40px auto;
}
.exam-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  flex-wrap: wrap;
  gap: 12px;
}
.exam-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}
.exam-body {
  display: flex;
  gap: 16px;
}
.exam-main {
  flex: 1;
}
.nav-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.answer-sheet {
  width: 240px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  height: fit-content;
  position: sticky;
  top: 80px;
}
.answer-sheet h4 {
  margin-bottom: 12px;
  font-size: 15px;
}
.sheet-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.sheet-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.sheet-item:hover { border-color: #409eff; }
.sheet-item.active { border-color: #409eff; background: #ecf5ff; font-weight: 600; }
.sheet-item.answered { background: #67c23a; color: #fff; border-color: #67c23a; }
.submitting { max-width: 400px; margin: 80px auto; }

@media (max-width: 768px) {
  .exam-body { flex-direction: column; }
  .answer-sheet { width: 100%; position: static; }
  .sheet-grid { grid-template-columns: repeat(10, 1fr); }
}
</style>
