# 公务员行测在线学习系统

公务员行政职业能力测验（行测）在线练习平台，支持专项练习、模拟考试、错题本、AI智能导入等功能。

**在线体验：** https://clarkwang.xyz

## 功能特性

### 专项练习
- 六大题型分类：政治理论、常识判断、言语理解、数量关系、判断推理、资料分析
- 支持顺序练习和随机练习
- 做完即时查看答案解析和知识点说明
- 答错自动加入错题本

### 模拟考试
- 按行测真实比例从各题型随机抽题组卷
- 支持 30/60/120 题多种模式
- 倒计时 + 答题卡导航
- 交卷后展示成绩、各题型正确率分布

### 错题本
- 自动收集练习和考试中的错题
- 按题型分类筛选，显示错误次数
- 支持错题重练模式
- 标记已掌握 / 取消掌握

### 题目管理（后台）
- **在线编辑：** 表单式增删改查题目，支持搜索筛选
- **Excel 导入：** 上传 xlsx/csv 文件批量导入，提供模板下载
- **AI 智能识别：** 上传 PDF/Word/TXT 文件，通过通义千问 AI 自动提取题目并归类
- **网络爬取：** 输入网页 URL 自动解析提取题目

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Vue Router + Pinia + Element Plus |
| 后端 | Node.js + Express |
| ORM | Prisma |
| 数据库 | SQLite（本地） / Turso（云端） |
| AI | 通义千问 (qwen-plus / qwen-long) |
| 部署 | Vercel + Turso |

## 项目结构

```
AI-gwy/
├── client/                    # Vue 3 前端
│   ├── src/
│   │   ├── views/             # 页面组件
│   │   │   ├── Home.vue               # 首页（六大题型入口）
│   │   │   ├── Practice.vue           # 专项练习
│   │   │   ├── Exam.vue               # 模拟考试
│   │   │   ├── ExamResult.vue         # 考试结果
│   │   │   ├── WrongBook.vue          # 错题本
│   │   │   └── admin/
│   │   │       ├── QuestionManage.vue  # 题目管理
│   │   │       ├── QuestionImport.vue  # 导入（Excel + AI识别）
│   │   │       └── QuestionCrawl.vue   # 网络爬取
│   │   ├── components/        # 通用组件
│   │   ├── api/               # 接口封装
│   │   └── router/            # 路由配置
│   └── package.json
├── server/                    # Express 后端
│   ├── src/
│   │   ├── db.js              # 数据库连接（SQLite/Turso自动切换）
│   │   ├── app.js             # Express 入口
│   │   ├── routes/            # API 路由
│   │   └── services/          # 业务逻辑
│   ├── prisma/
│   │   ├── schema.prisma      # 数据模型
│   │   └── seed.js            # 种子数据（30道示例题）
│   └── package.json
├── api/index.js               # Vercel Serverless 入口
└── vercel.json                # Vercel 部署配置
```

## 本地开发

### 环境要求
- Node.js >= 18

### 安装与启动

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 初始化数据库并导入示例数据
cd ../server
npx prisma db push
node prisma/seed.js

# 启动后端（端口 3000）
npm run dev

# 新开终端，启动前端（端口 5173）
cd client
npm run dev
```

访问 http://localhost:5173

### 环境变量

在 `server/.env` 中配置：

```env
# 本地开发（默认使用本地 SQLite）
DATABASE_URL="file:./prisma/dev.db"

# 云端数据库（可选，配置后自动切换到 Turso）
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"

# AI 智能识别（可选）
DASHSCOPE_API_KEY="your-api-key"
```

## 部署

项目已配置 Vercel 自动部署：

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在 [Turso](https://turso.tech) 创建免费数据库
4. 在 Vercel 项目设置中添加环境变量：
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `DASHSCOPE_API_KEY`（可选，用于 AI 识别功能）
5. 重新部署即可

## 导入题目

### Excel 导入

下载模板文件，按格式填写后上传。模板字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| 题型分类 | 是 | 政治理论/常识判断/言语理解/数量关系/判断推理/资料分析 |
| 年份 | 否 | 如 2023 |
| 来源 | 否 | 如 2023年国考 |
| 题目内容 | 是 | 题干文本 |
| 选项A-D | 是 | 四个选项 |
| 正确答案 | 是 | A/B/C/D |
| 答案解析 | 是 | 解析说明 |
| 知识点 | 否 | 知识点标签 |
| 难度 | 否 | 1-5，默认3 |

### AI 智能识别

上传包含行测题目的 PDF/Word/TXT 文件，AI 自动：
- 提取题目、选项、答案、解析
- 根据内容判断归类到对应题型
- 预览结果，可手动修正后确认导入

> 云端部署仅支持 TXT 格式，PDF/Word 需本地部署使用。

## License

MIT
