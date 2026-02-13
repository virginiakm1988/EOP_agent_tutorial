# EOP Agent — 能力架構與教學系列

> **專案**: 面向證據導向程式設計 (EOP) 的 AI Agent
> **合作方**: NVIDIA Research
> **背景**: 構建一個 AI agent，協助研究者採用 EOP/ECF 實踐，提升研究軟體的證據充分性與透明度

---

## 什麼是 EOP？

**證據導向程式設計 (Evidence-Oriented Programming, EOP)** 是 Zhang 等人在論文 *"Research software as scientific evidence"* 中提出的概念模型。它將研究軟體的開發重心從技術實作轉向**科學主張 (scientific claims)** 與支撐它們的**計算產物 (computational artifacts)**（軟體元件與資料元素）之間的關係。

**證據鏈形式化 (Evidence Chain Formalization, ECF)** 是 EOP 的具體操作策略，建立一條可追溯的證據鏈：

```
輸入資料 (input data)
  → 實驗/分析流程 (experimental / analytical process)
    → 輸出資料 (output data)
      → 視覺資料 (visual data)
        → 繪圖/摘要流程 (plotting / summarizing process)
          → 視覺主張 (visual claims: 圖表、統計量)
```

EOP Agent 協助研究者理解、採用並實作符合 EOP/ECF 規範的研究軟體實踐。

---

## Agent 三大核心功能

### 1. 倡議 (Advocacy) — 推廣 EOP 理念並促進採用

幫助研究者理解 EOP 概念，並激勵他們在自己的工作中採用。

| 能力 | 說明 |
|---|---|
| **EOP/ECF 知識庫** | 深度理解 EOP 的三個維度（範圍 scope、時機 timing、形式 form）以及 ECF 基本證據鏈的七種產物類型 |
| **受眾適應性解釋** | 根據用戶的軟體開發經驗（從「無經驗」到「精通」）調整解釋深度與用語 |
| **利益相關者視角** | 針對用戶角色（作者、審稿人、編輯、外部行為者）呈現不同的收益 — 每個角色在 EOP 框架下有不同的激勵機制 |
| **實例展示** | 引用實際案例（如神經網路 motif 研究案例、AlphaFold3 揭露事件）來展示 EOP 的實用價值 |
| **質疑回應** | 處理常見疑慮：「這和可複製性有什麼不同？」、「ECF 能防止學術不端嗎？」、「這會不會增加太多工作量？」 |

### 2. 程式碼重構 (Restructure Code) — 將現有程式碼轉為 EOP/ECF 規範結構

幫助研究者重新組織其研究軟體庫，使其支援證據鏈的可追溯性。

| 能力 | 說明 |
|---|---|
| **目錄結構映射** | 將用戶的程式庫重組為 ECF 規定的結構：`work/`、`input/`、`output/`、`claim/`、`source/`、`test/`、`case/`、`document/` + 入口文件 |
| **證據鏈提取** | 從現有程式碼中辨識 ECF 的七個產物：輸入資料、實驗流程、輸出資料、視覺資料、繪圖流程、視覺主張、文件 |
| **流水線排序** | 建立正確的執行順序（如 `run_tasks.py` → `run_packs.py` → `show_main.py`），確保端到端的可追溯性 |
| **中間資料檢查點設計** | 建議適當的檢查點粒度 — 不宜太粗（模糊邏輯）也不宜太細（引入雜訊）|
| **輕量化** | 移除不對已報告視覺主張做出貢獻的計算產物（已棄用的分析、死程式碼、孤立輸出）|
| **軟體使用分類** | 沿三個維度分類用戶的軟體：呼叫複雜度 (invocation complexity)、方法新穎度 (methodological novelty)、初始化難度 (initialization difficulty) — 以確定適當的揭露層級 |

### 3. 程式開發輔助 (Coding Assistant) — 支援日常 EOP 規範開發

在研究者的日常開發過程中，協助撰寫和維護符合 EOP/ECF 規範的程式碼。

| 能力 | 說明 |
|---|---|
| **入口文件生成** | 自動生成 README/入口文件，描述軟體庫範圍、目錄結構、執行環境和流水線執行順序 |
| **證據鏈驗證** | 檢驗程式碼是否維持完整的證據鏈 — 從輸入到視覺主張的每一步是否可追溯、可執行 |
| **模組化封裝** | 幫助將單體腳本拆解為獨立模組，每個模組附帶簡短文件，描述其計算任務 |
| **外部障礙處理** | 當存在專有授權、商業利益或安全顧慮等限制時，建議替代揭露策略：可審計的中間資料 或 受限功能等效實作 |
| **雜湊值生成** | 為暫時保留的元件提供雜湊值，以便未來揭露時進行驗證 |
| **主張相依範圍建議** | 根據科學主張的強度給出揭露範圍建議 — 存在性主張（「我們能產生 X」）vs. 分佈性主張（「我們能穩定地產生 X」）需要不同層級的揭露 |

---

## 能力架構圖

