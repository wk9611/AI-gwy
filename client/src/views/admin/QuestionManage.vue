<script setup>
import { ref, onMounted } from 'vue'
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, batchDeleteQuestions } from '../../api'

const questions = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const searchForm = ref({ category: '', search: '', year: '' })

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const selectedIds = ref([])

const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析']

const defaultForm = {
  category: '常识判断',
  year: null,
  source: '',
  content: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  answer: 'A',
  explanation: '',
  knowledgePoint: '',
  difficulty: 3,
}
const form = ref({ ...defaultForm })

const rules = {
  category: [{ required: true, message: '请选择题型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
  optionA: [{ required: true, message: '请输入选项A', trigger: 'blur' }],
  optionB: [{ required: true, message: '请输入选项B', trigger: 'blur' }],
  optionC: [{ required: true, message: '请输入选项C', trigger: 'blur' }],
  optionD: [{ required: true, message: '请输入选项D', trigger: 'blur' }],
  answer: [{ required: true, message: '请选择正确答案', trigger: 'change' }],
  explanation: [{ required: true, message: '请输入答案解析', trigger: 'blur' }],
}

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchForm.value.category) params.category = searchForm.value.category
    if (searchForm.value.search) params.search = searchForm.value.search
    if (searchForm.value.year) params.year = searchForm.value.year

    const { data } = await getQuestions(params)
    questions.value = data.data
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEdit.value = false
  form.value = { ...defaultForm }
  dialogVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value.validate()
  if (isEdit.value) {
    await updateQuestion(form.value.id, form.value)
    ElMessage.success('更新成功')
  } else {
    await createQuestion(form.value)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该题目？', '提示', { type: 'warning' })
  await deleteQuestion(row.id)
  ElMessage.success('删除成功')
  loadData()
}

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 道题目？`, '提示', { type: 'warning' })
  await batchDeleteQuestions(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  loadData()
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id)
}

function handleSearch() {
  page.value = 1
  loadData()
}

function resetSearch() {
  searchForm.value = { category: '', search: '', year: '' }
  handleSearch()
}
</script>

<template>
  <div class="question-manage">
    <h3 style="margin-bottom:16px">题目管理</h3>

    <!-- 搜索栏 -->
    <el-card style="margin-bottom:16px">
      <el-form :model="searchForm" inline>
        <el-form-item label="题型">
          <el-select v-model="searchForm.category" clearable placeholder="全部">
            <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="年份">
          <el-input v-model="searchForm.year" placeholder="如2023" style="width:100px" />
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="searchForm.search" placeholder="题目关键词" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <div style="margin-bottom:12px;display:flex;gap:8px">
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 新增题目
      </el-button>
      <el-button type="danger" plain :disabled="selectedIds.length === 0" @click="handleBatchDelete">
        批量删除 ({{ selectedIds.length }})
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="questions" v-loading="loading" @selection-change="handleSelectionChange" stripe>
      <el-table-column type="selection" width="50" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="category" label="题型" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="题目内容" show-overflow-tooltip min-width="300" />
      <el-table-column prop="answer" label="答案" width="60" />
      <el-table-column prop="year" label="年份" width="70" />
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="loadData"
      @size-change="loadData"
    />

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑题目' : '新增题目'" width="700px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="题型分类" prop="category">
              <el-select v-model="form.category">
                <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="年份">
              <el-input v-model.number="form.year" placeholder="如2023" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="难度">
              <el-rate v-model="form.difficulty" :max="5" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="来源">
          <el-input v-model="form.source" placeholder="如: 2023年国考" />
        </el-form-item>
        <el-form-item label="题目内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="选项A" prop="optionA">
          <el-input v-model="form.optionA" />
        </el-form-item>
        <el-form-item label="选项B" prop="optionB">
          <el-input v-model="form.optionB" />
        </el-form-item>
        <el-form-item label="选项C" prop="optionC">
          <el-input v-model="form.optionC" />
        </el-form-item>
        <el-form-item label="选项D" prop="optionD">
          <el-input v-model="form.optionD" />
        </el-form-item>
        <el-form-item label="正确答案" prop="answer">
          <el-radio-group v-model="form.answer">
            <el-radio value="A">A</el-radio>
            <el-radio value="B">B</el-radio>
            <el-radio value="C">C</el-radio>
            <el-radio value="D">D</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="答案解析" prop="explanation">
          <el-input v-model="form.explanation" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="知识点">
          <el-input v-model="form.knowledgePoint" placeholder="如: 宪法基础" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
