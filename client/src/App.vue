<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const menuItems = [
  { label: '首页', path: '/', icon: 'HomeFilled' },
  { label: '错题本', path: '/wrong-book', icon: 'Notebook' },
  { label: '模拟考试', path: '/exam', icon: 'Timer' },
]

const adminItems = [
  { label: '题目管理', path: '/admin/questions' },
  { label: '导入题目', path: '/admin/import' },
  { label: '网络爬取', path: '/admin/crawl' },
]
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-left" @click="router.push('/')">
        <el-icon :size="28"><Reading /></el-icon>
        <h1>公务员行测在线学习系统</h1>
      </div>
      <el-menu mode="horizontal" :ellipsis="false" class="header-menu" router>
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </el-menu-item>
        <el-sub-menu index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            后台管理
          </template>
          <el-menu-item v-for="item in adminItems" :key="item.path" :index="item.path">
            {{ item.label }}
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f7fa;
}
.app-header {
  background: #fff;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0 24px;
  height: 64px;
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.header-left h1 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  margin: 0;
}
.header-menu {
  border-bottom: none;
  margin-left: auto;
}
.app-main {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