```
                           EOP Agent
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
        1. 倡議          2. 程式碼重構       3. 開發輔助
                               |                  |
      ┌─────┴─────┐    ┌──────┴──────┐    ┌──────┴──────┐
      | 知識檢索    |    | 證據鏈      |    | 證據鏈      |
      | (EOP/ECF)  |    | 提取        |    | 驗證        |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | 受眾       |    | 目錄結構    |    | 入口文件    |
      | 適應       |    | 映射        |    | 生成        |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | 利益相關者  |    | 流水線      |    | 模組化      |
      | 視角       |    | 排序        |    | 封裝        |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | 實例展示    |    | 檢查點      |    | 外部障礙    |
      |            |    | 設計        |    | 處理        |
      ├────────────┤    ├─────────────┤    ├─────────────┤
      | 質疑回應    |    | 輕量化      |    | 主張相依    |
      |            |    |             |    | 範圍建議    |
      └────────────┘    └─────────────┘    └─────────────┘
```

---

## 教學系列 — Agentic Engineering 速成課程

本教學系列訓練博士生構建和維護 EOP Agent，採用雙層結構，並提供一個可選的暖身實驗。

### 可選暖身

| 實驗 | 標題 | 核心技能 |
|------|------|----------|
| **Lab 0** | 組裝最簡 EOP Agent 原型 (Build a Minimal EOP Agent Prototype) | 一步一步：環境設定 → EOP 工具（`annotate_artifact`、`link_to_claim`）→ prompt + LLM → 解析工具 → 執行。單輪 agent，無框架。（約 30–40 分鐘）|

### 基礎層（通用 Agentic 技能）

| 實驗 | 標題 | 核心技能 |
|------|------|----------|
| Lab 1 | 決策的解剖 (The Anatomy of a Decision) | Prompt 結構 → 工具選擇準確度；**system prompt 設計**（角色、受眾、EOP 倡議與異議回應）|
| Lab 2 | 工具的契約 (The Contract of a Tool) | Pydantic schema → 結構化工具呼叫 |
| Lab 3 | 持久化的 Agent (The Persistent Agent) | 記憶與狀態 → 多輪對話一致性 |
| Lab 4 | 圖、循環與恢復 (Graphs, Cycles & Recovery) | LangGraph → 帶錯誤恢復的編排工作流 |

### 領域層（EOP 專業技能）

| 實驗 | 標題 | 核心技能 |
|------|------|----------|
| Lab 5 | 證據鏈提取 (Evidence Chain Extraction) | 給定一個混亂的研究程式庫，辨識 ECF 的七個產物並建議重組方案 |
| Lab 6 | 主張相依揭露 (Claim-contingent Disclosure) | 給定不同強度的科學主張，判斷所需的揭露範圍 |

### 學習路徑

```
暖身:     Lab 0（可選）
              |
基礎層:   Lab 1 → Lab 2 → Lab 3 → Lab 4
                                    |
領域層:                        Lab 5 → Lab 6
```

---

## 檔案結構

```
ECM-Agent-tutorial/
├── README.md                              # 英文版 (本文件的英文對照)
├── README_zh.md                           # 中文版 (本文件)
├── ROADMAP.md                             # 詳細學習路線圖
├── Glossary.md                            # 術語定義 (英文)
├── Glossary_zh.md                         # 術語定義 (中文)
├── EOP Agent.pdf                          # 來源論文
├── Lab0_Build_an_EOP_Agent_Prototype.md   # Lab 0 可選暖身
├── Lab0_Build_an_EOP_Agent_Prototype.ipynb
├── Lab1_Anatomy_of_a_Decision.md
├── Lab1_Anatomy_of_a_Decision.ipynb       # Lab 1 — prompt 結構與 system prompt 設計
├── Lab2_Contract_of_a_Tool.md
├── Lab2_Contract_of_a_Tool.ipynb
├── Lab3_The_Persistent_Agent.md
├── Lab3_The_Persistent_Agent.ipynb
├── Lab4_Graphs_Cycles_and_Recovery.md
├── Lab4_Graphs_Cycles_and_Recovery.ipynb
├── Lab5_Evidence_Chain_Extraction.md
├── Lab5_Evidence_Chain_Extraction.ipynb
├── Lab6_Claim_Contingent_Disclosure.md
├── Lab6_Claim_Contingent_Disclosure.ipynb
└── outlines/
    ├── Lab2_Contract_of_a_Tool.outline.md
    ├── Lab3_The_Persistent_Agent.outline.md
    └── Lab4_Graphs_Cycles_and_Recovery.outline.md
```

---

## 參考文獻

- Zhang, H. et al. "Research software as scientific evidence: clarifying missing specifications." (EOP/ECF 論文)
- Zhang, H. et al. "Reviewability and Supportability: New complementary principles to empower research software practices." *Computational and Structural Biotechnology Journal* 23 (2024).
- Zhang, H. et al. "Leveraging network motifs to improve artificial neural networks." *Nature Communications* (2025).
