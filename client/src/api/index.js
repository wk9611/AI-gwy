import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
})

// 题目相关
export const getCategories = () => api.get('/questions/categories')
export const getQuestions = (params) => api.get('/questions', { params })
export const getRandomQuestions = (params) => api.get('/questions/random', { params })
export const getQuestion = (id) => api.get(`/questions/${id}`)
export const createQuestion = (data) => api.post('/questions', data)
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data)
export const deleteQuestion = (id) => api.delete(`/questions/${id}`)
export const batchDeleteQuestions = (ids) => api.post('/questions/batch-delete', { ids })

// 模拟考试
export const generateExam = (data) => api.post('/exams/generate', data)
export const submitExam = (data) => api.post('/exams/submit', data)
export const getExamRecords = () => api.get('/exams/records')
export const getExamRecord = (id) => api.get(`/exams/records/${id}`)

// 错题本
export const getWrongBook = (params) => api.get('/wrong-book', { params })
export const getWrongStats = () => api.get('/wrong-book/stats')
export const addWrongRecord = (data) => api.post('/wrong-book', data)
export const masterWrong = (id) => api.put(`/wrong-book/${id}/master`)
export const unmasterWrong = (id) => api.put(`/wrong-book/${id}/unmaster`)
export const deleteWrong = (id) => api.delete(`/wrong-book/${id}`)

// 导入
export const uploadFile = (formData) => api.post('/import/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const getTemplateUrl = () => `${import.meta.env.VITE_API_BASE || '/api'}/import/template`

// AI 智能导入
export const aiUpload = (formData) => api.post('/import/ai-upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 360000, // AI 解析耗时较长，最多6分钟
})
export const aiConfirm = (questions) => api.post('/import/ai-confirm', { questions })

// 爬取
export const crawlQuestions = (data) => api.post('/crawl', data)

export default api
