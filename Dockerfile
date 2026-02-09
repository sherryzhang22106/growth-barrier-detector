# 多阶段构建 - 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 安装 OpenSSL（Prisma 需要）
RUN apk add --no-cache openssl openssl-dev

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 生成 Prisma Client（不推送数据库）
RUN npx prisma generate

# 复制源代码
COPY . .

# 只构建前端（跳过 prisma db push）
RUN npx tsc -b && npx vite build

# 阶段2: 生产环境
FROM node:20-alpine AS production

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache openssl

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 只安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 生成 Prisma Client
RUN npx prisma generate

# 复制后端代码
COPY server.js ./
COPY api ./api/

# 从构建阶段复制前端产物
COPY --from=frontend-builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "--import", "tsx", "server.js"]
