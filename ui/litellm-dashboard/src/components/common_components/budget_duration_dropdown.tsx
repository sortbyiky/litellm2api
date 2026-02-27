import React from "react";
import { Select } from "antd";
import { useTranslation } from "react-i18next";

const { Option } = Select;

interface BudgetDurationDropdownProps {
  value?: string | null;
  onChange?: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const BudgetDurationDropdown: React.FC<BudgetDurationDropdownProps> = ({
  value,
  onChange,
  className = "",
  style = {},
}) => {
  const { t } = useTranslation();
  return (
    <Select
      style={{ width: "100%", ...style }}
      value={value || undefined}
      onChange={onChange}
      className={className}
      placeholder={t("commonComponents.notApplicable")}
      allowClear
    >
      <Option value="24h">{t("commonComponents.daily")}</Option>
      <Option value="7d">{t("commonComponents.weekly")}</Option>
      <Option value="30d">{t("commonComponents.monthly")}</Option>
    </Select>
  );
};

export const getBudgetDurationLabel = (value: string | null | undefined): string => {
  if (!value) return "Not set";

  const budgetDurationMap: Record<string, string> = {
    "24h": "daily",
    "7d": "weekly",
    "30d": "monthly",
  };

  return budgetDurationMap[value] || value;
};

export default BudgetDurationDropdown;
