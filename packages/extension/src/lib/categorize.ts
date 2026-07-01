import { db } from './db';

/** 有道词典词性缩写 → 知识库分类名称 */
const POS_TO_CATEGORY: Record<string, string> = {
  n: '名词',
  v: '动词',
  vi: '动词',
  vt: '动词',
  adj: '形容词',
  a: '形容词',
  adv: '副词',
  ad: '副词',
  prep: '介词',
  conj: '连词',
  abbr: '缩写',
  phr: '短语',
};

/**
 * 从有道释义字符串中提取所有词性缩写。
 * 例如 "n. 变压器" → ["n"]，"v. 跑；n. 跑步" → ["v", "n"]
 */
function extractPOS(meanings: string): string[] {
  const posSet = new Set<string>();
  const re = /(?:^|[；;]\s*)([a-z]+)\.\s/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(meanings)) !== null) {
    posSet.add(m[1].toLowerCase());
  }
  return [...posSet];
}

/**
 * 根据有道词典的中文释义，自动匹配并返回对应的分类 ID。
 * 如果无法识别词性或找不到对应分类，返回 undefined（即"未分类"）。
 */
export async function autoCategorize(
  meanings: string | null | undefined,
): Promise<number | undefined> {
  if (!meanings) return undefined;

  const posList = extractPOS(meanings);
  if (posList.length === 0) return undefined;

  const cats = await db.categories.toArray();

  // 按提取到的第一个有效词性匹配分类
  for (const pos of posList) {
    const catName = POS_TO_CATEGORY[pos];
    if (catName) {
      const cat = cats.find((c) => c.name === catName);
      if (cat?.id != null) return cat.id;
    }
  }

  return undefined;
}
