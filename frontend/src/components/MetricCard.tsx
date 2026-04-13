import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Space, Tag, Typography } from "antd";

type MetricCardProps = {
  title: string;
  value: number;
  unit: string;
  delta: number;
  status: "normal" | "danger";
  active?: boolean;
};

export default function MetricCard({ title, value, unit, delta, status, active = false }: MetricCardProps) {
  const isDown = delta < 0;

  return (
    <Card className={`metric-card ${active ? "metric-card-active" : ""}`} styles={{ body: { padding: 20 } }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Typography.Text type="secondary">{title}</Typography.Text>
        <Typography.Text className="metric-value">
          {value.toLocaleString()} {unit}
        </Typography.Text>
        <Space>
          <Tag color={status === "danger" ? "error" : "success"}>{status === "danger" ? "异常关注" : "表现稳定"}</Tag>
          <Typography.Text className={status === "danger" ? "metric-delta-danger" : "metric-delta-normal"}>
            {isDown ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {Math.abs(delta)}%
          </Typography.Text>
        </Space>
      </Space>
    </Card>
  );
}
