# Sprint 2: 技术架构与项目初始化

## 目标
建立可运行的项目骨架。不写业务代码。

## 技术栈
React + TypeScript + Vite + Manifest V3 + Dexie + Tailwind + shadcn/ui

## 目录结构
```
E:\一些···\words\
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── tailwind.config.ts
├── postcss.config.js
└── packages/
    ├── extension/        # Edge 插件
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── tsconfig.json
    │   ├── manifest.json
    │   ├── public/icons/
    │   └── src/
    │       ├── background/index.ts
    │       ├── popup/
    │       │   ├── index.html
    │       │   ├── main.tsx
    │       │   └── Popup.tsx
    │       └── dashboard/
    │           ├── index.html
    │           ├── main.tsx
    │           └── App.tsx
    └── shared/           # 共享代码
        ├── package.json
        ├── tsconfig.json
        └── src/index.ts
```

## manifest.json 权限
只申请 `storage`。

## 三个入口
- **Background SW**: 启动确认 log
- **Popup**: 简单 React 页面，Open Dashboard 按钮
- **Dashboard**: LexGraph Logo + Slogan + Version

## 不做
- 不定义业务类型
- 不定义 Dexie schema
- 不写搜索捕获
- 不写业务页面

## 验证
1. `pnpm install` 成功
2. `pnpm dev` 构建成功
3. Edge 加载扩展，三个入口均正常
