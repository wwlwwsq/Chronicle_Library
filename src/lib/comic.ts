import yauzl from "yauzl";
import type { Readable } from "stream";
import { IMAGE_EXTS, extOf } from "./storage";

/** 单张图解压后上限：防 zip 炸弹（极小压缩包解出超大文件） */
const MAX_PAGE_BYTES = 128 * 1024 * 1024;

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err || !zip) reject(err ?? new Error("无法打开 zip"));
      else resolve(zip);
    });
  });
}

function nextEntry(zip: yauzl.ZipFile): Promise<yauzl.Entry | null> {
  return new Promise((resolve, reject) => {
    const onEntry = (e: yauzl.Entry) => {
      cleanup();
      resolve(e);
    };
    const onEnd = () => {
      cleanup();
      resolve(null);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      zip.off("entry", onEntry);
      zip.off("end", onEnd);
      zip.off("error", onError);
    };
    zip.on("entry", onEntry);
    zip.on("end", onEnd);
    zip.on("error", onError);
    zip.readEntry();
  });
}

function entryStream(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => {
      if (err || !stream) reject(err ?? new Error("无法读取 zip 条目"));
      else resolve(stream);
    });
  });
}

/** 漫画页候选：跳过目录、__MACOSX、隐藏文件和非图片 */
function isComicImage(entryName: string): boolean {
  if (entryName.endsWith("/")) return false;
  if (entryName.includes("__MACOSX")) return false;
  const base = entryName.split("/").pop() || "";
  if (base.startsWith(".")) return false;
  return IMAGE_EXTS.includes(extOf(base));
}

/** 按自然顺序统计 zip 内的漫画图片数（只读中央目录元数据，不解压） */
export async function countComicPages(zipPath: string): Promise<number> {
  const zip = await openZip(zipPath);
  try {
    let count = 0;
    for (let e = await nextEntry(zip); e; e = await nextEntry(zip)) {
      if (isComicImage(e.fileName)) count++;
    }
    return count;
  } finally {
    zip.close();
  }
}

/**
 * 流式解包：先只读元数据按自然顺序排序，再把每张图的解压流
 * 交给 write 消费（调用方负责 pipeline 落盘）。整个过程中内存里
 * 只有当前一张图——替代 AdmZip 整包缓冲后，512MB 压缩包的
 * 峰值内存从约 1.5GB 降为单图大小。任一环节失败即关闭 zip 抛出。
 */
export async function forEachComicPage(
  zipPath: string,
  write: (index: number, entryName: string, stream: Readable) => Promise<void>
): Promise<void> {
  const zip = await openZip(zipPath);
  try {
    const entries: { entry: yauzl.Entry; name: string }[] = [];
    for (let e = await nextEntry(zip); e; e = await nextEntry(zip)) {
      if (isComicImage(e.fileName)) entries.push({ entry: e, name: e.fileName });
    }
    entries.sort((a, b) =>
      a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true })
    );

    for (let i = 0; i < entries.length; i++) {
      const { entry, name } = entries[i];
      if (entry.uncompressedSize > MAX_PAGE_BYTES) {
        throw new Error(`图片 ${name} 解压后超过 128MB，请压缩后再上传`);
      }
      const stream = await entryStream(zip, entry);
      await write(i, name, stream);
    }
  } finally {
    zip.close();
  }
}
