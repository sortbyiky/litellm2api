import { useModelCostMap } from "@/app/(dashboard)/hooks/models/useModelCostMap";
import { useModelHub, useModelsInfo } from "@/app/(dashboard)/hooks/models/useModels";
import { transformModelData } from "@/app/(dashboard)/models-and-endpoints/utils/modelDataTransformer";
import { InfoCircleOutlined } from "@ant-design/icons";
import { ArrowLeftIcon, KeyIcon, RefreshIcon, TrashIcon } from "@heroicons/react/outline";
import {
  Card,
  Grid,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  TextInput,
  Title,
  Button as TremorButton,
} from "@tremor/react";
import { Button, Form, Input, Modal, Select, Tooltip } from "antd";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyToClipboard as utilCopyToClipboard } from "../utils/dataUtils";
import { formItemValidateJSON, truncateString } from "../utils/textUtils";
import CacheControlSettings from "./add_model/cache_control_settings";
import DeleteResourceModal from "./common_components/DeleteResourceModal";
import EditAutoRouterModal from "./edit_auto_router/edit_auto_router_modal";
import ReuseCredentialsModal from "./model_add/reuse_credentials";
import NotificationsManager from "./molecules/notifications_manager";
import {
  CredentialItem,
  credentialCreateCall,
  credentialGetCall,
  getGuardrailsList,
  modelDeleteCall,
  modelInfoV1Call,
  modelPatchUpdateCall,
  tagListCall,
  testConnectionRequest,
} from "./networking";
import { getProviderLogoAndName } from "./provider_info_helpers";
import NumericalInput from "./shared/numerical_input";
import { Tag } from "./tag_management/types";
import { getDisplayModelName } from "./view_model/model_name_display";

interface ModelInfoViewProps {
  modelId: string;
  onClose: () => void;
  accessToken: string | null;
  userID: string | null;
  userRole: string | null;
  onModelUpdate?: (updatedModel: any) => void;
  modelAccessGroups: string[] | null;
}

