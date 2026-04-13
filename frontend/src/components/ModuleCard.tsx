import { HolderOutlined } from "@ant-design/icons";
import { Card, Segmented, Space, Typography } from "antd";
import type { ReactNode } from "react";

type ModuleCardProps = {
  id: string;
  title: string;
  description: string;
  dimensions?: { label: string; value: string }[];
  dimensionValue?: string;
  onDimensionChange?: (value: string) => void;
  extra?: ReactNode;
  children: ReactNode;
  active?: boolean;
  className?: string;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
};

export default function ModuleCard({ id, title, description, dimensions, dimensionValue, onDimensionChange, extra, children, active = false, className = "", onDragStart, onDrop }: ModuleCardProps) {
  return (
    <Card className={`module-card ${active ? "module-card-active" : ""} ${className}`.trim()} draggable onDragStart={() => onDragStart(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(id)} styles={{ body: { padding: 20 } }}>
      <div className="module-card-header">
        <div className="module-card-heading">
          <Space className="module-card-title-row">
            <HolderOutlined className="module-drag-icon" />
            <Typography.Title level={4} className="module-card-title">{title}</Typography.Title>
          </Space>
          <Typography.Text type="secondary" className="module-card-description">{description}</Typography.Text>
        </div>
        <div className="module-card-actions">
          {dimensions && dimensionValue && onDimensionChange ? <Segmented value={dimensionValue} onChange={(value) => onDimensionChange(value as string)} options={dimensions} /> : null}
          {extra}
        </div>
      </div>
      <div className="module-card-content">{children}</div>
    </Card>
  );
}
