#!/bin/bash

# ============================================
# 内耗指数测评系统 - 阿里云 ECS 部署脚本
# ============================================

set -e

echo "🚀 开始部署内耗指数测评系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  exit 1
fi

# 项目目录
PROJECT_DIR="/opt/neihao-app"

# 创建项目目录
echo -e "${YELLOW}📁 创建项目目录...${NC}"
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/data
mkdir -p $PROJECT_DIR/nginx/ssl
mkdir -p $PROJECT_DIR/nginx/logs

# 检查 .env 文件
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo -e "${RED}❌ 错误: 请先创建 $PROJECT_DIR/.env 配置文件${NC}"
  echo -e "${YELLOW}可以参考 .env.production 模板${NC}"
  exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker 未安装${NC}"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${YELLOW}📦 安装 Docker Compose...${NC}"
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# 进入项目目录
cd $PROJECT_DIR

# 停止旧容器
echo -e "${YELLOW}🛑 停止旧容器...${NC}"
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# 构建并启动
echo -e "${YELLOW}🔨 构建并启动容器...${NC}"
docker compose up -d --build 2>/dev/null || docker-compose up -d --build

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 初始化数据库
echo -e "${YELLOW}📊 初始化数据库...${NC}"
docker compose exec -T app npx prisma db push 2>/dev/null || docker-compose exec -T app npx prisma db push

# 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
  echo -e "${GREEN}✅ 应用服务正常运行${NC}"
else
  echo -e "${RED}❌ 应用服务启动失败${NC}"
  docker compose logs app
  exit 1
fi

if curl -s http://localhost:80 > /dev/null; then
  echo -e "${GREEN}✅ Nginx 代理正常运行${NC}"
else
  echo -e "${YELLOW}⚠️ Nginx 可能未启动，检查日志...${NC}"
  docker compose logs nginx
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  - HTTP:  http://47.110.80.77"
echo -e "  - 域名:  http://bettermee.cn (需配置 DNS)"
echo ""
echo -e "管理命令:"
echo -e "  - 查看日志:    docker compose logs -f"
echo -e "  - 重启服务:    docker compose restart"
echo -e "  - 停止服务:    docker compose down"
echo -e "  - 查看状态:    docker compose ps"
echo ""
