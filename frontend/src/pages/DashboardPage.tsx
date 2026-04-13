import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Alert, Col, Layout, Progress, Row, Segmented, Space, Spin, Statistic, Table, Tag, Typography } from "antd";

import MetricCard from "../components/MetricCard";
import ModuleCard from "../components/ModuleCard";
import { fetchDrilldown, fetchFunnel, fetchInsights, fetchOverview, fetchStructure, fetchTrend, fetchWatchlist } from "../services/dashboard";

type CardItem = { key: string; title: string; value: number; unit: string; delta: number; status: "normal" | "danger" };
type ScoreMeta = { label: string; summary: string; hint: string };
type ScoreBand = { label: string; range: string; active: boolean };
type ScoreBreakdown = { label: string; score: number; max_score: number; percent: number; detail: string };
type OverviewResponse = { cards: CardItem[]; alerts: string[]; updated_at: string; health_score: number; score_meta: ScoreMeta; score_bands: ScoreBand[]; score_breakdown: ScoreBreakdown[] };
type TrendItem = { label: string; value: number };
type TrendResponse = { metric: string; metric_label: string; items: TrendItem[] };
type FunnelItem = { stage: string; value: number };
type DrilldownItem = { channel: string; net_revenue: number; active_users: number; conversion_rate: number; roi: number; refund_rate: number; nps: number; risk_level: string };
type RegionHealthItem = { region: string; active_users: number; net_revenue: number; nps: number; efficiency: number };
type DriverCard = { label: string; value: number; unit: string };
type StructureResponse = { channel_mix: Array<{ channel: string; net_revenue: number; share: number; cost: number; paying_users: number }>; region_health: RegionHealthItem[]; driver_cards: DriverCard[] };
type InsightItem = { id: string; title: string; summary: string; action: string; level: "warning" | "positive"; linked_module: string; linked_metric: string; linked_metric_label: string; current_value: number; delta: number };
type InsightsResponse = { items: InsightItem[] };
type WatchItem = { metric: string; current: string; threshold: string; status: "warning" | "normal"; impact: string; owner: string };
type WatchlistResponse = { items: WatchItem[] };

type ScoreGuide = { title: string; summary: string; bullets: string[] };

const granularityOptions = [{ label: "日", value: "day" }, { label: "周", value: "week" }, { label: "月", value: "month" }];
const trendMetricOptions = [
  { label: "净经营收入", value: "net_revenue" },
  { label: "活跃用户", value: "active_users" },
  { label: "付费转化率", value: "conversion_rate" },
  { label: "激活率", value: "activation_rate" },
  { label: "退款率", value: "refund_rate" },
];
const diagnosisViewOptions = [
  { label: "洞察", value: "insights" },
  { label: "阈值", value: "watchlist" },
];
const initialModuleOrder = ["trend", "diagnosis", "structure", "funnel", "drilldown"];
const scoreGuideMap: Record<string, ScoreGuide> = {
  "健康": { title: "健康区标准", summary: "核心增长、收入质量和服务稳定性均处于优区，通常代表当前经营策略较稳。", bullets: ["转化效率通常达到目标线以上", "退款和服务波动较小", "更适合做结构优化和增量实验"] },
  "稳定": { title: "稳定区标准", summary: "整体盘面可持续，但至少存在一项效率因子还有明显优化空间。", bullets: ["经营结果通常没有明显风险", "结构和效率之间仍有短板", "适合优先修补单点问题再追求增长"] },
  "关注": { title: "关注区标准", summary: "不算失控，但至少一个关键指标已经开始拖累整体健康度。", bullets: ["转化、退款或 ROI 其中一项存在明显压力", "继续放大会侵蚀整体收入质量", "建议先止损再扩张"] },
  "风险": { title: "风险区标准", summary: "多个核心因子同时偏弱，需要马上进入诊断和干预节奏。", bullets: ["收入结果和质量指标通常同时承压", "继续维持当前策略风险较高", "应明确第一优先级并快速动作"] },
};

