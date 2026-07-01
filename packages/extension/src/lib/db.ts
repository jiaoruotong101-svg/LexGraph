import Dexie, { type Table } from 'dexie';

export interface SearchRecord {
  id?: number;
  searchTerm: string;
  searchEngine: string;
  url: string;
  timestamp: number;
  status: 'inbox' | 'archived';
}

export interface Category {
  id?: number;
  name: string;
}

export interface KnowledgeObject {
  id?: number;
  title: string;
  type: string;
  source: string;
  categoryId?: number;
  searchRecordId?: number;
  createdAt: number;
  updatedAt: number;
  // SM-2 review fields (undefined = never reviewed)
  ef?: number;
  interval?: number;
  repetitions?: number;
  nextReviewAt?: number;
  lastReviewAt?: number;
  // Chinese meanings (undefined = not fetched / populated)
  meanings?: string;
  // 重复搜索次数（同一个词被多次搜索并转换）
  searchCount?: number;
}

/** SM-2 spaced repetition algorithm. Returns updated review fields. */
export function sm2(
  quality: number,
  prev: { ef?: number; interval?: number; repetitions?: number },
): { ef: number; interval: number; repetitions: number; nextReviewAt: number } {
  const prevEF = prev.ef ?? 2.5;
  const prevInterval = prev.interval ?? 0;
  const prevReps = prev.repetitions ?? 0;

  let ef = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  if (quality < 3) {
    // Failed: reset
    return {
      ef,
      interval: 1,
      repetitions: 0,
      nextReviewAt: Date.now() + 24 * 60 * 60 * 1000,
    };
  }

  let interval: number;
  if (prevReps === 0) interval = 1;
  else if (prevReps === 1) interval = 6;
  else interval = Math.round(prevInterval * ef);

  return {
    ef,
    interval,
    repetitions: prevReps + 1,
    nextReviewAt: Date.now() + interval * 24 * 60 * 60 * 1000,
  };
}

export interface Tag {
  id?: number;
  name: string;
}

export interface KOTag {
  id?: number;
  koId: number;
  tagId: number;
}

export const RELATION_TYPES = [
  'related_to',
  'is_a',
  'prerequisite_of',
  'part_of',
  'proposed_by',
  'cites',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_LABELS: Record<RelationType, string> = {
  related_to: 'Related To',
  is_a: 'Is A',
  prerequisite_of: 'Prerequisite Of',
  part_of: 'Part Of',
  proposed_by: 'Proposed By',
  cites: 'Cites',
};

export interface KORelation {
  id?: number;
  sourceKoId: number;
  targetKoId: number;
  type: RelationType;
}

export const PRESET_CATEGORIES: string[] = [
  '名词',
  '动词',
  '形容词',
  '副词',
  '短语',
  '缩写',
  '介词',
  '连词',
  '其他',
];

export class LexGraphDB extends Dexie {
  searchRecords!: Table<SearchRecord, number>;
  knowledgeObjects!: Table<KnowledgeObject, number>;
  categories!: Table<Category, number>;
  tags!: Table<Tag, number>;
  koTags!: Table<KOTag, number>;
  relations!: Table<KORelation, number>;

  constructor() {
    super('lexgraph');

    this.version(1).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
    });

    this.version(2).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
      knowledgeObjects: '++id, title, type, createdAt',
    });

    this.version(3).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
      knowledgeObjects: '++id, title, type, categoryId, createdAt',
      categories: '++id, name',
    });

    this.version(4).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
      knowledgeObjects: '++id, title, type, categoryId, createdAt',
      categories: '++id, name',
      tags: '++id, &name',
      koTags: '++id, [koId+tagId]',
    });

    this.version(5).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
      knowledgeObjects: '++id, title, type, categoryId, createdAt',
      categories: '++id, name',
      tags: '++id, &name',
      koTags: '++id, [koId+tagId]',
      relations: '++id, sourceKoId, targetKoId, type, [sourceKoId+targetKoId+type]',
    });

    this.version(6).stores({
      searchRecords: '++id, searchTerm, searchEngine, timestamp, status',
      knowledgeObjects: '++id, title, type, categoryId, createdAt, nextReviewAt',
      categories: '++id, name',
      tags: '++id, &name',
      koTags: '++id, [koId+tagId]',
      relations: '++id, sourceKoId, targetKoId, type, [sourceKoId+targetKoId+type]',
    });
  }
}

export const db = new LexGraphDB();

/** 首次运行时自动填充预设分类 */
export async function seedCategories() {
  const count = await db.categories.count();
  if (count > 0) return;
  await db.categories.bulkAdd(
    PRESET_CATEGORIES.map((name) => ({ name })),
  );
}
