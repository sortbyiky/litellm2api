import React from "react";
import { useTranslation } from "react-i18next";
import { Button as TremorButton } from "@tremor/react";
import { Input } from "antd";
import { ArrowLeftIcon, SaveIcon, ClockIcon } from "lucide-react";
import PromptCodeSnippets from "./PromptCodeSnippets";

interface PromptEditorHeaderProps {
  promptName: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  editMode?: boolean;
  onShowHistory?: () => void;
  version?: string | null;
  promptModel?: string;
  promptVariables?: Record<string, string>;
  accessToken: string | null;
  proxySettings?: {
    PROXY_BASE_URL?: string;
    LITELLM_UI_API_DOC_BASE_URL?: string | null;
  };
}

const PromptEditorHeader: React.FC<PromptEditorHeaderProps> = ({
  promptName,
  onNameChange,
  onBack,
  onSave,
  isSaving,
  editMode = false,
  onShowHistory,
  version,
  promptModel = "gpt-4o",
  promptVariables = {},
  accessToken,
  proxySettings,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onBack} size="xs">
          {t("common.back")}
        </TremorButton>
        <Input
          value={promptName}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-base font-medium border-none shadow-none"
          style={{ width: "200px" }}
        />
        {version && (
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
            {version}
          </span>
        )}
        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{t("prompts.draft")}</span>
        <span className="text-xs text-gray-400">{t("prompts.unsavedChanges")}</span>
      </div>
      <div className="flex items-center space-x-2">
        <PromptCodeSnippets
          promptId={promptName}
          model={promptModel}
          promptVariables={promptVariables}
          accessToken={accessToken}
          version={version?.replace('v', '') || "1"}
          proxySettings={proxySettings}
        />
        {editMode && onShowHistory && (
          <TremorButton
            icon={ClockIcon}
            variant="secondary"
            onClick={onShowHistory}
          >
            {t("prompts.history")}
          </TremorButton>
        )}
        <TremorButton
          icon={SaveIcon}
          onClick={onSave}
          loading={isSaving}
          disabled={isSaving}
        >
          {editMode ? t("common.update") : t("common.save")}
        </TremorButton>
      </div>
    </div>
  );
};

export default PromptEditorHeader;