export default function DashboardPage() {
  const [overviewGranularity, setOverviewGranularity] = useState("day");
  const [trendGranularity, setTrendGranularity] = useState("day");
  const [funnelGranularity, setFunnelGranularity] = useState("day");
  const [structureGranularity, setStructureGranularity] = useState("day");
  const [diagnosisGranularity, setDiagnosisGranularity] = useState("day");
  const [drilldownGranularity, setDrilldownGranularity] = useState("day");
  const [trendMetric, setTrendMetric] = useState("net_revenue");
  const [diagnosisView, setDiagnosisView] = useState<"insights" | "watchlist">("insights");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [funnel, setFunnel] = useState<{ items: FunnelItem[] } | null>(null);
  const [structure, setStructure] = useState<StructureResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistResponse | null>(null);
  const [drilldown, setDrilldown] = useState<{ items: DrilldownItem[] } | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [moduleOrder, setModuleOrder] = useState(initialModuleOrder);
  const [draggingModule, setDraggingModule] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState("trend");
  const [selectedScoreBand, setSelectedScoreBand] = useState("稳定");

  useEffect(() => {
    async function loadInitial() {
      setPageLoading(true);
      setErrorMessage("");
      try {
        const [overviewData, trendData, funnelData, structureData, watchlistData, drilldownData, insightsData] = await Promise.all([
          fetchOverview(overviewGranularity),
          fetchTrend(trendMetric, trendGranularity),
          fetchFunnel(funnelGranularity),
          fetchStructure(structureGranularity),
          fetchWatchlist(diagnosisGranularity),
          fetchDrilldown(drilldownGranularity),
          fetchInsights(diagnosisGranularity),
        ]);
        setOverview(overviewData);
        setTrend(trendData);
        setFunnel(funnelData);
        setStructure(structureData);
        setWatchlist(watchlistData);
        setDrilldown(drilldownData);
        setInsights(insightsData);
      } catch (error) {
        console.error(error);
        setErrorMessage("看板数据加载失败，请检查后端服务或稍后刷新页面。");
      } finally {
        setPageLoading(false);
      }
    }

    void loadInitial();
  }, []);

  useEffect(() => {
    const activeBand = overview?.score_bands?.find((band) => band.active)?.label;
    if (activeBand) {
      setSelectedScoreBand(activeBand);
    }
  }, [overview]);

  useEffect(() => { if (!pageLoading) void fetchOverview(overviewGranularity).then(setOverview).catch(console.error); }, [overviewGranularity, pageLoading]);
  useEffect(() => { if (!pageLoading) void fetchTrend(trendMetric, trendGranularity).then(setTrend).catch(console.error); }, [trendMetric, trendGranularity, pageLoading]);
  useEffect(() => { if (!pageLoading) void fetchFunnel(funnelGranularity).then(setFunnel).catch(console.error); }, [funnelGranularity, pageLoading]);
  useEffect(() => { if (!pageLoading) void fetchStructure(structureGranularity).then(setStructure).catch(console.error); }, [structureGranularity, pageLoading]);
  useEffect(() => {
    if (!pageLoading) {
      void Promise.all([fetchWatchlist(diagnosisGranularity), fetchInsights(diagnosisGranularity)])
        .then(([watchlistData, insightsData]) => {
          setWatchlist(watchlistData);
          setInsights(insightsData);
        })
        .catch(console.error);
    }
  }, [diagnosisGranularity, pageLoading]);
  useEffect(() => { if (!pageLoading) void fetchDrilldown(drilldownGranularity).then(setDrilldown).catch(console.error); }, [drilldownGranularity, pageLoading]);

  function moveModule(targetId: string) {
    if (!draggingModule || draggingModule === targetId) return;
    const next = [...moduleOrder];
    const fromIndex = next.indexOf(draggingModule);
    const toIndex = next.indexOf(targetId);
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggingModule);
    setModuleOrder(next);
    setDraggingModule(null);
  }

  function handleInsightClick(item: InsightItem) {
    const targetModule = item.linked_module === "watchlist" ? "diagnosis" : item.linked_module;
    setActiveModule(targetModule);
    if (targetModule === "trend") {
      setTrendMetric(item.linked_metric);
    }
  }

  const scoreColor = (overview?.health_score ?? 0) >= 80 ? "#16a34a" : (overview?.health_score ?? 0) >= 65 ? "#2563eb" : (overview?.health_score ?? 0) >= 50 ? "#f59e0b" : "#ef4444";
  const diagnosisWarnings = (watchlist?.items ?? []).filter((item) => item.status === "warning").length;
  const primaryInsight = insights?.items?.[0];
  const selectedGuide = scoreGuideMap[selectedScoreBand] ?? scoreGuideMap["稳定"];
  const visibleInsights = useMemo(() => (insights?.items ?? []).slice(0, 4), [insights]);
  const visibleWatchlist = useMemo(() => (watchlist?.items ?? []).slice(0, 5), [watchlist]);
  const priorityActions = useMemo(() => {
    const insightActions = (insights?.items ?? []).slice(0, 3).map((item, index) => ({ priority: `P${index + 1}`, title: item.title, desc: item.action }));
    return insightActions;
  }, [insights]);
  const diagnosisConclusion = useMemo(() => {
    const label = overview?.score_meta?.label ?? "--";
    const primary = primaryInsight?.linked_metric_label ?? "核心指标";
    return `当前经营处于${label}区，已识别 ${diagnosisWarnings} 个待关注指标。建议先处理 ${primary}，它对健康度的拖累最直接。`;
  }, [overview?.score_meta?.label, diagnosisWarnings, primaryInsight?.linked_metric_label]);
  const funnelSteps = useMemo(() => {
    const items = funnel?.items ?? [];
    if (items.length < 4) return [];
    return [
      { label: "访问→注册", value: `${((items[1].value / items[0].value) * 100).toFixed(1)}%` },
      { label: "注册→激活", value: `${((items[2].value / items[1].value) * 100).toFixed(1)}%` },
      { label: "激活→付费", value: `${((items[3].value / items[2].value) * 100).toFixed(1)}%` },
    ];
  }, [funnel]);

  const healthGaugeOption = useMemo(() => ({
    series: [{
      type: "gauge",
      startAngle: 205,
      endAngle: -25,
      min: 0,
      max: 100,
      progress: { show: true, width: 18, roundCap: true, itemStyle: { color: scoreColor } },
      axisLine: { lineStyle: { width: 18, color: [[0.5, "#dbeafe"], [0.75, "#fde68a"], [1, "#fecaca"]] } },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      pointer: { show: false },
      detail: { valueAnimation: true, formatter: "{value} 分", fontSize: 30, fontWeight: 700, color: "#0f172a", offsetCenter: [0, "18%"] },
      title: { offsetCenter: [0, "-26%"], fontSize: 13, color: "#64748b" },
      data: [{ value: overview?.health_score ?? 0, name: "经营健康指数" }],
    }],
  }), [overview?.health_score, scoreColor]);

  const trendOption = { tooltip: { trigger: "axis" }, xAxis: { type: "category", data: trend?.items?.map((item) => item.label) ?? [] }, yAxis: { type: "value" }, series: [{ type: "line", smooth: true, symbolSize: 7, lineStyle: { width: 3, color: "#2563eb" }, areaStyle: { color: "rgba(37, 99, 235, 0.12)" }, data: trend?.items?.map((item) => item.value) ?? [] }] };
  const funnelPalette = ["#5673d7", "#73c28b", "#f6c65b", "#ef6a6a"];
  const funnelOption = useMemo(() => ({
    tooltip: {
      trigger: "item",
      formatter: (params: { name: string; value: number; percent: number }) => `${params.name}<br/>人数 ${Number(params.value).toLocaleString()}<br/>占起点 ${params.percent}%`,
    },
    series: [{
      type: "funnel",
      sort: "descending",
      gap: 6,
      top: 18,
      bottom: 18,
      left: "14%",
      width: "72%",
      minSize: "24%",
      maxSize: "92%",
      funnelAlign: "center",
      label: {
        show: true,
        position: "inside",
        formatter: (params: { name: string; value: number }) => `${params.name}\n${Number(params.value).toLocaleString()}`,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 22,
        textBorderColor: "rgba(15, 23, 42, 0.22)",
        textBorderWidth: 2,
      },
      labelLine: { show: false },
      itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 8 },
      emphasis: { label: { fontSize: 17 } },
      data: funnel?.items?.map((item, index) => ({
        name: item.stage,
        value: item.value,
        itemStyle: { color: funnelPalette[index % funnelPalette.length] },
      })) ?? [],
    }],
  }), [funnel]);
  const channelMixOption = { tooltip: { trigger: "axis" }, xAxis: { type: "category", data: structure?.channel_mix?.map((item) => item.channel) ?? [] }, yAxis: [{ type: "value" }, { type: "value" }], series: [{ type: "bar", name: "收入", data: structure?.channel_mix?.map((item) => item.net_revenue) ?? [], itemStyle: { color: "#0f766e", borderRadius: [8, 8, 0, 0] } }, { type: "line", name: "份额", yAxisIndex: 1, smooth: true, data: structure?.channel_mix?.map((item) => item.share) ?? [], lineStyle: { color: "#f59e0b", width: 3 } }] };

  const drilldownColumns = [
    { title: "渠道", dataIndex: "channel", key: "channel" },
    { title: "净经营收入", dataIndex: "net_revenue", key: "net_revenue" },
    { title: "活跃用户", dataIndex: "active_users", key: "active_users" },
    { title: "付费转化率", dataIndex: "conversion_rate", key: "conversion_rate", render: (value: number) => `${value}%` },
    { title: "退款率", dataIndex: "refund_rate", key: "refund_rate", render: (value: number) => <span className={value > 8 ? "risk-text" : ""}>{value}%</span> },
    { title: "ROI", dataIndex: "roi", key: "roi", render: (value: number) => <span className={value < 2 ? "risk-text" : ""}>{value}</span> },
    { title: "风险级别", dataIndex: "risk_level", key: "risk_level", render: (value: string) => <Tag color={value === "high" ? "error" : "success"}>{value === "high" ? "高风险" : "正常"}</Tag> },
  ];

  const regionColumns = [
    { title: "区域", dataIndex: "region", key: "region" },
    { title: "活跃用户", dataIndex: "active_users", key: "active_users" },
    { title: "净经营收入", dataIndex: "net_revenue", key: "net_revenue" },
    { title: "NPS", dataIndex: "nps", key: "nps" },
    { title: "人均收入效率", dataIndex: "efficiency", key: "efficiency" },
  ];
  const modules: Record<string, JSX.Element> = {
    trend: (
      <ModuleCard id="trend" className="module-card-trend" title="趋势监控" description="按日、周、月观察核心指标变化，时间维度信息已补齐。" dimensions={granularityOptions} dimensionValue={trendGranularity} onDimensionChange={setTrendGranularity} extra={<Space><Tag color="blue">{trend?.items?.length ?? 0} 点</Tag><Segmented value={trendMetric} onChange={(value) => setTrendMetric(value as string)} options={trendMetricOptions} /></Space>} active={activeModule === "trend"} onDragStart={setDraggingModule} onDrop={moveModule}>
        <Typography.Text type="secondary">当前指标：{trend?.metric_label ?? "--"}</Typography.Text>
        <ReactECharts option={trendOption} style={{ height: 340 }} />
      </ModuleCard>
    ),
    diagnosis: (
      <ModuleCard
        id="diagnosis"
        className="module-card-diagnosis"
        title="智能诊断"
        description="摘要常驻，洞察与阈值切换查看。"
        dimensions={granularityOptions}
        dimensionValue={diagnosisGranularity}
        onDimensionChange={setDiagnosisGranularity}
        extra={
          <Space size={8}>
            <Tag color="blue">{diagnosisView === "insights" ? `${visibleInsights.length} 条洞察` : `${visibleWatchlist.length} 条阈值`}</Tag>
            <Segmented size="small" value={diagnosisView} onChange={(value) => setDiagnosisView(value as "insights" | "watchlist")} options={diagnosisViewOptions} />
          </Space>
        }
        active={activeModule === "diagnosis"}
        onDragStart={setDraggingModule}
        onDrop={moveModule}
      >
        <div className="assistant-summary-card assistant-summary-card-compact">
          <div className="assistant-summary-header">
            <div>
              <Typography.Text type="secondary">分析助手结论</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>诊断摘要</Typography.Title>
            </div>
            <Tag color={diagnosisWarnings > 2 ? "error" : diagnosisWarnings > 0 ? "warning" : "success"}>{diagnosisWarnings > 2 ? "优先干预" : diagnosisWarnings > 0 ? "持续跟进" : "状态良好"}</Tag>
          </div>
          <Typography.Paragraph className="assistant-summary-text">{diagnosisConclusion}</Typography.Paragraph>
          <div className="assistant-summary-meta">
            <span>当前评级 · {overview?.score_meta?.label ?? "--"}</span>
            <span>重点指标 · {primaryInsight?.linked_metric_label ?? "--"}</span>
          </div>
          <div className="assistant-priority-list assistant-priority-list-compact">
            {priorityActions.map((item) => (
              <div key={item.priority} className="assistant-priority-item assistant-priority-item-compact">
                <Tag color={item.priority === "P1" ? "error" : item.priority === "P2" ? "warning" : "processing"}>{item.priority}</Tag>
                <div>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <div className="assistant-priority-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="diagnosis-topstats">
          <div className="diagnosis-mini-card">
            <Typography.Text type="secondary">待关注指标</Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>{diagnosisWarnings}</Typography.Title>
          </div>
          <div className="diagnosis-mini-card">
            <Typography.Text type="secondary">AI 洞察数</Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>{insights?.items?.length ?? 0}</Typography.Title>
          </div>
          <div className="diagnosis-mini-card">
            <Typography.Text type="secondary">优先方向</Typography.Text>
            <Typography.Title level={5} style={{ margin: 0 }}>{primaryInsight?.linked_metric_label ?? "--"}</Typography.Title>
          </div>
        </div>
        <div className="diagnosis-panel-body">
          <div className="diagnosis-panel-toolbar">
            <Typography.Title level={5} className="diagnosis-section-title">{diagnosisView === "insights" ? "重点洞察" : "阈值清单"}</Typography.Title>
            <Typography.Text type="secondary">{diagnosisView === "insights" ? "点击条目联动到对应模块" : "仅保留最需要跟进的异常指标"}</Typography.Text>
          </div>
          {diagnosisView === "insights" ? (
            visibleInsights.length ? (
              <div className="diagnosis-feed">
                {visibleInsights.map((item) => (
                  <div key={item.id} className={`insight-card compact-insight-card insight-card-${item.level}`} onClick={() => handleInsightClick(item)}>
                    <div className="insight-card-top">
                      <Typography.Title level={5} style={{ margin: 0 }}>{item.title}</Typography.Title>
                      <Tag color={item.level === "warning" ? "gold" : "green"}>{item.linked_metric_label}</Tag>
                    </div>
                    <Typography.Paragraph className="compact-insight-summary" style={{ marginBottom: 8 }}>{item.summary}</Typography.Paragraph>
                    <Typography.Text type="secondary">建议动作：{item.action}</Typography.Text>
                    <div className="insight-link-row">
                      <span>关联模块：{item.linked_module}</span>
                      <span>当前值：{item.current_value}</span>
                      <span>变化：{item.delta}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="diagnosis-empty-state">当前周期暂无新增洞察。</div>
            )
          ) : (
            visibleWatchlist.length ? (
              <div className="diagnosis-feed diagnosis-watchlist">
                {visibleWatchlist.map((item) => (
                  <div key={item.metric} className="diagnosis-watch-row diagnosis-watch-row-compact">
                    <div>
                      <Typography.Text strong>{item.metric}</Typography.Text>
                      <div className="diagnosis-watch-meta">{item.impact} · {item.owner}</div>
                    </div>
                    <div className="diagnosis-watch-values">
                      <span>{item.current}</span>
                      <span className="diagnosis-watch-threshold">{item.threshold}</span>
                      <Tag color={item.status === "warning" ? "error" : "success"}>{item.status === "warning" ? "待关注" : "正常"}</Tag>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="diagnosis-empty-state">当前周期暂无阈值预警。</div>
            )
          )}
        </div>
      </ModuleCard>
    ),
    structure: (
      <ModuleCard id="structure" className="module-card-structure" title="结构分布" description="收入规模、份额和区域效率对齐观察。" dimensions={granularityOptions} dimensionValue={structureGranularity} onDimensionChange={setStructureGranularity} active={activeModule === "structure"} onDragStart={setDraggingModule} onDrop={moveModule}>
        <Row gutter={[12, 12]}>
          {(structure?.driver_cards ?? []).map((item) => (
            <Col span={12} key={item.label}>
              <div className="mini-stat-card">
                <Statistic title={item.label} value={item.value} suffix={item.unit} />
              </div>
            </Col>
          ))}
        </Row>
        <ReactECharts option={channelMixOption} style={{ height: 250, marginTop: 12 }} />
        <Table rowKey="region" columns={regionColumns} dataSource={structure?.region_health ?? []} pagination={false} size="small" />
      </ModuleCard>
    ),
    funnel: (
      <ModuleCard id="funnel" className="module-card-funnel" title="转化漏斗" description="拆解访问、注册、激活、付费阶段，并补充阶段转化率。" dimensions={granularityOptions} dimensionValue={funnelGranularity} onDimensionChange={setFunnelGranularity} active={activeModule === "funnel"} onDragStart={setDraggingModule} onDrop={moveModule}>
        <div className="funnel-chart-shell"><ReactECharts option={funnelOption} style={{ height: 360 }} /></div>
        <div className="funnel-step-grid">
          {funnelSteps.map((item) => (
            <div key={item.label} className="funnel-step-card">
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>{item.value}</Typography.Title>
            </div>
          ))}
        </div>
      </ModuleCard>
    ),
    drilldown: (
      <ModuleCard id="drilldown" className="module-card-drilldown" title="渠道下钻" description="对投入产出、退款风险和渠道质量进行比较。" dimensions={granularityOptions} dimensionValue={drilldownGranularity} onDimensionChange={setDrilldownGranularity} active={activeModule === "drilldown"} onDragStart={setDraggingModule} onDrop={moveModule}>
        <Table rowKey="channel" columns={drilldownColumns} dataSource={drilldown?.items ?? []} pagination={false} />
      </ModuleCard>
    ),
  };

  return (
    <Layout className="dashboard-shell bytedemo-shell">
      <div className="workspace-topbar">
        <div>
          <Typography.Title level={3} className="workspace-title">经营分析工作台</Typography.Title>
        </div>
        <Space wrap>
          <Tag color="blue">Live Demo</Tag>
          <Tag color="processing">周月趋势增强</Tag>
          <Tag color="success">分析助手化</Tag>
        </Space>
      </div>

      <div className="workspace-statusbar">
        <div className="status-group">
          <span className="status-dot status-dot-live" />
          <Typography.Text>运行状态正常</Typography.Text>
          <Typography.Text type="secondary">更新时间 {overview?.updated_at ?? "--"}</Typography.Text>
        </div>
        <div className="status-group">
          <Typography.Text type="secondary">当前关注模块</Typography.Text>
          <Tag color="geekblue">{activeModule}</Tag>
          <Typography.Text type="secondary">时间序列已覆盖更长周期</Typography.Text>
        </div>
      </div>

      <div className="workspace-filterbar">
        <div className="filterbar-left">
          <Typography.Text strong>首页筛选</Typography.Text>
          <Segmented value={overviewGranularity} onChange={(value) => setOverviewGranularity(value as string)} options={granularityOptions} />
        </div>
        <div className="filterbar-right">
          <Tag color="cyan">评级可点击</Tag>
          <Tag color="gold">诊断助手已升级</Tag>
        </div>
      </div>

      {pageLoading ? <Spin size="large" /> : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {errorMessage ? <Alert message={errorMessage} type="error" showIcon /> : null}
          {(overview?.alerts ?? []).map((message) => <Alert key={message} message={message} type="warning" showIcon />)}

          <Row gutter={[16, 16]} className="summary-row">
            <Col xs={24} xl={8}>
              <div className="summary-panel summary-panel-gauge">
                <div className="summary-panel-header">
                  <div>
                    <Typography.Text type="secondary">总览仪表盘</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0 }}>经营健康指数</Typography.Title>
                  </div>
                  <Tag color={scoreColor === "#16a34a" ? "success" : scoreColor === "#2563eb" ? "processing" : scoreColor === "#f59e0b" ? "warning" : "error"}>{overview?.score_meta?.label}</Tag>
                </div>
                <ReactECharts option={healthGaugeOption} style={{ height: 220 }} />
                <Typography.Text type="secondary">综合转化效率、收入质量、投入产出和服务稳定性计算。</Typography.Text>
              </div>
            </Col>
            <Col xs={24} xl={8}>
              <div className="summary-panel">
                <div className="summary-panel-header">
                  <Typography.Title level={4} style={{ margin: 0 }}>指数解读</Typography.Title>
                  <Tag color="geekblue">点击评级查看标准</Tag>
                </div>
                <Typography.Paragraph className="score-summary-text">{overview?.score_meta?.summary}</Typography.Paragraph>
                <Typography.Text type="secondary">{overview?.score_meta?.hint}</Typography.Text>
                <div className="score-band-list">
                  {(overview?.score_bands ?? []).map((band) => (
                    <button key={band.label} type="button" className={`score-band-chip ${selectedScoreBand === band.label ? "score-band-chip-active" : ""}`} onClick={() => setSelectedScoreBand(band.label)}>
                      <span>{band.label}</span>
                      <span>{band.range}</span>
                    </button>
                  ))}
                </div>
                <div className="score-guide-card">
                  <div className="score-guide-header">
                    <Typography.Title level={5} style={{ margin: 0 }}>{selectedGuide.title}</Typography.Title>
                    <Tag color={selectedScoreBand === "健康" ? "success" : selectedScoreBand === "稳定" ? "processing" : selectedScoreBand === "关注" ? "warning" : "error"}>{selectedScoreBand}</Tag>
                  </div>
                  <Typography.Paragraph>{selectedGuide.summary}</Typography.Paragraph>
                  <div className="score-guide-bullets">
                    {selectedGuide.bullets.map((bullet) => <div key={bullet} className="score-guide-bullet">{bullet}</div>)}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} xl={8}>
              <div className="summary-panel">
                <div className="summary-panel-header">
                  <Typography.Title level={4} style={{ margin: 0 }}>评分拆解</Typography.Title>
                  <Tag color="purple">4 个因子</Tag>
                </div>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {(overview?.score_breakdown ?? []).map((item) => (
                    <div key={item.label} className="breakdown-item">
                      <div className="breakdown-item-top">
                        <span>{item.label}</span>
                        <strong>{item.score} / {item.max_score}</strong>
                      </div>
                      <Progress percent={item.percent} showInfo={false} strokeColor="#2563eb" trailColor="#e2e8f0" />
                      <Typography.Text type="secondary">{item.detail}</Typography.Text>
                    </div>
                  ))}
                </Space>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="kpi-row">
            {(overview?.cards ?? []).map((card) => (
              <Col xs={24} sm={12} xl={6} key={card.key} className="kpi-row-item">
                <MetricCard {...card} active={activeModule === "trend" && trendMetric === card.key} />
              </Col>
            ))}
          </Row>

          <div className="module-grid workspace-grid-shell">
            {moduleOrder.map((moduleId) => (
              <div key={moduleId} className={`module-grid-item module-grid-item-${moduleId}`}>{modules[moduleId]}</div>
            ))}
          </div>
        </Space>
      )}
    </Layout>
  );
}
