from fastapi import APIRouter, Query

from app.services.metrics_service import build_drilldown, build_funnel, build_insights, build_overview, build_structure, build_trend, build_watchlist

router = APIRouter(tags=["metrics"])


@router.get("/overview")
def overview(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_overview(granularity)


@router.get("/trend")
def trend(metric: str = Query(default="net_revenue", pattern="^(net_revenue|active_users|conversion_rate|activation_rate|refund_rate)$"), granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_trend(metric, granularity)


@router.get("/funnel")
def funnel(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_funnel(granularity)


@router.get("/drilldown")
def drilldown(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_drilldown(granularity)


@router.get("/structure")
def structure(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_structure(granularity)


@router.get("/insights")
def insights(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_insights(granularity)


@router.get("/watchlist")
def watchlist(granularity: str = Query(default="day", pattern="^(day|week|month)$")):
    return build_watchlist(granularity)
