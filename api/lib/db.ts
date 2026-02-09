import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 配置连接池参数
const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  // Prisma 会自动从 DATABASE_URL 读取连接池配置
  // 可以在 DATABASE_URL 中添加参数：?connection_limit=5&pool_timeout=10
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 优雅关闭连接
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
