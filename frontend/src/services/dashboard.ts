import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8300/api",
});

export async function fetchOverview(granularity: string) {
  const { data } = await client.get("/overview", { params: { granularity } });
  return data;
}

export async function fetchTrend(metric: string, granularity: string) {
  const { data } = await client.get("/trend", { params: { metric, granularity } });
  return data;
}

export async function fetchFunnel(granularity: string) {
  const { data } = await client.get("/funnel", { params: { granularity } });
  return data;
}

export async function fetchDrilldown(granularity: string) {
  const { data } = await client.get("/drilldown", { params: { granularity } });
  return data;
}

export async function fetchStructure(granularity: string) {
  const { data } = await client.get("/structure", { params: { granularity } });
  return data;
}

export async function fetchInsights(granularity: string) {
  const { data } = await client.get("/insights", { params: { granularity } });
  return data;
}

export async function fetchWatchlist(granularity: string) {
  const { data } = await client.get("/watchlist", { params: { granularity } });
  return data;
}