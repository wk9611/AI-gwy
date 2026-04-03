<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCategories } from '../api'

const router = useRouter()
const categories = ref([])
const loading = ref(true)

const categoryIcons = {
  '政治理论': 'Flag',
  '常识判断': 'Compass',
  '言语理解': 'ChatLineRound',
  '数量关系': 'DataAnalysis',
  '判断推理': 'Connection',
  '资料分析': 'PieChart',
}

const categoryColors = {
  '政治理论': '#e74c3c',
  '常识判断': '#3498db',
  '言语理解': '#2ecc71',
  '数量关系': '#f39c12',
  '判断推理': '#9b59b6',
  '资料分析': '#1abc9c',
}

onMounted(async () => {
  try {
    const { data } = await getCategories()
    categories.value = data
  } finally {
    loading.value = false
  }
})

function startPractice(category) {
  router.push(`/practice/${encodeURIComponent(category)}`)
}
</script>

<template>
  <div class="home">
    <div class="hero-section">
      <h2>公务员行测在线学习系统</h2>
      <p class="subtitle">涵盖行测六大模块，专项训练 · 模拟考试 · 错题巩固</p>
    </div>

    <div class="quick-actions">
      <el-button type="primary" size="large" @click="router.push('/exam')">
        <el-icon><Timer /></el-icon>
        开始模拟考试
      </el-button>
      <el-button size="large" @click="router.push('/wrong-book')">
        <el-icon><Notebook /></el-icon>
        查看错题本
      </el-button>
    </div>

    <h3 class="section-title">专项题库</h3>
    <el-row :gutter="20" v-loading="loading">
      <el-col :xs="12" :sm="8" :md="8" v-for="cat in categories" :key="cat.category">
        <el-card class="category-card" shadow="hover" @click="startPractice(cat.category)">
          <div class="card-icon" :style="{ background: categoryColors[cat.category] + '15', color: categoryColors[cat.category] }">
            <el-icon :size="36"><component :is="categoryIcons[cat.category]" /></el-icon>
          </div>
          <h4>{{ cat.category }}</h4>
          <p class="count">{{ cat.count }} 题</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: 40px;
}
.hero-section {
  text-align: center;
  padding: 40px 0 24px;
}
.hero-section h2 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 8px;
}
.subtitle {
  color: #909399;
  font-size: 16px;
}
.quick-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 24px 0 36px;
}
.section-title {
  font-size: 20px;
  margin-bottom: 16px;
  color: #303133;
}
.category-card {
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: transform 0.2s;
}
.category-card:hover {
  transform: translateY(-4px);
}
.card-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}
.category-card h4 {
  font-size: 16px;
  margin-bottom: 4px;
  color: #303133;
}
.count {
  color: #909399;
  font-size: 14px;
}
</style>
