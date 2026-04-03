<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QuestionCard from '../components/QuestionCard.vue'
import { getWrongBook, getWrongStats, masterWrong, unmasterWrong, deleteWrong } from '../api'

const router = useRouter()
const wrongList = ref([])
const stats = ref([])
const loading = ref(true)
const activeCategory = ref('')
const showMastered = ref(false)
const practiceMode = ref(false)
const currentIndex = ref(0)

const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析']

onMounted(async () => {
  await Promise.all([loadWrongBook(), loadStats()])
})

async function loadWrongBook() {
  loading.value = true
  try {
    const { data } = await getWrongBook({
      category: activeCategory.value || undefined,
      mastered: showMastered.value ? undefined : 'false',
    })
    wrongList.value = data.data || []
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  const { data } = await getWrongStats()
  stats.value = data
}

async function handleMaster(record) {
  if (record.mastered) {
    await unmasterWrong(record.id)
  } else {
    await masterWrong(record.id)
  }
  await loadWrongBook()
  await loadStats()
}

async function handleDelete(record) {
  await ElMessageBox.confirm('确定删除该错题记录？', '提示', { type: 'warning' })
  await deleteWrong(record.id)
  await loadWrongBook()
  await loadStats()
}

function startPractice() {
  practiceMode.value = true
  currentIndex.value = 0
}

function nextWrong() {
  if (currentIndex.value < wrongList.value.length - 1) {
    currentIndex.value++
  } else {
    practiceMode.value = false
    ElMessage.success('错题复习完成！')
  }
}

function filterByCategory(cat) {
  activeCategory.value = activeCategory.value === cat ? '' : cat
  loadWrongBook()
}
</script>

<template>
  <div class="wrong-book">
    <el-page-header @back="router.push('/')" style="margin-bottom:20px">
      <template #content><span>错题本</span></template>
      <template #extra>
        <el-button type="primary" :disabled="wrongList.length === 0" @click="startPractice">
          <el-icon><Refresh /></el-icon>
          错题重练
        </el-button>
      </template>
    </el-page-header>

    <!-- 统计概览 -->
    <div class="stats-bar" v-if="stats.length">
      <div
        v-for="s in stats"
        :key="s.category"
        class="stat-chip"
        :class="{ active: activeCategory === s.category }"
        @click="filterByCategory(s.category)"
      >
        {{ s.category }}
        <el-badge :value="s.count" :type="s.count > 0 ? 'danger' : 'info'" />
      </div>
    </div>

    <div class="controls">
      <el-switch v-model="showMastered" active-text="显示已掌握" @change="loadWrongBook" />
      <span class="total-hint">共 {{ wrongList.length }} 条错题</span>
    </div>

    <!-- 错题重练模式 -->
    <div v-if="practiceMode && wrongList.length">
      <div class="practice-progress">
        <span>复习进度: {{ currentIndex + 1 }} / {{ wrongList.length }}</span>
        <el-button size="small" @click="practiceMode = false">退出重练</el-button>
      </div>
      <QuestionCard
        v-if="wrongList[currentIndex]?.question"
        :key="wrongList[currentIndex].question.id"
        :question="wrongList[currentIndex].question"
        :index="currentIndex + 1"
        mode="practice"
        @answer="() => {}"
        @next="nextWrong"
      />
    </div>

    <!-- 列表模式 -->
    <div v-else v-loading="loading">
      <div v-for="record in wrongList" :key="record.id" class="wrong-item">
        <QuestionCard
          :question="record.question"
          :show-answer="true"
          mode="review"
        />
        <div class="wrong-meta">
          <span>错误次数: <strong>{{ record.count }}</strong></span>
          <span>上次错误: {{ new Date(record.updatedAt).toLocaleDateString() }}</span>
          <div class="wrong-actions">
            <el-button size="small" :type="record.mastered ? 'info' : 'success'" @click="handleMaster(record)">
              {{ record.mastered ? '取消掌握' : '标记已掌握' }}
            </el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(record)">删除</el-button>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && wrongList.length === 0" description="暂无错题记录，继续加油！" />
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.stat-chip:hover { border-color: #409eff; }
.stat-chip.active { background: #ecf5ff; border-color: #409eff; color: #409eff; }
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.total-hint { color: #909399; font-size: 14px; }
.wrong-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px 12px;
  font-size: 13px;
  color: #909399;
  flex-wrap: wrap;
}
.wrong-actions { margin-left: auto; }
.practice-progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}
</style>
