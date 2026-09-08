import AdmZip from "adm-zip";
import { IMAGE_EXTS, extOf } from "./storage";

/** 从 zip 中按自然顺序取出全部图片条目（跳过 __MACOSX 与隐藏文件） */
export function extractComicEntries(buf: Buffer): { name: string; data: Buffer }[] {
  const zip = new AdmZip(buf);
  return zip
    .getEntries()
    .filter((e) => {
      if (e.isDirectory) return false;
      const name = e.entryName;
      if (name.includes("__MACOSX")) return false;
      const base = name.split("/").pop() || "";
      if (base.startsWith(".")) return false;
      return IMAGE_EXTS.includes(extOf(base));
    })
    .sort((a, b) =>
      a.entryName.localeCompare(b.entryName, "zh-Hans-CN", { numeric: true })
    )
    .map((e) => ({ name: e.entryName, data: e.getData() }));
}
