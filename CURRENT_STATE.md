# LexGraph 项目状态

## 当前 Sprint
- **Sprint 9 已完成** ✓ — 知识图谱可视化
- **下一 Sprint**: Sprint 10 — 待定

## 已完成 Sprint
1. 产品架构设计
2. 项目骨架（extension + shared）
3. 搜索捕获 + Inbox
4. KO 转换闭环
5. 分类系统
6. 标签系统
7. 关联系统（6 类关系）
8. Review 系统（SM-2 间隔重复）
9. 知识图谱 — SVG 力导向图，KO=节点（按分类着色），关系=边（标注类型）

## 数据库 Schema (v6)
- `searchRecords`: id, searchTerm, searchEngine, url, timestamp, status
- `knowledgeObjects`: id, title, type, source, categoryId, searchRecordId, createdAt, updatedAt, ef, interval, repetitions, nextReviewAt, lastReviewAt
- `categories`: id, name (8 预设)
- `tags`: id, name (unique)
- `koTags`: id, koId, tagId ([koId+tagId])
- `relations`: id, sourceKoId, targetKoId, type ([sourceKoId+targetKoId+type])

## 导航
Inbox | Library | Review | Graph

## 闭环
搜索 → 捕获 → Inbox → KO → 分类+标签+关系 → Review(SM-2) → Graph(可视化)

## 验证
- pnpm typecheck ✅ | pnpm lint ✅ (0 warnings) | pnpm build ✅ (1.18s)
