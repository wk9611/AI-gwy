import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: () => import('../views/Home.vue') },
    { path: '/practice/:category', name: 'Practice', component: () => import('../views/Practice.vue'), props: true },
    { path: '/exam', name: 'Exam', component: () => import('../views/Exam.vue') },
    { path: '/exam/result/:id', name: 'ExamResult', component: () => import('../views/ExamResult.vue'), props: true },
    { path: '/wrong-book', name: 'WrongBook', component: () => import('../views/WrongBook.vue') },
    { path: '/admin/questions', name: 'QuestionManage', component: () => import('../views/admin/QuestionManage.vue') },
    { path: '/admin/import', name: 'QuestionImport', component: () => import('../views/admin/QuestionImport.vue') },
    { path: '/admin/crawl', name: 'QuestionCrawl', component: () => import('../views/admin/QuestionCrawl.vue') },
  ],
})

export default router
