# 成长阻碍探测器 v2.0

基于深层心理学的自我探索工具，帮助用户发现阻碍成长的隐形负累。

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS + Vite
- **后端**: Vercel Serverless Functions
- **数据库**: PostgreSQL (Prisma ORM)
- **AI**: DeepSeek API
- **部署**: Vercel

## 项目结构

```
growth-barrier-detector/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   ├── services/                 # API 服务
│   ├── pages/admin/              # 管理后台页面
│   └── App.tsx                   # 主应用
├── api/                          # Vercel API Routes
│   ├── auth/                     # 认证 API
│   ├── codes/                    # 兑换码 API
│   ├── assessments/              # 测评 API
│   ├── ai/                       # AI 分析 API
│   └── lib/                      # 工具库
├── prisma/                       # 数据库模型
└── public/                       # 静态资源
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写配置：

```bash
cp .env.example .env.local
```

必需的环境变量：
- `DATABASE_URL`: PostgreSQL 连接字符串
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥
- `ADMIN_JWT_SECRET`: JWT 签名密钥（至少32字符）
- `ADMIN_USERNAME`: 管理员用户名
- `ADMIN_PASSWORD_HASH`: 管理员密码的 bcrypt 哈希

生成密码哈希：
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

### 1. 连接 Git 仓库

将代码推送到 GitHub，然后在 Vercel 中导入项目。

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `ADMIN_JWT_SECRET` | JWT 密钥 |
| `ADMIN_USERNAME` | 管理员用户名 |
| `ADMIN_PASSWORD_HASH` | 密码哈希 |

### 3. 部署

Vercel 会自动构建和部署。

## 功能说明

### 用户端
- 兑换码激活测评
- 50 道心理测评题目
- AI 生成深度分析报告
- 进度自动保存

### 管理后台 (/admin)
- 仪表盘数据概览
- 兑换码批量生成与管理
- 测评数据查看与导出
- Excel 数据导出

## 安全特性

- API 密钥仅在服务端使用
- JWT 认证保护管理接口
- 输入清洗防止 XSS 和注入攻击
- DOMPurify 净化 AI 生成内容

## 数据库模型

- `RedemptionCode`: 兑换码
- `Assessment`: 测评记录
- `Admin`: 管理员账号
- `Progress`: 用户进度

## 许可证

私有项目，保留所有权利。
