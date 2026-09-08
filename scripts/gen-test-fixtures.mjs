// 生成测试素材：1 本 TXT 电子书 + 1 个含 3 张 PNG 的漫画 zip
import fs from "fs/promises";
import path from "path";
import zlib from "zlib";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c;
    });
  }
  let crc = -1;
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const p = row + 1 + x * 3;
      raw[p] = (rgb[0] + x) % 256;
      raw[p + 1] = (rgb[1] + y) % 256;
      raw[p + 2] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 漫画 zip：3 张不同颜色的 PNG（用项目自带的 adm-zip 打包）
import AdmZip from "adm-zip";
function makeZip(files) {
  const zip = new AdmZip();
  for (const [name, data] of files) zip.addFile(name, data);
  return zip.toBuffer();
}

const outDir = path.join(process.cwd(), ".test-fixtures");
await fs.mkdir(outDir, { recursive: true });

// TXT 电子书：多章中文文本
const chapter = (n) =>
  `第${n}章 灯下\n\n夜色像一层薄釉，覆在书桌的一角。台灯的光晕里，浮着细小的尘埃，它们缓慢地旋转，像是某种低语的星系。\n\n他翻开第三十七页。这一段讲的是旅人如何渡过结冰的河：先敲一敲，听冰层的回声，再决定落脚的轻重。读到这里，窗外恰好有风掠过。\n\n${"文字的内容并不重要，重要的是阅读本身带给人的安静。".repeat(20)}\n\n`;
await fs.writeFile(path.join(outDir, "test-book.txt"), chapter(1) + chapter(2) + chapter(3), "utf8");

// 漫画 zip：3 张不同颜色的 PNG
const pngs = [
  ["001.png", makePng(400, 560, [230, 169, 68])],
  ["002.png", makePng(400, 560, [127, 174, 142])],
  ["003.png", makePng(400, 560, [58, 79, 110])],
];
await fs.writeFile(path.join(outDir, "test-comic.zip"), makeZip(pngs));

console.log("fixtures ready:", outDir);
