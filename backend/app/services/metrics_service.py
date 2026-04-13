from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "mock_metrics.csv"
METRIC_LABELS = {
    "net_revenue": "净经营收入",
    "active_users": "活跃用户",
    "conversion_rate": "付费转化率",
    "activation_rate": "激活率",
    "refund_rate": "退款率",
}


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"])
    df["net_revenue"] = df["revenue"] - df["refund_amount"]
    df["conversion_rate"] = df["paying_users"] / df["active_users"]
    df["activation_rate"] = df["activated_users"] / df["registrations"]
    df["refund_rate"] = df["refund_amount"] / df["revenue"]
    df["arpu"] = df["net_revenue"] / df["active_users"]
    df["roi"] = df["net_revenue"] / df["cost"]
    df["cac"] = df["cost"] / df["registrations"]
    return df


def with_bucket(df: pd.DataFrame, granularity: str) -> pd.DataFrame:
    result = df.copy()
    if granularity == "day":
        result["bucket"] = result["date"]
    elif granularity == "week":
        result["bucket"] = result["date"].dt.to_period("W").dt.start_time
    else:
        result["bucket"] = result["date"].dt.to_period("M").dt.start_time
    return result


def percent_delta(current: float, previous: float) -> float:
    return 0.0 if previous == 0 else round((current - previous) / previous * 100, 1)


