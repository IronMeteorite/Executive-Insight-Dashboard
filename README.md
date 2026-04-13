# Executive Insight Dashboard

一个面向经营分析场景的通用数据看板 Demo，用于展示数据产品经理 + 全栈工程师在以下几个环节的完整能力：

- 指标体系设计
- 数据建模与聚合
- 前后端看板实现
- 异常监控与智能诊断
- 从数据到洞察再到行动建议的闭环表达



## 项目定位

该项目定位为一个可运行、可展示、可继续扩展的经营分析工作台。它围绕 `净经营收入` 这一北极星指标，拆解出增长、转化、收入质量、服务稳定性等关键维度，并通过趋势、漏斗、结构、下钻和诊断模块支持业务判断。

当前版本重点突出三件事：

- 看板结构有清晰的信息层级，而不是堆砌图表
- 时间维度切换以局部刷新为主，交互更接近真实内部系统
- 智能诊断区把异常、原因线索和建议动作串起来，体现“分析助手”思路

## 功能概览

- 经营健康指数仪表盘与评分拆解
- 8 张核心 KPI 卡片
- 日 / 周 / 月趋势监控
- 访问 -> 注册 -> 激活 -> 付费转化漏斗
- 渠道结构与区域效率观察
- 渠道下钻明细表
- 拖拽式模块换位 Demo
- 智能诊断区：诊断摘要、优先级动作、洞察 / 阈值切换
- 异常高亮与环比预警

## AI 说明

当前仓库中的“AI 洞察”属于 **规则驱动的智能诊断 Demo**，并未接入外部大模型服务。

这部分能力目前通过后端聚合逻辑完成：

- 识别活跃波动、漏斗瓶颈、退款风险、服务体验压力
- 生成摘要、关联模块、建议动作和优先级
- 在前端以“分析助手”形式呈现

这样做的好处是：

- Demo 可离线运行，不依赖第三方 API
- 能清楚展示 AI 功能在数据产品中的引入方式
- 后续可平滑替换为 LLM / Agent / Copilot 类型服务

## 技术栈

### Frontend

- React 18
- Vite
- TypeScript
- Ant Design
- ECharts
- Axios

### Backend

- FastAPI
- Pandas
- Uvicorn

### Data

- CSV Mock Data
- 基于聚合规则生成评分、趋势、结构和诊断结果

## 项目结构

```text
executive-insight-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   └── metrics.py
│   │   └── services/
│   │       └── metrics_service.py
│   └── requirements.txt
├── data/
│   └── mock_metrics.csv
├── docs/
│   ├── product_design.md
│   └── technical_architecture.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8300
```

后端接口文档：

- [http://127.0.0.1:8300/docs](http://127.0.0.1:8300/docs)
- [http://127.0.0.1:8300/health](http://127.0.0.1:8300/health)

### 2. 启动前端

如需修改后端地址，可先复制 `frontend/.env.example` 为 `frontend/.env.local`，再调整 `VITE_API_BASE_URL`。

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5188
```

前端页面：

- [http://127.0.0.1:5188](http://127.0.0.1:5188)

## API 概览

后端当前提供以下核心接口：

- `GET /api/overview`：KPI 卡片、健康指数、评分拆解、预警信息
- `GET /api/trend`：趋势图数据，支持多指标切换
- `GET /api/funnel`：转化漏斗数据
- `GET /api/structure`：渠道结构与区域效率
- `GET /api/drilldown`：渠道明细下钻
- `GET /api/insights`：智能洞察列表
- `GET /api/watchlist`：阈值监控列表

## 数据说明

Mock 数据文件位于 [data/mock_metrics.csv](./data/mock_metrics.csv)，当前包含多渠道、多区域、跨多月时间跨度的经营数据，主要字段包括：

- `date`：日期
- `channel`：渠道
- `region`：区域
- `visits`：访问量
- `active_users`：活跃用户数
- `registrations`：注册数
- `activated_users`：激活用户数
- `paying_users`：付费用户数
- `revenue`：收入
- `refund_amount`：退款金额
- `support_tickets`：工单量
- `nps`：净推荐值
- `cost`：渠道成本

后端会基于上述字段进一步计算：

- `net_revenue`
- `conversion_rate`
- `activation_rate`
- `refund_rate`
- `arpu`
- `roi`
- `cac`
- `service_health`

## 页面截图说明

当前页面按照“经营分析工作台”思路组织，首屏主要由以下区域构成：

- 顶部工作台栏：标题、状态、筛选
- 总览区：经营健康指数、评级解读、评分拆解
- KPI 区：8 张统一风格指标卡
- 分析区：趋势监控、智能诊断、结构分布、转化漏斗、渠道下钻

如果你准备在 GitHub 中展示，可以补充以下截图：

- 首页总览截图
- 智能诊断区截图
- 趋势监控与漏斗联动截图
- 渠道下钻截图

## 项目亮点

- 用北极星指标串联增长、转化、收入质量和服务稳定性
- 用统一栅格工作台表达“概览 -> 分析 -> 下钻 -> 诊断”逻辑
- 智能诊断区不是简单文案，而是和数据模块存在关联关系
- 时间筛选与模块切换以局部刷新为主，更接近真实内部产品体验
- 前后端职责清晰，适合继续扩展为真实业务看板或面试作品集项目

## 文档索引

- [产品方案](./docs/product_design.md)
- [技术架构说明](./docs/technical_architecture.md)

## 后续可扩展方向

- 接入真实数据库或数仓接口替换 CSV Mock Data
- 将规则洞察升级为 LLM 驱动的自然语言诊断助手
- 增加同比 / 目标值 / 责任人 / 数据口径说明
- 增加布局持久化和角色化视图能力




