# 内耗指数测评系统 - 阿里云 ECS 部署指南

## 服务器信息
- IP: 47.110.80.77
- 域名: bettermee.cn
- 系统: Alibaba Cloud Linux
- 配置: 2 vCPU, 2GB RAM

## 部署步骤

### 1. 上传项目到服务器

在本地执行（Mac/Linux）：
```bash
# 进入项目目录
cd "/Users/sherry/Library/Mobile Documents/com~apple~CloudDocs/ 00_2026开发项目/内耗Overthinking"

# 打包项目（排除 node_modules 和其他不需要的文件）
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='prisma/prisma' \
    --exclude='.env.local' \
    -czvf neihao-app.tar.gz .

# 上传到服务器
scp neihao-app.tar.gz root@47.110.80.77:/opt/
```

### 2. 在服务器上解压和配置

SSH 登录服务器：
```bash
ssh root@47.110.80.77
```

解压项目：
```bash
# 创建项目目录
mkdir -p /opt/neihao-app
cd /opt/neihao-app

# 解压
tar -xzvf /opt/neihao-app.tar.gz

# 创建必要目录
mkdir -p data nginx/ssl nginx/logs
```

### 3. 配置环境变量

```bash
# 复制并编辑环境配置
cp .env.production .env
nano .env
```

**必须修改的配置项：**
```env
# DeepSeek API Key（从 https://platform.deepseek.com 获取）
DEEPSEEK_API_KEY="sk-your-actual-api-key"

# Admin JWT Secret（生成随机字符串）
ADMIN_JWT_SECRET="$(openssl rand -base64 32)"

# Admin 密码哈希（替换 your-password 为实际密码）
# 先生成哈希：
# node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
ADMIN_PASSWORD_HASH="$2a$10$..."
```

### 4. 开放防火墙端口

```bash
# 阿里云安全组需要开放以下端口：
# - 80 (HTTP)
# - 443 (HTTPS)
# - 22 (SSH)

# 服务器防火墙（如果启用了 firewalld）
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

### 5. 启动服务

```bash
cd /opt/neihao-app

# 方式一：使用部署脚本
chmod +x deploy.sh
./deploy.sh

# 方式二：手动启动
docker compose up -d --build
```

### 6. 初始化数据库

```bash
# 进入容器执行数据库迁移
docker compose exec app npx prisma db push

# 如果需要创建初始管理员，可以使用 Prisma Studio
# docker compose exec app npx prisma studio
```

### 7. 配置域名 DNS

在阿里云 DNS 控制台添加 A 记录：
- 主机记录: @
- 记录类型: A
- 记录值: 47.110.80.77

- 主机记录: www
- 记录类型: A
- 记录值: 47.110.80.77

### 8. 申请 SSL 证书（可选，推荐）

```bash
# 安装 certbot
yum install -y certbot

# 申请证书（确保域名已解析到服务器）
certbot certonly --webroot -w /opt/neihao-app/nginx/certbot -d bettermee.cn -d www.bettermee.cn

# 复制证书到 nginx 目录
cp /etc/letsencrypt/live/bettermee.cn/fullchain.pem /opt/neihao-app/nginx/ssl/
cp /etc/letsencrypt/live/bettermee.cn/privkey.pem /opt/neihao-app/nginx/ssl/

# 修改 nginx.conf 启用 SSL（取消注释 ssl_certificate 相关行）
nano /opt/neihao-app/nginx/nginx.conf

# 重启 nginx
docker compose restart nginx
```

## 常用运维命令

```bash
# 查看所有容器状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 只看应用日志
docker compose logs -f app

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart app

# 停止所有服务
docker compose down

# 重新构建并启动
docker compose up -d --build

# 进入应用容器
docker compose exec app sh

# 查看数据库
docker compose exec app npx prisma studio
```

## 数据备份

```bash
# 备份数据库
cp /opt/neihao-app/data/prod.db /opt/neihao-app/data/prod.db.backup.$(date +%Y%m%d)

# 定时备份（添加到 crontab）
crontab -e
# 添加：每天凌晨 3 点备份
# 0 3 * * * cp /opt/neihao-app/data/prod.db /opt/neihao-app/data/backup/prod.db.$(date +\%Y\%m\%d)
```

## 故障排查

### 应用无法启动
```bash
# 查看详细日志
docker compose logs app

# 检查环境变量
docker compose exec app env
```

### 数据库错误
```bash
# 重新生成 Prisma Client
docker compose exec app npx prisma generate

# 重新推送数据库结构
docker compose exec app npx prisma db push
```

### Nginx 502 错误
```bash
# 检查应用是否运行
docker compose ps

# 检查应用健康状态
curl http://localhost:3000/api/codes
```

## 微信支付集成（后续）

部署完成后，可以添加微信支付功能：
1. 申请微信支付商户号
2. 配置支付回调域名为 https://bettermee.cn
3. 添加支付相关 API 接口
