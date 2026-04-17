<script setup>
import { ref } from 'vue'
import { uploadFile, getTemplateUrl, aiUpload, aiConfirm } from '../../api'

const activeTab = ref('excel')

// ====== Excel 导入 ======
const uploading = ref(false)
const result = ref(null)

async function handleUpload(options) {
  uploading.value = true
  result.value = null
  const formData = new FormData()
  formData.append('file', options.file)

  try {
    const { data } = await uploadFile(formData)
    result.value = data
    ElMessage.success(`导入完成：成功 ${data.imported} 题，跳过 ${data.skipped} 题`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '导入失败')
  } finally {
    uploading.value = false
  }
}

function downloadTemplate() {
  window.open(getTemplateUrl(), '_blank')
}

const templateFields = [
  { field: '题型分类', required: true, desc: '政治理论/常识判断/言语理解/数量关系/判断推理/资料分析' },
  { field: '年份', required: false, desc: '题目年份，如 2023' },
  { field: '来源', required: false, desc: '如"2023年国考"' },
  { field: '题目内容', required: true, desc: '题目正文' },
  { field: '选项A-D', required: true, desc: '四个选项内容' },
  { field: '正确答案', required: true, desc: 'A/B/C/D' },
  { field: '答案解析', required: true, desc: '详细解析说明' },
  { field: '知识点', required: false, desc: '对应知识点标签' },
  { field: '难度', required: false, desc: '1-5，默认3' },
]

// ====== AI 智能识别 ======
const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析']
const aiLoading = ref(false)
const aiStage = ref('upload') // upload | preview | importing | done
const aiQuestions = ref([])
const aiResult = ref(null)
const selectedRows = ref([])

async function handleAiUpload(options) {
  aiLoading.value = true
  aiStage.value = 'upload'
  aiQuestions.value = []
  aiResult.value = null

  const formData = new FormData()
  formData.append('file', options.file)

  try {
    const { data } = await aiUpload(formData)
    aiQuestions.value = data.questions
    aiStage.value = 'preview'
    ElMessage.success(`AI 识别出 ${data.found} 道题目，请核实后确认导入`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || 'AI 识别失败')
    aiStage.value = 'upload'
  } finally {
    aiLoading.value = false
  }
}

function handleAiSelectionChange(rows) {
  selectedRows.value = rows
}

async function confirmAiImport() {
  const toImport = selectedRows.value.length > 0 ? selectedRows.value : aiQuestions.value
  if (toImport.length === 0) {
    ElMessage.warning('没有可导入的题目')
    return
  }

  aiStage.value = 'importing'
  try {
    const { data } = await aiConfirm(toImport)
    aiResult.value = data
    aiStage.value = 'done'
    ElMessage.success(`成功导入 ${data.imported} 道题目`)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '导入失败')
    aiStage.value = 'preview'
  }
}

function resetAi() {
  aiStage.value = 'upload'
  aiQuestions.value = []
  aiResult.value = null
  selectedRows.value = []
}
</script>

