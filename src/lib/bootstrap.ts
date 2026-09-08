import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { ensureUploadDirs } from "./storage";
import { isDefaultJwtSecret } from "./jwt";

const BUILTIN_GAMES = [
  {
    title: "2048",
    slug: "2048",
    description: "滑动合并相同数字，看你能走多远。",
    icon: "🔢",
    builtin: true,
    sortOrder: 1,
  },
  {
    title: "贪吃蛇",
    slug: "snake",
    description: "吃掉光点不断变长，别咬到自己。",
    icon: "🐍",
    builtin: true,
    sortOrder: 2,
  },
  {
    title: "记忆翻牌",
    slug: "memory",
    description: "翻开卡片找出所有成对的图案。",
    icon: "🃏",
    builtin: true,
    sortOrder: 3,
  },
];

/**
 * 空库时按顺序执行 prisma/migrations 下的迁移 SQL。
 * 容器内不再带 Prisma CLI，这里直接应用 DDL，并写入 _prisma_migrations，
 * 与 `prisma migrate deploy` 的簿记方式保持一致（后续迁移仍可用 CLI 正常续上）。
 */
async function ensureSchema() {
  const adminTable = await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Admin'"
  );
  if (adminTable.length > 0) return;

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const names = (await fs.readdir(migrationsDir))
    .filter((n) => !n.startsWith(".") && n !== "migration_lock.toml")
    .sort();

  for (const name of names) {
    const file = path.join(migrationsDir, name, "migration.sql");
    const sql = await fs.readFile(file, "utf8");
    const statements = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await db.$executeRawUnsafe(stmt);
    }

    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    await db.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`
    );
    await db.$executeRaw`INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
      VALUES (${crypto.randomUUID()}, ${checksum}, CURRENT_TIMESTAMP, ${name}, 1)`;
    console.log(`[bootstrap] 已应用迁移：${name}`);
  }
}

let bootstrapped = false;

/** 服务启动时执行：确保表结构、上传目录、管理员账号与内置游戏 */
export async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  if (
    process.env.NODE_ENV === "production" &&
    isDefaultJwtSecret(process.env.JWT_SECRET)
  ) {
    console.warn(
      "\n" +
        "════════════════════════════════════════════════════════════\n" +
        "  ⚠️  安全警告：生产环境正在使用默认 JWT_SECRET！\n" +
        "  任何人都可以伪造管理员登录态。请在 .env 或 docker-compose\n" +
        "  中设置足够长的随机字符串，然后重启服务：\n" +
        "      JWT_SECRET=$(node -e \"console.log(crypto.randomBytes(32).toString('hex'))\")\n" +
        "════════════════════════════════════════════════════════════\n"
    );
  }

  await ensureSchema();
  await ensureUploadDirs();

  if ((await db.admin.count()) === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    await db.admin.create({
      data: { username, passwordHash: bcrypt.hashSync(password, 10) },
    });
    console.log(`[bootstrap] 已创建管理员账号：${username}`);
  }

  for (const game of BUILTIN_GAMES) {
    await db.game.upsert({
      where: { slug: game.slug },
      update: {},
      create: game,
    });
  }
}
