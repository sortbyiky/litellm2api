import React from "react";
import { useTranslation } from "react-i18next";
import { RobotOutlined } from "@ant-design/icons";

interface EmptyStateProps {
  hasVariables: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasVariables }) => {
  const { t } = useTranslation();
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400">
      <RobotOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
      <span className="text-base">
        {hasVariables
          ? t("prompts.emptyStateWithVariables")
          : t("prompts.emptyStateNoVariables")}
      </span>
    </div>
  );
};

export default EmptyState;

