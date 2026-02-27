import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Title,
  Text,
  Grid,
  Badge,
  Button as TremorButton,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@tremor/react";
import { Button, Modal } from "antd";
import { ArrowLeftIcon, TrashIcon, PencilIcon } from "@heroicons/react/outline";
import { getPromptInfo, PromptSpec, PromptTemplateBase, deletePromptCall } from "@/components/networking";
import { copyToClipboard as utilCopyToClipboard } from "@/utils/dataUtils";
import { CheckIcon, CopyIcon } from "lucide-react";
import NotificationsManager from "../molecules/notifications_manager";
import PromptCodeSnippets from "./prompt_editor_view/PromptCodeSnippets";
import { 
  extractModel, 
  extractTemplateVariables, 
  getBasePromptId, 
  getCurrentVersion 
} from "./prompt_utils";

export interface PromptInfoProps {
  promptId: string;
  onClose: () => void;
  accessToken: string | null;
  isAdmin: boolean;
  onDelete?: () => void;
  onEdit?: (promptData: any) => void;
}

const PromptInfoView: React.FC<PromptInfoProps> = ({ promptId, onClose, accessToken, isAdmin, onDelete, onEdit }) => {
  const { t } = useTranslation();
  const [promptData, setPromptData] = useState<PromptSpec | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<PromptTemplateBase | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPromptInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) return;
      const response = await getPromptInfo(accessToken, promptId);
      setPromptData(response.prompt_spec);
      setPromptTemplate(response.raw_prompt_template);
      setRawApiResponse(response); // Store the raw response for the Raw JSON tab
    } catch (error) {
      NotificationsManager.fromBackend(t("prompts.failedToLoadPromptInfo"));
      console.error("Error fetching prompt info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromptInfo();
  }, [promptId, accessToken]);

  if (loading) {
    return <div className="p-4">{t("common.loading")}</div>;
  }

  if (!promptData) {
    return <div className="p-4">{t("prompts.promptNotFound")}</div>;
  }

  // Format date helper function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const copyToClipboard = async (text: string | null | undefined, key: string) => {
    const success = await utilCopyToClipboard(text);
    if (success) {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accessToken || !promptData) return;

    setIsDeleting(true);
    try {
      await deletePromptCall(accessToken, basePromptId);
      NotificationsManager.success(t("prompts.promptDeletedSuccess", { name: basePromptId }));
      onDelete?.(); // Call the callback to refresh the parent component
      onClose(); // Close the info view
    } catch (error) {
      console.error("Error deleting prompt:", error);
      NotificationsManager.fromBackend(t("prompts.failedToDeletePrompt"));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Use utility functions to extract prompt data
  const promptModel = promptData ? extractModel(promptData) || "gpt-4o" : "gpt-4o";
  const basePromptId = getBasePromptId(promptData);
  const currentVersion = getCurrentVersion(promptData);

  return (
    <div className="p-4">
      <div>
        <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onClose} className="mb-4">
          {t("prompts.backToPrompts")}
        </TremorButton>
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title>{t("prompts.promptDetails")}</Title>
            <div className="flex items-center cursor-pointer">
              <Text className="text-gray-500 font-mono">{basePromptId}</Text>
              <Button
                type="text"
                size="small"
                icon={copiedStates["prompt-id"] ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                onClick={() => copyToClipboard(basePromptId, "prompt-id")}
                className={`left-2 z-10 transition-all duration-200 ${
                  copiedStates["prompt-id"]
                    ? "text-green-600 bg-green-50 border-green-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <PromptCodeSnippets
              promptId={basePromptId}
              model={promptModel}
              promptVariables={extractTemplateVariables(promptTemplate?.content)}
              accessToken={accessToken}
              version={currentVersion}
            />
            <TremorButton
              icon={PencilIcon}
              variant="primary"
              onClick={() => onEdit?.(rawApiResponse)}
              className="flex items-center"
            >
              {t("prompts.promptStudio")}
            </TremorButton>
          {isAdmin && (
            <TremorButton
              icon={TrashIcon}
              variant="secondary"
              onClick={handleDeleteClick}
              className="flex items-center"
            >
              {t("prompts.deletePrompt")}
            </TremorButton>
          )}
          </div>
        </div>
      </div>

      <TabGroup>
        <TabList className="mb-4">
          <Tab key="overview">{t("prompts.overview")}</Tab>
          {promptTemplate ? <Tab key="prompt-template">{t("prompts.promptTemplate")}</Tab> : <></>}
          {isAdmin ? <Tab key="details">{t("common.details")}</Tab> : <></>}
          <Tab key="raw-json">{t("prompts.rawJson")}</Tab>
        </TabList>

        <TabPanels>
          {/* Overview Panel */}
          <TabPanel>
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
              <Card>
                <Text>{t("prompts.promptId")}</Text>
                <div className="mt-2">
                  <Title className="font-mono text-sm">{basePromptId}</Title>
                </div>
              </Card>

              <Card>
                <Text>{t("prompts.version")}</Text>
                <div className="mt-2">
                  <Title>{currentVersion}</Title>
                  <Badge color="blue" className="mt-1">
                    v{currentVersion}
                  </Badge>
                </div>
              </Card>

              <Card>
                <Text>{t("prompts.promptType")}</Text>
                <div className="mt-2">
                  <Title>{promptData.prompt_info?.prompt_type || "-"}</Title>
                  <Badge color="blue" className="mt-1">
                    {promptData.prompt_info?.prompt_type || t("prompts.unknown")}
                  </Badge>
                </div>
              </Card>

              <Card>
                <Text>{t("prompts.createdAt")}</Text>
                <div className="mt-2">
                  <Title>{formatDate(promptData.created_at)}</Title>
                  <Text>{t("prompts.lastUpdated")}: {formatDate(promptData.updated_at)}</Text>
                </div>
              </Card>
            </Grid>

            {promptData.litellm_params && Object.keys(promptData.litellm_params).length > 0 && (
              <Card className="mt-6">
                <Text className="font-medium">{t("prompts.litellmParameters")}</Text>
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(promptData.litellm_params, null, 2)}
                  </pre>
                </div>
              </Card>
            )}
          </TabPanel>

          {/* Prompt Template Panel */}
          {promptTemplate && (
            <TabPanel>
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <Title>{t("prompts.promptTemplate")}</Title>
                  <Button
                    type="text"
                    size="small"
                    icon={copiedStates["prompt-content"] ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    onClick={() => copyToClipboard(promptTemplate.content, "prompt-content")}
                    className={`transition-all duration-200 ${
                      copiedStates["prompt-content"]
                        ? "text-green-600 bg-green-50 border-green-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {copiedStates["prompt-content"] ? t("common.copied") : t("prompts.copyContent")}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Text className="font-medium">{t("prompts.templateId")}</Text>
                    <div className="font-mono text-sm bg-gray-50 p-2 rounded">{promptTemplate.litellm_prompt_id}</div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.content")}</Text>
                    <div className="mt-2 p-4 bg-gray-50 rounded-md border overflow-auto max-h-96">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">{promptTemplate.content}</pre>
                    </div>
                  </div>

                  {promptTemplate.metadata && Object.keys(promptTemplate.metadata).length > 0 && (
                    <div>
                      <Text className="font-medium">{t("prompts.templateMetadata")}</Text>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-64">
                          {JSON.stringify(promptTemplate.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabPanel>
          )}

          {/* Details Panel (only for admins) */}
          {isAdmin && (
            <TabPanel>
              <Card>
                <Title className="mb-4">{t("prompts.promptDetails")}</Title>
                <div className="space-y-4">
                  <div>
                    <Text className="font-medium">{t("prompts.promptId")}</Text>
                    <div className="font-mono text-sm bg-gray-50 p-2 rounded">{basePromptId}</div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.promptType")}</Text>
                    <div>{promptData.prompt_info?.prompt_type || "-"}</div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.createdAt")}</Text>
                    <div>{formatDate(promptData.created_at)}</div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.lastUpdated")}</Text>
                    <div>{formatDate(promptData.updated_at)}</div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.litellmParameters")}</Text>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
                        {JSON.stringify(promptData.litellm_params, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <Text className="font-medium">{t("prompts.promptInfo")}</Text>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(promptData.prompt_info, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </TabPanel>
          )}

          {/* Raw JSON Panel */}
          <TabPanel>
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Title>{t("prompts.rawApiResponse")}</Title>
                <Button
                  type="text"
                  size="small"
                  icon={copiedStates["raw-json"] ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  onClick={() => copyToClipboard(JSON.stringify(rawApiResponse, null, 2), "raw-json")}
                  className={`transition-all duration-200 ${
                    copiedStates["raw-json"]
                      ? "text-green-600 bg-green-50 border-green-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {copiedStates["raw-json"] ? t("common.copied") : t("prompts.copyJson")}
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-md border overflow-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(rawApiResponse, null, 2)}
                </pre>
              </div>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Delete Confirmation Modal */}
      <Modal
        title={t("prompts.deletePrompt")}
        open={showDeleteConfirm}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmLoading={isDeleting}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
      >
        <p>
          {t("prompts.deleteConfirmMessage", { name: basePromptId })}
        </p>
        <p>{t("prompts.actionCannotBeUndone")}</p>
      </Modal>
    </div>
  );
};

export default PromptInfoView;
