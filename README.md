# Shadow Deck（暗影牌组）🎴

**Shadow Deck** 是一款受 *Slay the Spire（杀戮尖塔）* 启发的 Roguelike 卡牌构建游戏。前端使用 React 19 + TypeScript + Tailwind CSS 构建，后端使用 Express + SQLite 提供用户认证、云存档和排行榜服务。

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/4ceca870-3f27-48a3-b64c-0a79bb11d4b3" />

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/ae513806-8d7e-488c-a818-b492382a5a7b" />

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/a34e0a21-4563-4c47-9eb4-72066d0aec0a" />

## ✨ 游戏特性

### 核心玩法
- **回合制战斗** — 策略性地管理能量、格挡值和生命值，每回合 3 点能量
- **卡组构建** — 超过 40 种卡牌（攻击/技能/能力），在战斗胜利后获取新卡，打造独特流派
- **遗物系统** — 20+ 被动遗物，在战斗开始、回合开始、造成伤害等时机自动触发
- **药水系统** — 最多携带 3 瓶药水，战斗中免费使用（治疗、护甲、伤害、能量、力量、抽牌）
- **状态效果** — 易伤（+50% 受伤）、虚弱（-25% 伤害）、力量（+攻击力）等

### 地图探索
- **高塔地图** — 程序化生成的塔楼地图，每层多条路径可选
- **节点类型** — ⚔️ 普通战斗 | 💀 精英战 | 🏕️ 休息 | 🏪 商店 | ❓ 事件 | 💰 宝箱 | 👑 Boss
- **15 层挑战** — 每 5 层遭遇 Boss，第 15 层迎战最终 Boss「心脏」

### 特殊机制
- **X 费用卡牌** — Whirlwind 等卡牌消耗所有剩余能量
- **多次攻击** — Twin Strike（2 段）、Sword Boomerang（3 段），每段都享受力量加成
- **双发** — Double Tap 让下一张攻击牌打出两次
- **Barricade** — 格挡值不再每回合清零
- **Omega** — 每回合结束时对敌人造成 50 点伤害（可叠加）
- **Demon Form** — 每回合获得力量加成
- **Rupture** — 受到伤害时额外获得力量
- **蛋遗物** — Molten/Toxic/Frozen Egg 自动升级新获得的对应类型卡牌

### 线上功能
- **用户系统** — 注册/登录，JWT 认证
- **云存档** — 3 个存档位，跨设备同步游戏进度
- **排行榜** — 通关/高分记录，全球排名前 20

### 国际化
- 支持 **中文 / English / 日本語** 三语切换
- 卡牌名称、描述、敌人名称、遗物、药水均已翻译

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/Cfeat/Shadow-Deck.git
cd Shadow-Deck

# 2. 安装依赖
npm install

# 3. 同时启动前端和后端（开发模式）
npm run dev
```

- 前端运行在 `http://localhost:3000`
- 后端 API 运行在 `http://localhost:3001`

### 单独启动

```bash
npm run dev:client   # 仅启动前端 (Vite)
npm run dev:server   # 仅启动后端 (Express)
```

### 生产构建

```bash
npm run build        # 构建前端到 dist/
npm run preview      # 预览生产构建
```

## 📁 项目结构

```
Shadow-Deck/
├── index.html              # 入口 HTML
├── package.json            # 依赖和脚本
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── style.css               # 全局样式和动画
├── src/
│   ├── main.tsx            # 应用入口
│   ├── App.tsx             # 主游戏组件（状态机、战斗逻辑）
│   ├── components.tsx      # 可复用 UI 组件
│   ├── types.ts            # TypeScript 类型定义和常量
│   ├── data.ts             # 游戏数据（卡牌、敌人、遗物、药水、事件）
│   ├── utils.ts            # 工具函数
│   ├── mapGen.ts           # 塔楼地图程序化生成
│   ├── TowerMap.tsx         # 地图 UI 组件
│   ├── api.ts              # 后端 API 调用封装
│   ├── auth.tsx            # 登录/注册 UI
│   ├── save.tsx            # 存档/读档 UI
│   └── i18n/
│       ├── index.tsx        # 国际化上下文和 Hook
│       ├── en.ts            # 英文翻译
│       ├── zh.ts            # 中文翻译
│       └── ja.ts            # 日文翻译
└── server/
    ├── index.ts            # Express 服务（路由、API）
    ├── auth.ts             # JWT 认证中间件
    └── db.ts               # SQLite 数据库初始化
```

## 🎮 游戏指南

1. **登录/注册** — 可选，登录后可使用云存档和排行榜
2. **选择祝福** — 游戏开始时从随机祝福中选择一个（增加生命、获得遗物、获得稀有卡牌等）
3. **塔楼探索** — 在高塔地图上选择路径，点击可到达的节点前进
4. **战斗机制**：
   - 每回合拥有 **3 点能量**
   - 点击卡牌即可打出（消耗对应能量）
   - **攻击牌**：造成伤害，削减敌人生命值
   - **技能牌**：提供护甲（格挡值）或其他效果
   - **能力牌**：提供整场战斗持续的 Buff
   - 观察敌人头顶的 **意图图标** 预判行动
5. **休息站点** — 选择 **休息**（恢复 30% 最大生命）或 **升级**（强化一张卡牌）
6. **商店** — 购买卡牌、药水、遗物，或花费 75 金币移除卡牌
7. **胜利条件** — 击败第 15 层的最终 Boss；生命值归零则游戏结束

## 🛠️ 技术栈

| 层 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 样式 | Tailwind CSS (CDN) + 自定义 CSS 动画 |
| 图标 | Lucide React |
| 构建工具 | Vite 6 |
| 后端 | Express 5 |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT + bcryptjs |
| AI 事件 | Google Gemini API（可选） |
