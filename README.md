# LexGraph — 个人知识操作系统

一个 **Edge 浏览器扩展**，自动将你搜索的英文单词转化为结构化知识条目，支持分类、标签、关联、间隔复习和知识图谱可视化。

## 功能

| 功能 | 说明 |
|------|------|
| **搜索捕获** | 自动捕获 Google/Bing/Baidu/Sogou/360 搜索中的纯英文单词 |
| **右键捕获** | 选中网页任意英文单词 → 右键 →「捕获到 LexGraph」 |
| **自动释义** | 调用有道词典 API 自动获取中文释义 |
| **自动分类** | 根据释义中的词性（n./v./adj. 等）自动归类 |
| **去重计数** | 同一单词多次搜索不重复创建，自动累加搜索次数 |
| **标签系统** | 自定义标签，支持组合筛选 |
| **关联系统** | 6 种关系类型连接知识条目（相关/属于/前置/部分/提出/引用） |
| **SM-2 复习** | 间隔重复算法，6 级评分，自动安排复习计划 |
| **知识图谱** | 力导向图可视化，节点大小随搜索次数增长 |

## 安装（开发模式）

```bash
# 1. 克隆仓库
git clone https://github.com/jiaoruotong101-svg/LexGraph.git
cd LexGraph

# 2. 安装依赖
pnpm install

# 3. 构建扩展
pnpm build
```

### 在 Edge 中加载

1. 打开 `edge://extensions/`
2. 开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择 `packages/extension/dist/` 目录
5. 扩展图标出现在工具栏，即可使用

## 使用指南

### 捕获单词

- **自动捕获**：在 Google/Bing/Baidu/Sogou/360 中搜索任意纯英文单词，自动进入收件箱
- **右键捕获**：在任意网页选中英文单词 → 右键 →「捕获到 LexGraph」→ 直接进入知识库

### 知识管理

打开 Dashboard（点击工具栏图标 →「打开面板」）：

| 页面 | 功能 |
|------|------|
| 📥 **收件箱** | 查看捕获的搜索记录，手动转为 KO 或忽略 |
| 📚 **知识库** | 浏览所有单词，按词性/标签筛选，按时间/字母/次数排序 |
| 🧠 **复习** | SM-2 间隔复习，0-5 分评价掌握程度 |
| 🔗 **图谱** | 可视化单词关联网络，点击节点进入详情 |

### 单词详情

点击任意知识条目进入详情页，可以：
- 修改单词标题
- 编辑/补全中文释义
- 调整词性分类
- 添加/删除标签
- 建立与其他单词的关联

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript 5 |
| 构建 | Vite 5 + @crxjs/vite-plugin |
| 包管理 | pnpm workspace (monorepo) |
| 样式 | Tailwind CSS (Glassmorphism) |
| 数据库 | Dexie.js (IndexedDB) |
| 词典 API | 有道词典 |
| 浏览器 | Microsoft Edge (Manifest V3) |

## 项目结构

```
LexGraph/
├── packages/
│   ├── extension/          # Edge 扩展（主包）
│   │   ├── manifest.json   # Manifest V3
│   │   ├── src/
│   │   │   ├── background/ # Service Worker（搜索捕获 + API 代理）
│   │   │   ├── popup/      # 工具栏弹窗
│   │   │   ├── dashboard/  # 主面板（React SPA）
│   │   │   │   └── pages/  # 收件箱/知识库/复习/图谱/详情
│   │   │   └── lib/        # 数据库/词典/分类工具
│   │   └── public/icons/   # 扩展图标
│   └── shared/             # 共享常量
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 许可证

MIT
