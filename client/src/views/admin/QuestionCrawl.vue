<script setup>
import { ref } from 'vue'
import { crawlQuestions } from '../../api'

const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析']

const form = ref({
  url: '',
  category: '常识判断',
})
const loading = ref(false)
const result = ref(null)

async function handleCrawl() {
  if (!form.value.url) {
    ElMessage.warning('请输入目标URL')
    return
  }

  loading.value = true
  result.value = null

  try {
    const { data } = await crawlQuestions(form.value)
    result.value = data
    if (data.imported > 0) {
      ElMessage.success(`成功爬取并导入 ${data.imported} 道题目`)
    } else if (data.needReview) {
      ElMessage.info(`发现 ${data.found} 道题目，需要人工确认后导入`)
    } else {
      ElMessage.warning('未能从页面中识别到题目')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '爬取失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="question-crawl">
    <h3 style="margin-bottom:16px">网络爬取</h3>

    <el-card>
      <el-form :model="form" label-width="100px" style="max-width:600px">
        <el-form-item label="目标URL">
          <el-input v-model="form.url" placeholder="请输入包含题目的网页地址" clearable>
            <template #prepend>https://</template>
          </el-input>
        </el-form-item>
        <el-form-item label="题型分类">
          <el-select v-model="form.category">
            <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCrawl" :loading="loading">
            <el-icon><Search /></el-icon>
            开始爬取
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="result" style="margin-top:20px">
      <h4>爬取结果</h4>
      <el-descriptions :column="2" border style="margin-top:12px">
        <el-descriptions-item label="发现题目">{{ result.found }}</el-descriptions-item>
        <el-descriptions-item label="成功导入">
          <span style="color:#67c23a;font-weight:600">{{ result.imported }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="result.needReview"
        title="爬取的题目需要人工审核"
        description="部分题目的答案无法自动识别，请前往题目管理页面进行校验。"
        type="warning"
        show-icon
        style="margin-top:12px"
      />

      <div v-if="result.questions?.length" style="margin-top:16px">
        <h5 style="margin-bottom:8px">预览（前5题）：</h5>
        <div v-for="(q, idx) in result.questions.slice(0, 5)" :key="idx" class="preview-item">
          <p><strong>{{ idx + 1 }}. {{ q.content }}</strong></p>
          <p style="color:#606266;font-size:13px">A. {{ q.optionA }}　B. {{ q.optionB }}　C. {{ q.optionC }}　D. {{ q.optionD }}</p>
        </div>
      </div>
    </el-card>

    <el-card style="margin-top:20px">
      <h4>使用说明</h4>
      <div style="color:#606266;font-size:14px;line-height:2">
        <p>1. 输入包含公务员行测题目的网页地址</p>
        <p>2. 选择题目对应的题型分类</p>
        <p>3. 系统会自动解析页面结构，提取题目数据</p>
        <p>4. 爬取结果会自动入库，部分无法识别答案的题目需要手动校验</p>
        <el-alert
          title="提示"
          description="不同网站的页面结构不同，爬取效果可能有差异。建议优先使用Excel导入方式，数据更准确。"
          type="info"
          show-icon
          style="margin-top:12px"
          :closable="false"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.preview-item {
  padding: 8px 12px;
  border-left: 3px solid #409eff;
  margin-bottom: 8px;
  background: #f8f9fa;
  border-radius: 0 4px 4px 0;
}
</style>