export default function ModelInfoView({
  modelId,
  onClose,
  accessToken,
  userID,
  userRole,
  onModelUpdate,
  modelAccessGroups,
}: ModelInfoViewProps) {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [localModelData, setLocalModelData] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingCredential, setExistingCredential] = useState<CredentialItem | null>(null);
  const [showCacheControl, setShowCacheControl] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isAutoRouterModalOpen, setIsAutoRouterModalOpen] = useState(false);
  const [guardrailsList, setGuardrailsList] = useState<string[]>([]);
  const [tagsList, setTagsList] = useState<Record<string, Tag>>({});

  // Fetch model data using hook
  const { data: rawModelDataResponse, isLoading: isLoadingModel } = useModelsInfo(1, 50, undefined, modelId);
  const { data: modelCostMapData } = useModelCostMap();
  const { data: modelHubData } = useModelHub();

  // Transform the model data
  const getProviderFromModel = (model: string) => {
    if (modelCostMapData !== null && modelCostMapData !== undefined) {
      if (typeof modelCostMapData == "object" && model in modelCostMapData) {
        return modelCostMapData[model]["litellm_provider"];
      }
    }
    return "openai";
  };

  const transformedModelData = useMemo(() => {
    if (!rawModelDataResponse?.data || rawModelDataResponse.data.length === 0) {
      return null;
    }
    const transformed = transformModelData(rawModelDataResponse, getProviderFromModel);
    return transformed.data[0] || null;
  }, [rawModelDataResponse, modelCostMapData]);

  // Keep modelData variable name for backwards compatibility
  const modelData = transformedModelData;

  const canEditModel =
    (userRole === "Admin" || modelData?.model_info?.created_by === userID) && modelData?.model_info?.db_model;
  const isAdmin = userRole === "Admin";
  const isAutoRouter = modelData?.litellm_params?.auto_router_config != null;

  const usingExistingCredential =
    modelData?.litellm_params?.litellm_credential_name != null &&
    modelData?.litellm_params?.litellm_credential_name != undefined;

  // Initialize localModelData from modelData when available
  useEffect(() => {
    if (modelData && !localModelData) {
      let processedModelData = modelData;
      if (!processedModelData.litellm_model_name) {
        processedModelData = {
          ...processedModelData,
          litellm_model_name:
            processedModelData?.litellm_params?.litellm_model_name ??
            processedModelData?.litellm_params?.model ??
            processedModelData?.model_info?.key ??
            null,
        };
      }
      setLocalModelData(processedModelData);

      // Check if cache control is enabled
      if (processedModelData?.litellm_params?.cache_control_injection_points) {
        setShowCacheControl(true);
      }
    }
  }, [modelData, localModelData]);

  useEffect(() => {
    const getExistingCredential = async () => {
      if (!accessToken) return;
      if (usingExistingCredential) return;
      let existingCredentialResponse = await credentialGetCall(accessToken, null, modelId);
      setExistingCredential({
        credential_name: existingCredentialResponse["credential_name"],
        credential_values: existingCredentialResponse["credential_values"],
        credential_info: existingCredentialResponse["credential_info"],
      });
    };

    const getModelInfo = async () => {
      if (!accessToken) return;
      // Only fetch if we don't have modelData yet
      if (modelData) return;
      let modelInfoResponse = await modelInfoV1Call(accessToken, modelId);
      let specificModelData = modelInfoResponse.data[0];
      if (specificModelData && !specificModelData.litellm_model_name) {
        specificModelData = {
          ...specificModelData,
          litellm_model_name:
            specificModelData?.litellm_params?.litellm_model_name ??
            specificModelData?.litellm_params?.model ??
            specificModelData?.model_info?.key ??
            null,
        };
      }
      setLocalModelData(specificModelData);

      // Check if cache control is enabled
      if (specificModelData?.litellm_params?.cache_control_injection_points) {
        setShowCacheControl(true);
      }
    };

    const fetchGuardrails = async () => {
      if (!accessToken) return;
      try {
        const response = await getGuardrailsList(accessToken);
        const guardrailNames = response.guardrails.map((g: { guardrail_name: string }) => g.guardrail_name);
        setGuardrailsList(guardrailNames);
      } catch (error) {
        console.error("Failed to fetch guardrails:", error);
      }
    };

    const fetchTags = async () => {
      if (!accessToken) return;
      try {
        const response = await tagListCall(accessToken);
        setTagsList(response);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    getExistingCredential();
    getModelInfo();
    fetchGuardrails();
    fetchTags();
  }, [accessToken, modelId]);

  const handleReuseCredential = async (values: any) => {
    if (!accessToken) return;
    let credentialItem = {
      credential_name: values.credential_name,
      model_id: modelId,
      credential_info: {
        custom_llm_provider: localModelData.litellm_params?.custom_llm_provider,
      },
    };
    NotificationsManager.info(t("modelDashboard.storingCredential"));
    let credentialResponse = await credentialCreateCall(accessToken, credentialItem);
    NotificationsManager.success(t("modelDashboard.credentialStoredSuccess"));
  };

  const handleModelUpdate = async (values: any) => {
    try {
      if (!accessToken) return;
      setIsSaving(true);

      // Parse LiteLLM extra params from JSON text area
      let parsedExtraParams: Record<string, any> = {};
      try {
        parsedExtraParams = values.litellm_extra_params ? JSON.parse(values.litellm_extra_params) : {};
      } catch (e) {
        NotificationsManager.fromBackend(t("modelDashboard.invalidJsonLitellmParams"));
        setIsSaving(false);
        return;
      }

      let updatedLitellmParams = {
        ...values.litellm_params,
        ...parsedExtraParams,
        model: values.litellm_model_name,
        api_base: values.api_base,
        custom_llm_provider: values.custom_llm_provider,
        organization: values.organization,
        tpm: values.tpm,
        rpm: values.rpm,
        max_retries: values.max_retries,
        timeout: values.timeout,
        stream_timeout: values.stream_timeout,
        input_cost_per_token: values.input_cost / 1_000_000,
        output_cost_per_token: values.output_cost / 1_000_000,
        tags: values.tags,
      };
      if (values.guardrails) {
        updatedLitellmParams.guardrails = values.guardrails;
      }

      // Handle cache control settings
      if (values.cache_control && values.cache_control_injection_points?.length > 0) {
        updatedLitellmParams.cache_control_injection_points = values.cache_control_injection_points;
      } else {
        delete updatedLitellmParams.cache_control_injection_points;
      }

      // Parse the model_info from the form values
      let updatedModelInfo;
      try {
        updatedModelInfo = values.model_info ? JSON.parse(values.model_info) : modelData.model_info;
        // Update access_groups from the form
        if (values.model_access_group) {
          updatedModelInfo = {
            ...updatedModelInfo,
            access_groups: values.model_access_group,
          };
        }
        // Override health_check_model from the form
        if (values.health_check_model !== undefined) {
          updatedModelInfo = {
            ...updatedModelInfo,
            health_check_model: values.health_check_model,
          };
        }
      } catch (e) {
        NotificationsManager.fromBackend(t("modelDashboard.invalidJsonModelInfo"));
        return;
      }

      const updateData = {
        model_name: values.model_name,
        litellm_params: updatedLitellmParams,
        model_info: updatedModelInfo,
      };

      await modelPatchUpdateCall(accessToken, updateData, modelId);

      const updatedModelData = {
        ...localModelData,
        model_name: values.model_name,
        litellm_model_name: values.litellm_model_name,
        litellm_params: updatedLitellmParams,
        model_info: updatedModelInfo,
      };

      setLocalModelData(updatedModelData);

      if (onModelUpdate) {
        onModelUpdate(updatedModelData);
      }

      NotificationsManager.success(t("modelDashboard.modelSettingsUpdated"));
      setIsDirty(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating model:", error);
      NotificationsManager.fromBackend(t("modelDashboard.failedToUpdateModelSettings"));
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoadingModel) {
    return (
      <div className="p-4">
        <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onClose} className="mb-4">
          {t("modelDashboard.backToModels")}
        </TremorButton>
        <Text>{t("modelDashboard.loading")}</Text>
      </div>
    );
  }

  // Show not found if model is not found
  if (!modelData) {
    return (
      <div className="p-4">
        <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onClose} className="mb-4">
          {t("modelDashboard.backToModels")}
        </TremorButton>
        <Text>{t("modelDashboard.modelNotFound")}</Text>
      </div>
    );
  }

  const handleTestConnection = async () => {
    if (!accessToken) return;
    try {
      NotificationsManager.info(t("modelDashboard.testingConnection"));
      const response = await testConnectionRequest(
        accessToken,
        {
          custom_llm_provider: localModelData.litellm_params.custom_llm_provider,
          litellm_credential_name: localModelData.litellm_params.litellm_credential_name,
          model: localModelData.litellm_model_name,
        },
        {
          mode: localModelData.model_info?.mode,
        },
        localModelData.model_info?.mode,
      );

      if (response.status === "success") {
        NotificationsManager.success(t("modelDashboard.connectionTestSuccess"));
      } else {
        throw new Error(response?.result?.error || response?.message || "Unknown error");
      }
    } catch (error) {
      if (error instanceof Error) {
        NotificationsManager.error(t("modelDashboard.errorTestingConnection") + ": " + truncateString(error.message, 100));
      } else {
        NotificationsManager.error(t("modelDashboard.errorTestingConnection") + ": " + String(error));
      }
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      if (!accessToken) return;
      await modelDeleteCall(accessToken, modelId);
      NotificationsManager.success(t("modelDashboard.modelDeletedSuccess"));

      if (onModelUpdate) {
        onModelUpdate({
          deleted: true,
          model_info: { id: modelId },
        });
      }

      onClose();
    } catch (error) {
      console.error("Error deleting the model:", error);
      NotificationsManager.fromBackend(t("modelDashboard.failedToDeleteModel"));
    } finally {
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    const success = await utilCopyToClipboard(text);
    if (success) {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  const handleAutoRouterUpdate = (updatedModel: any) => {
    setLocalModelData(updatedModel);
    if (onModelUpdate) {
      onModelUpdate(updatedModel);
    }
  };
  const isWildcardModel = modelData.litellm_model_name.includes("*");

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onClose} className="mb-4">
            {t("modelDashboard.backToModels")}
          </TremorButton>
          <Title>{t("modelDashboard.publicModelNameLabel")}: {getDisplayModelName(modelData)}</Title>
          <div className="flex items-center cursor-pointer">
            <Text className="text-gray-500 font-mono">{modelData.model_info.id}</Text>
            <Button
              type="text"
              size="small"
              icon={copiedStates["model-id"] ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              onClick={() => copyToClipboard(modelData.model_info.id, "model-id")}
              className={`left-2 z-10 transition-all duration-200 ${copiedStates["model-id"]
                ? "text-green-600 bg-green-50 border-green-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <TremorButton
            variant="secondary"
            icon={RefreshIcon}
            onClick={handleTestConnection}
            className="flex items-center gap-2"
            data-testid="test-connection-button"
          >
            {t("modelDashboard.testConnection")}
          </TremorButton>

          <TremorButton
            icon={KeyIcon}
            variant="secondary"
            onClick={() => setIsCredentialModalOpen(true)}
            className="flex items-center"
            disabled={!isAdmin}
            data-testid="reuse-credentials-button"
          >
            {t("modelDashboard.reuseCredentials")}
          </TremorButton>
          <TremorButton
            icon={TrashIcon}
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center text-red-500 border-red-500 hover:text-red-700"
            disabled={!canEditModel}
            data-testid="delete-model-button"
          >
            {t("modelDashboard.deleteModel")}
          </TremorButton>
        </div>
      </div>

      <TabGroup>
        <TabList className="mb-6">
          <Tab>{t("modelDashboard.overview")}</Tab>
          <Tab>{t("modelDashboard.rawJson")}</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* Overview Grid */}
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mb-6">
              <Card>
                <Text>{t("modelDashboard.provider")}</Text>
                <div className="mt-2 flex items-center space-x-2">
                  {modelData.provider && (
                    <img
                      src={getProviderLogoAndName(modelData.provider).logo}
                      alt={`${modelData.provider} logo`}
                      className="w-4 h-4"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const parent = target.parentElement;
                        if (!parent || !parent.contains(target)) {
                          return;
                        }

                        try {
                          const fallbackDiv = document.createElement("div");
                          fallbackDiv.className =
                            "w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs";
                          fallbackDiv.textContent = modelData.provider?.charAt(0) || "-";
                          parent.replaceChild(fallbackDiv, target);
                        } catch (error) {
                          console.error("Failed to replace provider logo fallback:", error);
                        }
                      }}
                    />
                  )}
                  <Title>{modelData.provider || t("modelDashboard.notSet")}</Title>
                </div>
              </Card>
              <Card>
                <Text>{t("modelDashboard.litellmModel")}</Text>
                <div className="mt-2 overflow-hidden">
                  <Tooltip title={modelData.litellm_model_name || t("modelDashboard.notSet")}>
                    <div className="break-all text-sm font-medium leading-relaxed cursor-pointer">
                      {modelData.litellm_model_name || t("modelDashboard.notSet")}
                    </div>
                  </Tooltip>
                </div>
              </Card>
              <Card>
                <Text>{t("modelDashboard.pricing")}</Text>
                <div className="mt-2">
                  <Text>{t("modelDashboard.inputCostPerMillion", { cost: modelData.input_cost })}</Text>
                  <Text>{t("modelDashboard.outputCostPerMillion", { cost: modelData.output_cost })}</Text>
                </div>
              </Card>
            </Grid>

            {/* Audit info shown as a subtle banner below the overview */}
            <div className="mb-6 text-sm text-gray-500 flex items-center gap-x-6">
              <div className="flex items-center gap-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t("modelDashboard.createdAtLabel")}{" "}
                {modelData.model_info.created_at
                  ? new Date(modelData.model_info.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  : t("modelDashboard.notSet")}
              </div>
              <div className="flex items-center gap-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {t("modelDashboard.createdByLabel")} {modelData.model_info.created_by || t("modelDashboard.notSet")}
              </div>
            </div>

            {/* Settings Card */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Title>{t("modelDashboard.modelSettings")}</Title>
                <div className="flex gap-2">
                  {isAutoRouter && canEditModel && !isEditing && (
                    <TremorButton onClick={() => setIsAutoRouterModalOpen(true)} className="flex items-center">
                      {t("modelDashboard.editAutoRouter")}
                    </TremorButton>
                  )}
                  {canEditModel ? (
                    !isEditing && (
                      <TremorButton onClick={() => setIsEditing(true)} className="flex items-center">
                        {t("modelDashboard.editSettings")}
                      </TremorButton>
                    )
                  ) : (
                    <Tooltip title={t("modelDashboard.onlyDbModelsCanBeEdited")}>
                      <InfoCircleOutlined />
                    </Tooltip>
                  )}
                </div>
              </div>
              {localModelData ? (
                <Form
                  form={form}
                  onFinish={handleModelUpdate}
                  initialValues={{
                    model_name: localModelData.model_name,
                    litellm_model_name: localModelData.litellm_model_name,
                    api_base: localModelData.litellm_params.api_base,
                    custom_llm_provider: localModelData.litellm_params.custom_llm_provider,
                    organization: localModelData.litellm_params.organization,
                    tpm: localModelData.litellm_params.tpm,
                    rpm: localModelData.litellm_params.rpm,
                    max_retries: localModelData.litellm_params.max_retries,
                    timeout: localModelData.litellm_params.timeout,
                    stream_timeout: localModelData.litellm_params.stream_timeout,
                    input_cost: localModelData.litellm_params.input_cost_per_token
                      ? localModelData.litellm_params.input_cost_per_token * 1_000_000
                      : localModelData.model_info?.input_cost_per_token * 1_000_000 || null,
                    output_cost: localModelData.litellm_params?.output_cost_per_token
                      ? localModelData.litellm_params.output_cost_per_token * 1_000_000
                      : localModelData.model_info?.output_cost_per_token * 1_000_000 || null,
                    cache_control: localModelData.litellm_params?.cache_control_injection_points ? true : false,
                    cache_control_injection_points: localModelData.litellm_params?.cache_control_injection_points || [],
                    model_access_group: Array.isArray(localModelData.model_info?.access_groups)
                      ? localModelData.model_info.access_groups
                      : [],
                    guardrails: Array.isArray(localModelData.litellm_params?.guardrails)
                      ? localModelData.litellm_params.guardrails
                      : [],
                    tags: Array.isArray(localModelData.litellm_params?.tags) ? localModelData.litellm_params.tags : [],
                    health_check_model: isWildcardModel ? localModelData.model_info?.health_check_model : null,
                    litellm_extra_params: JSON.stringify(localModelData.litellm_params || {}, null, 2),
                  }}
                  layout="vertical"
                  onValuesChange={() => setIsDirty(true)}
                >
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Text className="font-medium">{t("modelDashboard.modelNameLabel")}</Text>
                        {isEditing ? (
                          <Form.Item name="model_name" className="mb-0">
                            <TextInput placeholder={t("modelDashboard.enterModelName")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">{localModelData.model_name}</div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.litellmModelName")}</Text>
                        {isEditing ? (
                          <Form.Item name="litellm_model_name" className="mb-0">
                            <TextInput placeholder={t("modelDashboard.enterLitellmModelName")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">{localModelData.litellm_model_name}</div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.inputCostPerMillionTokens")}</Text>
                        {isEditing ? (
                          <Form.Item name="input_cost" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterInputCost")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData?.litellm_params?.input_cost_per_token
                              ? (localModelData.litellm_params?.input_cost_per_token * 1_000_000).toFixed(4)
                              : localModelData?.model_info?.input_cost_per_token
                                ? (localModelData.model_info.input_cost_per_token * 1_000_000).toFixed(4)
                                : t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.outputCostPerMillionTokens")}</Text>
                        {isEditing ? (
                          <Form.Item name="output_cost" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterOutputCost")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData?.litellm_params?.output_cost_per_token
                              ? (localModelData.litellm_params.output_cost_per_token * 1_000_000).toFixed(4)
                              : localModelData?.model_info?.output_cost_per_token
                                ? (localModelData.model_info.output_cost_per_token * 1_000_000).toFixed(4)
                                : t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.apiBase")}</Text>
                        {isEditing ? (
                          <Form.Item name="api_base" className="mb-0">
                            <TextInput placeholder={t("modelDashboard.enterApiBase")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.api_base || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.customLlmProvider")}</Text>
                        {isEditing ? (
                          <Form.Item name="custom_llm_provider" className="mb-0">
                            <TextInput placeholder={t("modelDashboard.enterCustomLlmProvider")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.custom_llm_provider || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.organization")}</Text>
                        {isEditing ? (
                          <Form.Item name="organization" className="mb-0">
                            <TextInput placeholder={t("modelDashboard.enterOrganization")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.organization || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.tpm")}</Text>
                        {isEditing ? (
                          <Form.Item name="tpm" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterTpm")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.tpm || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.rpm")}</Text>
                        {isEditing ? (
                          <Form.Item name="rpm" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterRpm")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.rpm || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.maxRetries")}</Text>
                        {isEditing ? (
                          <Form.Item name="max_retries" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterMaxRetries")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.max_retries || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.timeout")}</Text>
                        {isEditing ? (
                          <Form.Item name="timeout" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterTimeout")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.timeout || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.streamTimeout")}</Text>
                        {isEditing ? (
                          <Form.Item name="stream_timeout" className="mb-0">
                            <NumericalInput placeholder={t("modelDashboard.enterStreamTimeout")} />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.stream_timeout || t("modelDashboard.notSet")}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.modelAccessGroups")}</Text>
                        {isEditing ? (
                          <Form.Item name="model_access_group" className="mb-0">
                            <Select
                              mode="tags"
                              showSearch
                              placeholder={t("modelDashboard.selectOrCreateGroups")}
                              optionFilterProp="children"
                              tokenSeparators={[","]}
                              maxTagCount="responsive"
                              allowClear
                              style={{ width: "100%" }}
                              options={modelAccessGroups?.map((group) => ({
                                value: group,
                                label: group,
                              }))}
                            />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.model_info?.access_groups ? (
                              Array.isArray(localModelData.model_info.access_groups) ? (
                                localModelData.model_info.access_groups.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {localModelData.model_info.access_groups.map((group: string, index: number) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {group}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  t("modelDashboard.noGroupsAssigned")
                                )
                              ) : (
                                localModelData.model_info.access_groups
                              )
                            ) : (
                              t("modelDashboard.notSet")
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">
                          {t("modelDashboard.guardrails")}
                          <Tooltip title={t("modelDashboard.guardrailsTooltip")}>
                            <a
                              href="https://docs.litellm.ai/docs/proxy/guardrails/quick_start"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
                            </a>
                          </Tooltip>
                        </Text>
                        {isEditing ? (
                          <Form.Item name="guardrails" className="mb-0">
                            <Select
                              mode="tags"
                              showSearch
                              placeholder={t("modelDashboard.selectOrCreateGuardrails")}
                              optionFilterProp="children"
                              tokenSeparators={[","]}
                              maxTagCount="responsive"
                              allowClear
                              style={{ width: "100%" }}
                              options={guardrailsList.map((name) => ({
                                value: name,
                                label: name,
                              }))}
                            />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.guardrails ? (
                              Array.isArray(localModelData.litellm_params.guardrails) ? (
                                localModelData.litellm_params.guardrails.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {localModelData.litellm_params.guardrails.map(
                                      (guardrail: string, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                        >
                                          {guardrail}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  t("modelDashboard.noGuardrailsAssigned")
                                )
                              ) : (
                                localModelData.litellm_params.guardrails
                              )
                            ) : (
                              t("modelDashboard.notSet")
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Text className="font-medium">{t("modelDashboard.tags")}</Text>
                        {isEditing ? (
                          <Form.Item name="tags" className="mb-0">
                            <Select
                              mode="tags"
                              showSearch
                              placeholder={t("modelDashboard.selectOrCreateTags")}
                              optionFilterProp="children"
                              tokenSeparators={[","]}
                              maxTagCount="responsive"
                              allowClear
                              style={{ width: "100%" }}
                              options={Object.values(tagsList).map((tag: Tag) => ({
                                value: tag.name,
                                label: tag.name,
                                title: tag.description || tag.name,
                              }))}
                            />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.tags ? (
                              Array.isArray(localModelData.litellm_params.tags) ? (
                                localModelData.litellm_params.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {localModelData.litellm_params.tags.map((tag: string, index: number) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  t("modelDashboard.noTagsAssigned")
                                )
                              ) : (
                                localModelData.litellm_params.tags
                              )
                            ) : (
                              t("modelDashboard.notSet")
                            )}
                          </div>
                        )}
                      </div>

                      {isWildcardModel && (
                        <div>
                          <Text className="font-medium">{t("modelDashboard.healthCheckModel")}</Text>
                          {isEditing ? (
                            <Form.Item name="health_check_model" className="mb-0">
                              <Select
                                showSearch
                                placeholder={t("modelDashboard.selectHealthCheckModel")}
                                optionFilterProp="children"
                                allowClear
                                options={(() => {
                                  const wildcardProvider = modelData.litellm_model_name.split("/")[0];
                                  return modelHubData?.data
                                    ?.filter((model: any) => {
                                      // Filter by provider to match the wildcard provider
                                      return (
                                        model.providers?.includes(wildcardProvider) &&
                                        model.model_group !== modelData.litellm_model_name
                                      );
                                    })
                                    .map((model: any) => ({
                                      value: model.model_group,
                                      label: model.model_group,
                                    })) || [];
                                })()}
                              />
                            </Form.Item>
                          ) : (
                            <div className="mt-1 p-2 bg-gray-50 rounded">
                              {localModelData.model_info?.health_check_model || t("modelDashboard.notSet")}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cache Control Section */}
                      {isEditing ? (
                        <CacheControlSettings
                          form={form}
                          showCacheControl={showCacheControl}
                          onCacheControlChange={(checked) => setShowCacheControl(checked)}
                        />
                      ) : (
                        <div>
                          <Text className="font-medium">{t("modelDashboard.cacheControl")}</Text>
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            {localModelData.litellm_params?.cache_control_injection_points ? (
                              <div>
                                <p>{t("modelDashboard.enabled")}</p>
                                <div className="mt-2">
                                  {localModelData.litellm_params.cache_control_injection_points.map(
                                    (point: any, i: number) => (
                                      <div key={i} className="text-sm text-gray-600 mb-1">
                                        Location: {point.location},{point.role && <span> Role: {point.role}</span>}
                                        {point.index !== undefined && <span> Index: {point.index}</span>}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ) : (
                              t("modelDashboard.disabled")
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <Text className="font-medium">{t("modelDashboard.modelInfo")}</Text>
                        {isEditing ? (
                          <Form.Item name="model_info" className="mb-0">
                            <Input.TextArea
                              rows={4}
                              placeholder='{"gpt-4": 100, "claude-v1": 200}'
                              defaultValue={JSON.stringify(modelData.model_info, null, 2)}
                            />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-1">
                              {JSON.stringify(localModelData.model_info, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div>
                        <Text className="font-medium">
                          {t("modelDashboard.litellmParams")}
                          <Tooltip title={t("modelDashboard.litellmParamsTooltip")}>
                            <a
                              href="https://docs.litellm.ai/docs/completion/input"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
                            </a>
                          </Tooltip>
                        </Text>
                        {isEditing ? (
                          <Form.Item name="litellm_extra_params" rules={[{ validator: formItemValidateJSON }]}>
                            <Input.TextArea
                              rows={4}
                              placeholder='{
                  "rpm": 100,
                  "timeout": 0,
                  "stream_timeout": 0
                }'
                            />
                          </Form.Item>
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-1">
                              {JSON.stringify(localModelData.litellm_params, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div>
                        <Text className="font-medium">{t("modelDashboard.teamId")}</Text>
                        <div className="mt-1 p-2 bg-gray-50 rounded">{modelData.model_info.team_id || t("modelDashboard.notSet")}</div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-6 flex justify-end gap-2">
                        <TremorButton
                          variant="secondary"
                          onClick={() => {
                            form.resetFields();
                            setIsDirty(false);
                            setIsEditing(false);
                          }}
                          disabled={isSaving}
                        >
                          {t("modelDashboard.cancel")}
                        </TremorButton>
                        <TremorButton variant="primary" onClick={() => form.submit()} loading={isSaving}>
                          {t("modelDashboard.saveChanges")}
                        </TremorButton>
                      </div>
                    )}
                  </div>
                </Form>
              ) : (
                <Text>{t("modelDashboard.loading")}</Text>
              )}
            </Card>
          </TabPanel>

          <TabPanel>
            <Card>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">{JSON.stringify(modelData, null, 2)}</pre>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <DeleteResourceModal
        isOpen={isDeleteModalOpen}
        title={t("modelDashboard.deleteModel")}
        alertMessage={t("modelDashboard.actionCannotBeUndone")}
        message={t("modelDashboard.confirmDeleteModel")}
        resourceInformationTitle={t("modelDashboard.modelInformation")}
        resourceInformation={[
          {
            label: t("modelDashboard.modelNameLabel"),
            value: modelData?.model_name || t("modelDashboard.notSet"),
          },
          {
            label: t("modelDashboard.litellmModelName"),
            value: modelData?.litellm_model_name || t("modelDashboard.notSet"),
          },
          {
            label: t("modelDashboard.provider"),
            value: modelData?.provider || t("modelDashboard.notSet"),
          },
          {
            label: t("modelDashboard.createdBy"),
            value: modelData?.model_info?.created_by || t("modelDashboard.notSet"),
          },
        ]}
        onCancel={() => setIsDeleteModalOpen(false)}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
      />

      {isCredentialModalOpen && !usingExistingCredential ? (
        <ReuseCredentialsModal
          isVisible={isCredentialModalOpen}
          onCancel={() => setIsCredentialModalOpen(false)}
          onAddCredential={handleReuseCredential}
          existingCredential={existingCredential}
          setIsCredentialModalOpen={setIsCredentialModalOpen}
        />
      ) : (
        <Modal
          open={isCredentialModalOpen}
          onCancel={() => setIsCredentialModalOpen(false)}
          title={t("modelDashboard.usingExistingCredential")}
        >
          <Text>{modelData.litellm_params.litellm_credential_name}</Text>
        </Modal>
      )}

      {/* Edit Auto Router Modal */}
      <EditAutoRouterModal
        isVisible={isAutoRouterModalOpen}
        onCancel={() => setIsAutoRouterModalOpen(false)}
        onSuccess={handleAutoRouterUpdate}
        modelData={localModelData || modelData}
        accessToken={accessToken || ""}
        userRole={userRole || ""}
      />
    </div>
  );
}