def _series_by_bucket(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("bucket", as_index=False).agg(
        net_revenue=("net_revenue", "sum"),
        active_users=("active_users", "sum"),
        registrations=("registrations", "sum"),
        activated_users=("activated_users", "sum"),
        paying_users=("paying_users", "sum"),
        refund_amount=("refund_amount", "sum"),
        revenue=("revenue", "sum"),
        support_tickets=("support_tickets", "sum"),
        nps=("nps", "mean"),
        cost=("cost", "sum"),
    )
    grouped = grouped.sort_values("bucket").reset_index(drop=True)
    grouped["conversion_rate"] = grouped["paying_users"] / grouped["active_users"]
    grouped["activation_rate"] = grouped["activated_users"] / grouped["registrations"]
    grouped["refund_rate"] = grouped["refund_amount"] / grouped["revenue"]
    grouped["arpu"] = grouped["net_revenue"] / grouped["active_users"]
    grouped["roi"] = grouped["net_revenue"] / grouped["cost"]
    grouped["cac"] = grouped["cost"] / grouped["registrations"]
    grouped["ticket_pressure"] = grouped["support_tickets"] / grouped["active_users"] * 1000
    grouped["service_health"] = grouped["nps"] - grouped["ticket_pressure"] * 0.45
    return grouped


def _current_previous(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    current = df.iloc[-1]
    previous = df.iloc[-2] if len(df) > 1 else current
    return current, previous


def _metric_value(row: pd.Series, metric: str) -> float:
    value = float(row[metric])
    return round(value * 100, 2) if metric in {"conversion_rate", "activation_rate", "refund_rate"} else round(value, 2)


def _score_meta(score: float) -> dict:
    if score >= 80:
        return {"label": "健康", "summary": f"当前健康指数 {score} 分，处于健康区，整体经营质量较稳。", "hint": "80 分以上说明增长、收入质量和服务稳定性同时保持在较优水平。"}
    if score >= 65:
        return {"label": "稳定", "summary": f"当前健康指数 {score} 分，处于稳定区，可持续但仍有优化空间。", "hint": "65 至 79 分代表经营基本平衡，但通常仍存在 1 个效率短板。"}
    if score >= 50:
        return {"label": "关注", "summary": f"当前健康指数 {score} 分，处于关注区，不算差，但也谈不上健康。", "hint": "50 至 64 分通常意味着至少有一项核心指标拖累整体表现，建议优先处理。"}
    return {"label": "风险", "summary": f"当前健康指数 {score} 分，已进入风险区，需要优先干预。", "hint": "50 分以下通常意味着转化、退款或服务稳定性出现明显问题。"}


def _score_breakdown(current: pd.Series) -> list[dict]:
    conversion_score = round(min(float(current["conversion_rate"]) / 0.2, 1) * 40, 1)
    refund_score = round((1 - min(float(current["refund_rate"]) / 0.12, 1)) * 25, 1)
    roi_score = round(min(float(current["roi"]) / 4, 1) * 20, 1)
    service_score = round(min(float(current["service_health"]) / 60, 1) * 15, 1)
    return [
        {"label": "转化效率", "score": conversion_score, "max_score": 40, "percent": round(conversion_score / 40 * 100, 1), "detail": f"当前付费转化率 {_metric_value(current, 'conversion_rate')}%"},
        {"label": "收入质量", "score": refund_score, "max_score": 25, "percent": round(refund_score / 25 * 100, 1), "detail": f"当前退款率 {_metric_value(current, 'refund_rate')}%"},
        {"label": "投入产出", "score": roi_score, "max_score": 20, "percent": round(roi_score / 20 * 100, 1), "detail": f"当前 ROI {_metric_value(current, 'roi')}"},
        {"label": "服务稳定", "score": service_score, "max_score": 15, "percent": round(service_score / 15 * 100, 1), "detail": f"当前服务健康度 {_metric_value(current, 'service_health')}"},
    ]


def _score_bands(score: float) -> list[dict]:
    bands = [
        {"label": "健康", "range": "80-100", "active": score >= 80},
        {"label": "稳定", "range": "65-79", "active": 65 <= score < 80},
        {"label": "关注", "range": "50-64", "active": 50 <= score < 65},
        {"label": "风险", "range": "0-49", "active": score < 50},
    ]
    return bands


def build_overview(granularity: str) -> dict:
    grouped = _series_by_bucket(with_bucket(load_data(), granularity))
    current, previous = _current_previous(grouped)

    score = max(
        0,
        min(
            100,
            round(
                min(float(current["conversion_rate"]) / 0.2, 1) * 40
                + (1 - min(float(current["refund_rate"]) / 0.12, 1)) * 25
                + min(float(current["roi"]) / 4, 1) * 20
                + min(float(current["service_health"]) / 60, 1) * 15,
                1,
            ),
        ),
    )

    cards = [
        {"key": "net_revenue", "title": "净经营收入", "value": float(round(float(current["net_revenue"]), 2)), "unit": "元", "delta": float(percent_delta(float(current["net_revenue"]), float(previous["net_revenue"]))), "status": "danger" if float(current["net_revenue"]) < float(previous["net_revenue"]) else "normal"},
        {"key": "active_users", "title": "活跃用户", "value": int(current["active_users"]), "unit": "人", "delta": float(percent_delta(float(current["active_users"]), float(previous["active_users"]))), "status": "danger" if float(current["active_users"]) < float(previous["active_users"]) else "normal"},
        {"key": "conversion_rate", "title": "付费转化率", "value": float(round(float(current["conversion_rate"]) * 100, 2)), "unit": "%", "delta": float(percent_delta(float(current["conversion_rate"]), float(previous["conversion_rate"]))), "status": "danger" if float(current["conversion_rate"]) < 0.12 else "normal"},
        {"key": "activation_rate", "title": "激活率", "value": float(round(float(current["activation_rate"]) * 100, 2)), "unit": "%", "delta": float(percent_delta(float(current["activation_rate"]), float(previous["activation_rate"]))), "status": "danger" if float(current["activation_rate"]) < 0.7 else "normal"},
        {"key": "refund_rate", "title": "退款率", "value": float(round(float(current["refund_rate"]) * 100, 2)), "unit": "%", "delta": float(percent_delta(float(current["refund_rate"]), float(previous["refund_rate"]))), "status": "danger" if float(current["refund_rate"]) > 0.08 else "normal"},
        {"key": "service_health", "title": "服务健康度", "value": float(round(float(current["service_health"]), 1)), "unit": "分", "delta": float(round(float(current["service_health"]) - float(previous["service_health"]), 1)), "status": "danger" if float(current["service_health"]) < 35 else "normal"},
        {"key": "arpu", "title": "ARPU", "value": float(round(float(current["arpu"]), 2)), "unit": "元/人", "delta": float(percent_delta(float(current["arpu"]), float(previous["arpu"]))), "status": "danger" if float(current["arpu"]) < float(previous["arpu"]) else "normal"},
        {"key": "roi", "title": "渠道 ROI", "value": float(round(float(current["roi"]), 2)), "unit": "", "delta": float(percent_delta(float(current["roi"]), float(previous["roi"]))), "status": "danger" if float(current["roi"]) < 2.5 else "normal"},
    ]

    alerts = []
    if cards[0]["delta"] <= -5:
        alerts.append("净经营收入环比下降超过 5%，建议优先排查转化与退款。")
    if cards[1]["delta"] <= -10:
        alerts.append("活跃用户环比下降超过 10%，建议检查流量获取质量。")
    if cards[2]["delta"] <= -8:
        alerts.append("付费转化率明显下降，建议定位激活与成交环节。")
    if cards[4]["delta"] >= 8:
        alerts.append("退款率上升较快，建议同步查看服务与交付稳定性。")

    return {
        "cards": cards,
        "alerts": alerts,
        "updated_at": grouped["bucket"].max().strftime("%Y-%m-%d"),
        "health_score": score,
        "score_meta": _score_meta(score),
        "score_bands": _score_bands(score),
        "score_breakdown": _score_breakdown(current),
    }


def build_trend(metric: str, granularity: str) -> dict:
    grouped = _series_by_bucket(with_bucket(load_data(), granularity))
    items = []
    for _, row in grouped.iterrows():
        value = float(row[metric]) * 100 if metric in {"conversion_rate", "activation_rate", "refund_rate"} else float(row[metric])
        items.append({"label": row["bucket"].strftime("%Y-%m-%d"), "value": float(round(value, 2))})
    return {"metric": metric, "metric_label": METRIC_LABELS.get(metric, metric), "items": items}


def build_funnel(granularity: str) -> dict:
    df = with_bucket(load_data(), granularity)
    scoped = df[df["bucket"] == df["bucket"].max()]
    return {"items": [{"stage": "访问", "value": int(scoped["visits"].sum())}, {"stage": "注册", "value": int(scoped["registrations"].sum())}, {"stage": "激活", "value": int(scoped["activated_users"].sum())}, {"stage": "付费", "value": int(scoped["paying_users"].sum())}]}


def build_drilldown(granularity: str) -> dict:
    df = with_bucket(load_data(), granularity)
    scoped = df[df["bucket"] == df["bucket"].max()]
    grouped = scoped.groupby("channel", as_index=False).agg(net_revenue=("net_revenue", "sum"), active_users=("active_users", "sum"), paying_users=("paying_users", "sum"), refund_amount=("refund_amount", "sum"), revenue=("revenue", "sum"), cost=("cost", "sum"), nps=("nps", "mean"))
    grouped["conversion_rate"] = grouped["paying_users"] / grouped["active_users"]
    grouped["roi"] = grouped["net_revenue"] / grouped["cost"]
    grouped["refund_rate"] = grouped["refund_amount"] / grouped["revenue"]
    return {"items": [{"channel": row["channel"], "net_revenue": float(round(float(row["net_revenue"]), 2)), "active_users": int(row["active_users"]), "conversion_rate": float(round(float(row["conversion_rate"]) * 100, 2)), "roi": float(round(float(row["roi"]), 2)), "refund_rate": float(round(float(row["refund_rate"]) * 100, 2)), "nps": float(round(float(row["nps"]), 1)), "risk_level": "high" if float(row["roi"]) < 2.0 or float(row["nps"]) < 40 else "normal"} for _, row in grouped.sort_values("net_revenue", ascending=False).iterrows()]}


def build_structure(granularity: str) -> dict:
    df = with_bucket(load_data(), granularity)
    scoped = df[df["bucket"] == df["bucket"].max()]
    channel_mix = scoped.groupby("channel", as_index=False).agg(net_revenue=("net_revenue", "sum"), cost=("cost", "sum"), paying_users=("paying_users", "sum"))
    channel_mix["share"] = channel_mix["net_revenue"] / channel_mix["net_revenue"].sum()
    region_health = scoped.groupby("region", as_index=False).agg(active_users=("active_users", "sum"), net_revenue=("net_revenue", "sum"), nps=("nps", "mean"))
    region_health["efficiency"] = region_health["net_revenue"] / region_health["active_users"]
    current, _ = _current_previous(_series_by_bucket(df))
    return {
        "channel_mix": [{"channel": row["channel"], "net_revenue": float(round(float(row["net_revenue"]), 2)), "share": float(round(float(row["share"]) * 100, 2)), "cost": float(round(float(row["cost"]), 2)), "paying_users": int(row["paying_users"])} for _, row in channel_mix.sort_values("net_revenue", ascending=False).iterrows()],
        "region_health": [{"region": row["region"], "active_users": int(row["active_users"]), "net_revenue": float(round(float(row["net_revenue"]), 2)), "nps": float(round(float(row["nps"]), 1)), "efficiency": float(round(float(row["efficiency"]), 2))} for _, row in region_health.sort_values("net_revenue", ascending=False).iterrows()],
        "driver_cards": [
            {"label": "ARPU", "value": float(round(float(current["arpu"]), 2)), "unit": "元/人"},
            {"label": "渠道 ROI", "value": float(round(float(current["roi"]), 2)), "unit": ""},
            {"label": "NPS", "value": float(round(float(current["nps"]), 1)), "unit": "分"},
            {"label": "CAC", "value": float(round(float(current["cac"]), 2)), "unit": "元"},
        ],
    }


def build_insights(granularity: str) -> dict:
    grouped = _series_by_bucket(with_bucket(load_data(), granularity))
    current, previous = _current_previous(grouped)
    linked_metric = "activation_rate" if float(current["activation_rate"]) < float(current["conversion_rate"]) else "conversion_rate"
    bottleneck = "注册到激活" if linked_metric == "activation_rate" else "激活到付费"
    return {"items": [
        {"id": "growth-quality", "title": "增长质量预警", "summary": f"当前活跃用户 {int(current['active_users'])}，较上一周期变化 {percent_delta(float(current['active_users']), float(previous['active_users']))}% 。", "action": "建议复查高成本渠道的获客质量，并查看活动投放是否缩量。", "level": "warning" if float(current["active_users"]) < float(previous["active_users"]) else "positive", "linked_module": "trend", "linked_metric": "active_users", "linked_metric_label": METRIC_LABELS["active_users"], "current_value": _metric_value(current, "active_users"), "delta": percent_delta(float(current["active_users"]), float(previous["active_users"]))},
        {"id": "funnel-bottleneck", "title": "漏斗瓶颈识别", "summary": f"当前主要损耗环节位于{bottleneck}，激活率 {round(float(current['activation_rate']) * 100, 2)}%，付费转化率 {round(float(current['conversion_rate']) * 100, 2)}%。", "action": "建议新增激活任务引导和首单激励实验。", "level": "warning" if float(current["activation_rate"]) < 0.7 or float(current["conversion_rate"]) < 0.12 else "positive", "linked_module": "funnel", "linked_metric": linked_metric, "linked_metric_label": METRIC_LABELS[linked_metric], "current_value": _metric_value(current, linked_metric), "delta": percent_delta(float(current[linked_metric]), float(previous[linked_metric]))},
        {"id": "revenue-quality", "title": "收入质量判断", "summary": f"退款率为 {round(float(current['refund_rate']) * 100, 2)}%，较上一周期变化 {percent_delta(float(current['refund_rate']), float(previous['refund_rate']))}%。", "action": "建议排查高退款渠道和高频工单主题。", "level": "warning" if float(current["refund_rate"]) > 0.08 else "positive", "linked_module": "drilldown", "linked_metric": "refund_rate", "linked_metric_label": METRIC_LABELS["refund_rate"], "current_value": _metric_value(current, "refund_rate"), "delta": percent_delta(float(current["refund_rate"]), float(previous["refund_rate"]))},
        {"id": "service-pressure", "title": "服务体验信号", "summary": f"服务健康度为 {round(float(current['service_health']), 1)}，NPS 为 {round(float(current['nps']), 1)}。", "action": "建议持续查看工单压力与服务响应时效。", "level": "warning" if float(current["service_health"]) < 35 else "positive", "linked_module": "diagnosis", "linked_metric": "service_health", "linked_metric_label": "服务健康度", "current_value": _metric_value(current, "service_health"), "delta": round(float(current['service_health']) - float(previous['service_health']), 1)},
    ]}


def build_watchlist(granularity: str) -> dict:
    grouped = _series_by_bucket(with_bucket(load_data(), granularity))
    current, _ = _current_previous(grouped)
    items = [
        {"metric": "付费转化率", "current": f"{round(float(current['conversion_rate']) * 100, 2)}%", "threshold": ">= 12%", "status": "warning" if float(current['conversion_rate']) < 0.12 else "normal", "impact": "直接影响收入规模", "owner": "增长转化"},
        {"metric": "激活率", "current": f"{round(float(current['activation_rate']) * 100, 2)}%", "threshold": ">= 72%", "status": "warning" if float(current['activation_rate']) < 0.72 else "normal", "impact": "影响中段漏斗效率", "owner": "用户激活"},
        {"metric": "退款率", "current": f"{round(float(current['refund_rate']) * 100, 2)}%", "threshold": "<= 8%", "status": "warning" if float(current['refund_rate']) > 0.08 else "normal", "impact": "影响收入质量", "owner": "服务体验"},
        {"metric": "渠道 ROI", "current": f"{round(float(current['roi']), 2)}", "threshold": ">= 2.5", "status": "warning" if float(current['roi']) < 2.5 else "normal", "impact": "影响预算效率", "owner": "投放策略"},
        {"metric": "NPS", "current": f"{round(float(current['nps']), 1)}", "threshold": ">= 45", "status": "warning" if float(current['nps']) < 45 else "normal", "impact": "影响长期口碑", "owner": "体验运营"},
        {"metric": "服务健康度", "current": f"{round(float(current['service_health']), 1)}", "threshold": ">= 35", "status": "warning" if float(current['service_health']) < 35 else "normal", "impact": "影响交付稳定性", "owner": "履约支持"},
    ]
    return {"items": items}

