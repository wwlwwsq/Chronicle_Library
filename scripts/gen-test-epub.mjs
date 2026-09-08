// 生成一本最小可用的测试 EPUB
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";

const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:test-book-001</dc:identifier>
    <dc:title>夜航书</dc:title>
    <dc:creator>临水</dc:creator>
    <dc:language>zh-CN</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/><itemref idref="c2"/>
  </spine>
</package>`;

const chapter = (n, title) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head>
<body><h1>${title}</h1>${"<p>夜色像一层薄釉，覆在书桌的一角。台灯的光晕里，浮着细小的尘埃，它们缓慢地旋转，像是某种低语的星系。旅人渡过结冰的河之前，总要先敲一敲，听听冰层的回声。</p>".repeat(n)}</body></html>`;

const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title></head><body>
<nav epub:type="toc" id="toc"><h1>目录</h1><ol>
<li><a href="c1.xhtml">第一章 灯下</a></li>
<li><a href="c2.xhtml">第二章 渡河</a></li>
</ol></nav></body></html>`;

const zip = new AdmZip();
zip.addFile("mimetype", Buffer.from("application/epub+zip"));
zip.addFile("META-INF/container.xml", Buffer.from(container));
zip.addFile("OEBPS/content.opf", Buffer.from(opf));
zip.addFile("OEBPS/nav.xhtml", Buffer.from(nav));
zip.addFile("OEBPS/c1.xhtml", Buffer.from(chapter(6, "第一章 灯下")));
zip.addFile("OEBPS/c2.xhtml", Buffer.from(chapter(8, "第二章 渡河")));

const out = path.join(process.cwd(), ".test-fixtures", "test-book.epub");
await fs.writeFile(out, zip.toBuffer());
console.log("epub ready:", out);
