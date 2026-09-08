import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

/** 上传文件根目录：Docker 中挂载为 /app/data/uploads */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "data", "uploads");

export const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
export const BOOK_EXTS = [".epub", ".txt"];

/** 统一路径分隔符为 /，便于存库与 URL 拼接 */
export function toRel(p: string) {
  return p.replaceAll("\\", "/");
}

export async function ensureUploadDirs() {
  for (const dir of [
    "",
    "books",
    "books/covers",
    "comics",
    "comics/covers",
    "poems/posters",
    "poems/comics",
  ]) {
    await fs.mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  }
}

/** 防目录穿越：只允许解析到 UPLOAD_DIR 内部 */
export function resolveSafe(relPath: string) {
  const target = path.resolve(UPLOAD_DIR, relPath);
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("非法路径");
  }
  return target;
}

export function extOf(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function randomName(ext: string) {
  return crypto.randomUUID().replace(/-/g, "") + ext;
}

export async function saveBuffer(buf: Buffer, relPath: string) {
  const abs = resolveSafe(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return toRel(relPath);
}

/**
 * 流式写盘：FormData 的 File（最大 512MB）边收边写，不整体驻留内存。
 * 写入失败时删除半成品，避免留下指向残缺文件的记录。
 */
export async function saveWebFile(file: File, relPath: string) {
  const abs = resolveSafe(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const nodeReadable = Readable.fromWeb(
    file.stream() as unknown as import("stream/web").ReadableStream
  );
  try {
    await pipeline(nodeReadable, createWriteStream(abs));
  } catch (err) {
    try {
      await fs.unlink(abs);
    } catch {}
    throw err;
  }
  return toRel(relPath);
}

export async function removeFile(relPath?: string | null) {
  if (!relPath) return;
  try {
    await fs.unlink(resolveSafe(relPath));
  } catch {
    // 文件不存在时忽略
  }
}

export async function removeDir(relPath: string) {
  try {
    await fs.rm(resolveSafe(relPath), { recursive: true, force: true });
  } catch {
    // 目录不存在时忽略
  }
}
