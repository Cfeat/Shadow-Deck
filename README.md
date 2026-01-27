# Shadow Deck (暗影牌组) 🎴

**Shadow Deck** 是一款受 *Slay the Spire (杀戮尖塔)* 启发的 Roguelike 卡牌构建游戏。它完全在浏览器中运行，使用 React 和 Tailwind CSS 构建。

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/4ceca870-3f27-48a3-b64c-0a79bb11d4b3" />

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/ae513806-8d7e-488c-a818-b492382a5a7b" />

<img width="1860" height="915" alt="image" src="https://github.com/user-attachments/assets/a34e0a21-4563-4c47-9eb4-72066d0aec0a" />


## ✨ 游戏特性

*   **回合制战斗**：策略性地管理你的能量、格挡值和生命值。
*   **卡组构建**：在战斗胜利后抽取新卡牌，构建独特的卡牌流派。
*   **状态效果**：利用 **易伤 (Vulnerable)**（增加50%受到的伤害）、**消耗 (Exhaust)** 和 **力量 (Strength)** 等机制扭转战局。
*   **随机事件**：在地图上探索未知的“事件”节点，体验随机生成的奇遇，获得金币、治疗或遭受诅咒。
*   **视觉反馈**：包含浮动战斗文字、屏幕震动反馈和流畅的卡牌动画。

## 🚀 快速开始

### 前置要求

*   现代网页浏览器 (Chrome, Firefox, Edge 等)。
*   本地 Web 服务器（由于浏览器安全策略，直接打开 HTML 文件可能无法加载模块）。

### 安装与运行

1.  **获取代码**：
    下载本项目中的所有文件：
    *   `index.html`
    *   `index.tsx`
    *   `style.css`等

2.  **启动本地服务器**：
    由于使用了 ES Modules (`import/export`)，你需要通过本地服务器来访问 `index.html`。

    *   **Node.js(推荐)**：运行 `npm install` 和 `npm run dev`。
    *   **VS Code**：安装 "Live Server" 扩展，右键点击 `index.html` 并选择 "Open with Live Server"。
    *   **Python**：在当前目录下打开终端，运行 `python -m http.server 8000`，然后在浏览器访问 `http://localhost:8000`。
   

## 🎮 游戏指南

1.  **开始冒险**：你将带着一副基础套牌（打击与防御）开始旅程。
2.  **地图探索**：
    *   ⚔️ **战斗 (BATTLE)**：击败怪物以获取金币和新卡牌。
    *   🔍 **事件 (EVENT)**：遭遇随机事件，可能带来财富，也可能伴随风险。
3.  **战斗机制**：
    *   每回合拥有 **3 点能量**。
    *   拖动或点击卡牌即可打出。
    *   **攻击牌 (Attack)**：造成伤害，削减敌人生命值。
    *   **技能牌 (Skill)**：如“防御”，可以提供护甲（格挡值）。**注意：护甲在回合结束时会清零！**
    *   观察敌人头顶的 **意图 (Intent)** 图标，预判它是要攻击、防御还是施加状态，从而制定你的策略。
4.  **胜利条件**：将敌人生命值降至 0。如果你生命值归零，游戏结束。
