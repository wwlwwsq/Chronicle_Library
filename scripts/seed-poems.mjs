// 录入经典诗词样例（幂等：按《诗题+作者》去重）
// 运行：node scripts/seed-poems.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const POEMS = [
  {
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    style: "思乡怀人",
    content: "床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。",
    note: "客居 he 明月，二十字无一奇字，却道尽游子夜里的那一低头。",
  },
  {
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    style: "山水田园",
    content: "春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。",
    note: "不写所见写所闻，风雨与花落都在想象里，春晓的慵懒与惜春之情两相宜。",
  },
  {
    title: "使至塞上",
    author: "王维",
    dynasty: "唐",
    style: "边塞征戍",
    content: "单车欲问边，属国过居延。\n征蓬出汉塞，归雁入胡天。\n大漠孤烟直，长河落日圆。\n萧关逢候骑，都护在燕然。",
    note: "「大漠孤烟直，长河落日圆」十字被王国维称为千古壮观。",
  },
  {
    title: "水调歌头 · 明月几时有",
    author: "苏轼",
    dynasty: "宋",
    style: "豪放",
    content: "明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。\n\n转朱阁，低绮户，照无眠。\n不应有恨，何事长向别时圆？\n人有悲欢离合，月有阴晴圆缺，此事古难全。\n但愿人长久，千里共婵娟。",
    note: "中秋怀念弟弟苏辙而作。胡仔评曰：中秋词自此一出，余词尽废。",
  },
  {
    title: "声声慢 · 寻寻觅觅",
    author: "李清照",
    dynasty: "宋",
    style: "婉约",
    content: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。\n乍暖还寒时候，最难将息。\n三杯两盏淡酒，怎敌他、晚来风急！\n雁过也，正伤心，却是旧时相识。\n\n满地黄花堆积，憔悴损，如今有谁堪摘？\n守着窗儿，独自怎生得黑！\n梧桐更兼细雨，到黄昏、点点滴滴。\n这次第，怎一个愁字了得！",
    note: "开篇十四叠字，前无古人。国破家亡、夫死流离，一字一泪。",
  },
  {
    title: "天净沙 · 秋思",
    author: "马致远",
    dynasty: "元",
    style: "思乡怀人",
    content: "枯藤老树昏鸦，\n小桥流水人家，\n古道西风瘦马。\n夕阳西下，\n断肠人在天涯。",
    note: "二十八字九种景物，无一动词而秋意全出，散曲小令之绝唱。",
  },
  {
    title: "观沧海",
    author: "曹操",
    dynasty: "汉魏",
    style: "豪放",
    content: "东临碣石，以观沧海。\n水何澹澹，山岛竦峙。\n树木丛生，百草丰茂。\n秋风萧瑟，洪波涌起。\n日月之行，若出其中；\n星汉灿烂，若出其里。\n幸甚至哉，歌以咏志。",
    note: "建安十二年北征乌桓归途中登碣石山而作，吞吐宇宙气象。",
  },
  {
    title: "己亥杂诗 · 其五",
    author: "龚自珍",
    dynasty: "清",
    style: "咏史怀古",
    content: "浩荡离愁白日斜，\n吟鞭东指即天涯。\n落红不是无情物，\n化作春泥更护花。",
    note: "辞官南归途中作。落红护花，离别亦怀抱国之志。",
  },
];

// 修正种子文案里的一个笔误（若有）
for (const p of POEMS) {
  p.note = p.note.replace("客居 he 明月", "客居他乡的静夜");
}

const existing = await db.poem.findMany({
  where: { OR: POEMS.map((p) => ({ title: p.title, author: p.author })) },
});
const seen = new Set(existing.map((p) => `${p.title}|${p.author}`));

let created = 0;
for (const p of POEMS) {
  if (seen.has(`${p.title}|${p.author}`)) continue;
  await db.poem.create({ data: p });
  created++;
}
console.log(`种子完成：新增 ${created} 首，跳过 ${POEMS.length - created} 首（已存在）。`);
await db.$disconnect();
