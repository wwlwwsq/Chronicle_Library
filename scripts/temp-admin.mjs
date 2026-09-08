// 临时管理账号：仅用于自动化验证，验证完删除
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const hash = bcrypt.hashSync("temp-verify-123", 10);
await db.admin.upsert({
  where: { username: "temp-verify" },
  update: { passwordHash: hash },
  create: { username: "temp-verify", passwordHash: hash },
});
console.log("临时账号 temp-verify 已就绪");
await db.$disconnect();
