import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
};

// 提前给 TypeScript 打报告：声明全局环境里会有一个叫 prismaGlobal 的变量
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// 核心防坑：复用已有的连接。防止你每次按 Ctrl+S 保存代码，它就疯狂新建数据库连接导致死机
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;