<template>
  <div class="question-import">
    <h3 style="margin-bottom:16px">导入题目</h3>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- Excel 导入 Tab -->
      <el-tab-pane label="Excel/CSV 导入" name="excel">
        <p style="color:#909399;margin:0 0 16px">
          请按照模板格式整理题目数据，支持 .xlsx 和 .csv 格式。
        </p>

        <div style="margin-bottom:20px">
          <el-button @click="downloadTemplate">
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
        </div>

        <el-upload
          drag
          :auto-upload="true"
          :show-file-list="false"
          :http-request="handleUpload"
          accept=".xlsx,.xls,.csv"
        >
          <el-icon :size="48" style="color:#909399"><UploadFilled /></el-icon>
          <div style="margin-top:8px">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div style="color:#909399;font-size:12px;margin-top:8px">
              支持 .xlsx / .xls / .csv 文件
            </div>
          </template>
        </el-upload>

        <div v-if="uploading" style="text-align:center;margin-top:20px">
          <el-icon class="is-loading" :size="32" color="#409eff"><Loading /></el-icon>
          <p>正在导入...</p>
        </div>

        <el-card v-if="result" style="margin-top:20px" shadow="never">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="总行数">{{ result.total }}</el-descriptions-item>
            <el-descriptions-item label="成功导入">
              <span style="color:#67c23a;font-weight:600">{{ result.imported }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="跳过">{{ result.skipped }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="result.errors?.length" style="margin-top:12px">
            <h5 style="color:#f56c6c;margin-bottom:8px">错误信息：</h5>
            <ul style="padding-left:20px;color:#606266;font-size:13px">
              <li v-for="(err, idx) in result.errors" :key="idx">{{ err }}</li>
            </ul>
          </div>
        </el-card>

        <el-collapse style="margin-top:20px">
          <el-collapse-item title="导入模板说明">
            <el-table :data="templateFields" size="small" stripe>
              <el-table-column prop="field" label="字段名" width="120" />
              <el-table-column prop="required" label="必填" width="60">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="desc" label="说明" />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- AI 智能识别 Tab -->
      <el-tab-pane name="ai">
        <template #label>
          <span>
            <el-icon style="vertical-align:middle;margin-right:4px"><MagicStick /></el-icon>
            AI 智能识别
          </span>
        </template>

        <!-- 上传阶段 -->
        <div v-if="aiStage === 'upload'">
          <el-alert
            title="AI 智能识别"
            description="上传 PDF、Word 或 TXT 文件，AI 将自动提取其中的行测题目，识别题型分类、选项、答案和解析。需要配置通义千问 API Key。"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom:20px"
          />

          <el-upload
            drag
            :auto-upload="true"
            :show-file-list="false"
            :http-request="handleAiUpload"
            accept=".pdf,.doc,.docx,.txt"
          >
            <el-icon :size="48" style="color:#909399"><MagicStick /></el-icon>
            <div style="margin-top:8px">拖拽文件到此处，或<em>点击上传</em></div>
            <template #tip>
              <div style="color:#909399;font-size:12px;margin-top:8px">
                支持 .pdf / .docx / .doc / .txt 文件，AI 自动识别题目
              </div>
            </template>
          </el-upload>

          <div v-if="aiLoading" style="text-align:center;margin-top:30px">
            <el-icon class="is-loading" :size="40" color="#409eff"><Loading /></el-icon>
            <p style="margin-top:12px;color:#606266">AI 正在分析文件内容并提取题目，请稍候...</p>
            <p style="color:#909399;font-size:13px">（根据文件大小，可能需要 30 秒至 2 分钟）</p>
          </div>
        </div>

        <!-- 预览阶段 -->
        <div v-else-if="aiStage === 'preview'">
          <el-alert
            :title="`AI 成功识别出 ${aiQuestions.length} 道题目`"
            description="请核实以下题目信息，确认无误后点击「确认导入」按钮完成导入。"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom:16px"
          />
          <div class="preview-header">
            <div>
              <span style="color:#909399;font-size:13px">
                {{ selectedRows.length > 0 ? `已选 ${selectedRows.length} 题` : '默认全部导入，也可勾选部分导入' }}
              </span>
            </div>
            <div class="preview-actions">
              <el-button @click="resetAi">重新上传</el-button>
              <el-button type="primary" @click="confirmAiImport">
                <el-icon><Check /></el-icon>
                确认导入{{ selectedRows.length > 0 ? ` (${selectedRows.length}题)` : ` (全部${aiQuestions.length}题)` }}
              </el-button>
            </div>
          </div>

          <el-table
            :data="aiQuestions"
            style="margin-top:16px"
            max-height="500"
            @selection-change="handleAiSelectionChange"
            stripe
            border
          >
            <el-table-column type="selection" width="45" />
            <el-table-column type="index" label="#" width="45" />
            <el-table-column label="题型" width="100">
              <template #default="{ row }">
                <el-select v-model="row.category" size="small">
                  <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="题目内容" show-overflow-tooltip min-width="250" />
            <el-table-column label="选项" width="200">
              <template #default="{ row }">
                <div style="font-size:12px;line-height:1.6">
                  <div>A. {{ row.optionA }}</div>
                  <div>B. {{ row.optionB }}</div>
                  <div>C. {{ row.optionC }}</div>
                  <div>D. {{ row.optionD }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="答案" width="70">
              <template #default="{ row }">
                <el-select v-model="row.answer" size="small" style="width:50px">
                  <el-option value="A" label="A" />
                  <el-option value="B" label="B" />
                  <el-option value="C" label="C" />
                  <el-option value="D" label="D" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="explanation" label="解析" show-overflow-tooltip min-width="200" />
            <el-table-column prop="knowledgePoint" label="知识点" width="100" show-overflow-tooltip />
            <el-table-column label="难度" width="65">
              <template #default="{ row }">
                <el-tag :type="row.difficulty >= 4 ? 'danger' : row.difficulty >= 3 ? 'warning' : 'success'" size="small">
                  {{ row.difficulty }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 导入中 -->
        <div v-else-if="aiStage === 'importing'" style="text-align:center;padding:40px">
          <el-icon class="is-loading" :size="40" color="#409eff"><Loading /></el-icon>
          <p style="margin-top:12px">正在导入题目...</p>
        </div>

        <!-- 导入完成 -->
        <div v-else-if="aiStage === 'done'">
          <el-result icon="success" title="AI 识别导入完成">
            <template #sub-title>
              <p>共识别 {{ aiResult.total }} 题，成功导入 {{ aiResult.imported }} 题，跳过 {{ aiResult.skipped }} 题</p>
            </template>
            <template #extra>
              <el-button type="primary" @click="resetAi">继续导入</el-button>
              <el-button @click="$router.push('/admin/questions')">查看题目管理</el-button>
            </template>
          </el-result>
          <div v-if="aiResult.errors?.length" style="margin-top:12px">
            <el-alert title="部分题目跳过" type="warning" :closable="false">
              <ul style="padding-left:20px;font-size:13px">
                <li v-for="(err, idx) in aiResult.errors" :key="idx">{{ err }}</li>
              </ul>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.preview-actions {
  display: flex;
  gap: 8px;
}
</style>
