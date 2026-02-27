import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Form, message, Select, Input, Steps, Radio, Tag, Divider } from "antd";
import { Button } from "@tremor/react";
import { CheckCircleFilled, KeyOutlined, RobotOutlined, AppstoreOutlined } from "@ant-design/icons";
import CreatedKeyDisplay from "../shared/CreatedKeyDisplay";
import {
  createAgentCall,
  getAgentCreateMetadata,
  keyCreateForAgentCall,
  keyListCall,
  keyUpdateCall,
  AgentCreateInfo,
} from "../networking";
import AgentFormFields from "./agent_form_fields";
import DynamicAgentFormFields, { buildDynamicAgentData } from "./dynamic_agent_form_fields";
import { getDefaultFormValues, buildAgentDataFromForm } from "./agent_config";

const { Step } = Steps;

const CUSTOM_AGENT_TYPE = "custom";

interface AddAgentFormProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSuccess: () => void;
}

const AddAgentForm: React.FC<AddAgentFormProps> = ({
  visible,
  onClose,
  accessToken,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentType, setAgentType] = useState<string>("a2a");
  const [agentTypeMetadata, setAgentTypeMetadata] = useState<AgentCreateInfo[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Step 1: key assignment state
  const [keyAssignOption, setKeyAssignOption] = useState<"create_new" | "existing_key" | "skip">("create_new");
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [newKeyModels, setNewKeyModels] = useState<string[]>([]);
  const [existingKeys, setExistingKeys] = useState<any[]>([]);
  const [selectedExistingKey, setSelectedExistingKey] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Step 2: results
  const [createdAgentName, setCreatedAgentName] = useState<string>("");
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const [assignedKeyAlias, setAssignedKeyAlias] = useState<string | null>(null);

  // Fetch agent type metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const metadata = await getAgentCreateMetadata();
        setAgentTypeMetadata(metadata);
      } catch (error) {
        console.error("Error fetching agent metadata:", error);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch existing keys when assign key step becomes active
  useEffect(() => {
    if (currentStep === 1 && accessToken && existingKeys.length === 0) {
      const fetchKeys = async () => {
        setLoadingKeys(true);
        try {
          const result = await keyListCall(accessToken, null, null, null, null, null, 1, 100);
          setExistingKeys(result?.keys || []);
        } catch (error) {
          console.error("Error fetching keys:", error);
        } finally {
          setLoadingKeys(false);
        }
      };
      fetchKeys();
    }
  }, [currentStep, accessToken]);

  const selectedAgentTypeInfo = agentTypeMetadata.find(
    (info) => info.agent_type === agentType
  );

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(["agent_name"]);
        const agentName = form.getFieldValue("agent_name");
        if (agentName && !newKeyName) {
          setNewKeyName(`${agentName}-key`);
        }
      }
      setCurrentStep((s) => s + 1);
    } catch {
      // validation failed — stay on current step
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const buildAgentData = (values: any) => {
    if (agentType === CUSTOM_AGENT_TYPE) {
      return {
        agent_name: values.agent_name,
        agent_card_params: {
          protocolVersion: "1.0",
          name: values.agent_name,
          description: values.description || "",
          url: "",
          version: "1.0.0",
          defaultInputModes: ["text"],
          defaultOutputModes: ["text"],
          capabilities: { streaming: false },
          skills: [],
        },
      };
    } else if (agentType === "a2a") {
      return buildAgentDataFromForm(values);
    } else if (selectedAgentTypeInfo?.use_a2a_form_fields) {
      const agentData = buildAgentDataFromForm(values);
      if (selectedAgentTypeInfo.litellm_params_template) {
        agentData.litellm_params = {
          ...agentData.litellm_params,
          ...selectedAgentTypeInfo.litellm_params_template,
        };
      }
      for (const field of selectedAgentTypeInfo.credential_fields) {
        const value = values[field.key];
        if (value && field.include_in_litellm_params !== false) {
          agentData.litellm_params[field.key] = value;
        }
      }
      return agentData;
    } else if (selectedAgentTypeInfo) {
      return buildDynamicAgentData(values, selectedAgentTypeInfo);
    }
    return null;
  };

  const handleCreateAgent = async () => {
    if (!accessToken) {
      message.error(t("agentsSub.noAccessToken"));
      return;
    }

    setIsSubmitting(true);
    try {
      // getFieldsValue(true) returns ALL preserved values including fields from
      // unmounted steps; merge with any currently-mounted validated fields.
      await form.validateFields();
      const values = { ...form.getFieldsValue(true) };
      const agentData = buildAgentData(values);
      if (!agentData) {
        message.error(t("agentsSub.failedBuildAgentData"));
        setIsSubmitting(false);
        return;
      }

      const agentResponse = await createAgentCall(accessToken, agentData);
      const agentId: string = agentResponse.agent_id;
      const agentName: string = agentResponse.agent_name || values.agent_name || agentId;
      setCreatedAgentName(agentName);

      if (keyAssignOption === "create_new" && newKeyName) {
        const keyResponse = await keyCreateForAgentCall(
          accessToken,
          agentId,
          newKeyName,
          newKeyModels,
        );
        setCreatedKeyValue(keyResponse.key || null);
      } else if (keyAssignOption === "existing_key") {
        if (!selectedExistingKey) {
          message.error(t("agentsSub.pleaseSelectExistingKey"));
          setIsSubmitting(false);
          return;
        }
        await keyUpdateCall(accessToken, {
          key: selectedExistingKey,
          agent_id: agentId,
        });
        const keyInfo = existingKeys.find((k) => k.token === selectedExistingKey);
        setAssignedKeyAlias(keyInfo?.key_alias || selectedExistingKey.slice(0, 12) + "…");
      }

      setCurrentStep(2);
      onSuccess();
    } catch (error) {
      console.error("Error creating agent:", error);
      message.error(t("agentsSub.failedCreateAgent"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setAgentType("a2a");
    setCurrentStep(0);
    setKeyAssignOption("create_new");
    setNewKeyName("");
    setNewKeyModels([]);
    setSelectedExistingKey(null);
    setCreatedAgentName("");
    setCreatedKeyValue(null);
    setAssignedKeyAlias(null);
    onClose();
  };

  const handleAgentTypeChange = (value: string) => {
    setAgentType(value);
    form.resetFields();
  };

  const isCustomAgent = agentType === CUSTOM_AGENT_TYPE;
  const selectedLogo = isCustomAgent
    ? null
    : selectedAgentTypeInfo?.logo_url ||
      agentTypeMetadata.find((a) => a.agent_type === "a2a")?.logo_url;

  const renderConfigureStep = () => (
    <>
      <Form.Item
        label={<span className="text-sm font-medium text-gray-700">{t("agentsSub.agentType")}</span>}
        required
        tooltip={t("agentsSub.selectAgentTypeTooltip")}
      >
        <Select
          value={agentType}
          onChange={handleAgentTypeChange}
          size="large"
          style={{ width: "100%" }}
          optionLabelProp="label"
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: "4px 0" }} />
              <div className="px-2 py-1">
                <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide px-2">
                  {t("agentsSub.notListed")}
                </div>
                <div
                  className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors ${
                    agentType === CUSTOM_AGENT_TYPE
                      ? "bg-amber-50"
                      : "hover:bg-amber-50"
                  }`}
                  onClick={() => handleAgentTypeChange(CUSTOM_AGENT_TYPE)}
                >
                  <AppstoreOutlined className="text-amber-600 text-lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-700">{t("agentsSub.customOther")}</span>
                      <Tag color="orange" style={{ fontSize: 10, padding: "0 4px" }}>GENERIC</Tag>
                    </div>
                    <div className="text-xs text-amber-600">
                      {t("agentsSub.customAgentDesc")}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        >
          {agentTypeMetadata.map((info) => (
            <Select.Option
              key={info.agent_type}
              value={info.agent_type}
              label={
                <div className="flex items-center gap-2">
                  <img src={info.logo_url || ""} alt="" className="w-4 h-4 object-contain" />
                  <span>{info.agent_type_display_name}</span>
                </div>
              }
            >
              <div className="flex items-center gap-3 py-1">
                <img
                  src={info.logo_url || ""}
                  alt={info.agent_type_display_name}
                  className="w-5 h-5 object-contain"
                />
                <div>
                  <div className="font-medium">{info.agent_type_display_name}</div>
                  {info.description && (
                    <div className="text-xs text-gray-500">{info.description}</div>
                  )}
                </div>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <div className="mt-4">
        {agentType === CUSTOM_AGENT_TYPE ? (
          <div className="space-y-4">
            <Form.Item
              label={t("agentsSub.agentName")}
              name="agent_name"
              rules={[{ required: true, message: t("agentsSub.pleaseEnterAgentName") }]}
            >
              <Input placeholder={t("agentsSub.agentNamePlaceholder")} />
            </Form.Item>
            <Form.Item
              label={t("agentsSub.description")}
              name="description"
            >
              <Input.TextArea placeholder={t("agentsSub.descriptionPlaceholder")} rows={3} />
            </Form.Item>
          </div>
        ) : agentType === "a2a" ? (
          <AgentFormFields showAgentName={true} />
        ) : selectedAgentTypeInfo?.use_a2a_form_fields ? (
          <>
            <AgentFormFields showAgentName={true} />
            {selectedAgentTypeInfo.credential_fields.length > 0 && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {selectedAgentTypeInfo.agent_type_display_name} {t("agentsSub.settings")}
                </h4>
                {selectedAgentTypeInfo.credential_fields.map((field) => (
                  <Form.Item
                    key={field.key}
                    label={field.label}
                    name={field.key}
                    rules={
                      field.required
                        ? [{ required: true, message: `Please enter ${field.label}` }]
                        : undefined
                    }
                    tooltip={field.tooltip}
                    initialValue={field.default_value}
                  >
                    {field.field_type === "password" ? (
                      <Input.Password placeholder={field.placeholder || ""} />
                    ) : (
                      <Input placeholder={field.placeholder || ""} />
                    )}
                  </Form.Item>
                ))}
              </div>
            )}
          </>
        ) : selectedAgentTypeInfo ? (
          <DynamicAgentFormFields agentTypeInfo={selectedAgentTypeInfo} />
        ) : null}
      </div>
    </>
  );

  const renderAssignKeyStep = () => {
    const agentName = form.getFieldValue("agent_name") || "your-agent";
    return (
      <div>
        {/* Agent name chip */}
        <div className="flex justify-center mb-6">
          <Tag icon={<RobotOutlined />} color="purple" className="px-3 py-1 text-sm">
            {agentName}
          </Tag>
        </div>

        <div className="space-y-3">
          {/* Option: Create new key */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              keyAssignOption === "create_new"
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => setKeyAssignOption("create_new")}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Radio
                  value="create_new"
                  checked={keyAssignOption === "create_new"}
                  onChange={() => setKeyAssignOption("create_new")}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <KeyOutlined className="text-indigo-600" />
                    <span className="font-medium text-gray-900">{t("agentsSub.createNewKey")}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("agentsSub.dedicatedKeyDesc")}
                  </p>
                  {keyAssignOption === "create_new" && (
                    <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">{t("agentsSub.keyName")}</label>
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g. my-agent-key"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">
                          {t("agentsSub.allowedModels")} <span className="text-gray-400">({t("agentsSub.optionalLeaveEmpty")})</span>
                        </label>
                        <Select
                          mode="tags"
                          style={{ width: "100%" }}
                          placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                          value={newKeyModels}
                          onChange={setNewKeyModels}
                          tokenSeparators={[","]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Tag color="green">{t("agentsSub.recommended")}</Tag>
            </div>
          </div>

          {/* Option: Assign existing key */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              keyAssignOption === "existing_key"
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => setKeyAssignOption("existing_key")}
          >
            <div className="flex items-start gap-3">
              <Radio
                value="existing_key"
                checked={keyAssignOption === "existing_key"}
                onChange={() => setKeyAssignOption("existing_key")}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <KeyOutlined className="text-gray-500" />
                    <span className="font-medium text-gray-900">{t("agentsSub.assignExistingKey")}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t("agentsSub.reassignKeyDesc")}
                </p>
                {keyAssignOption === "existing_key" && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                      showSearch
                      style={{ width: "100%" }}
                      placeholder={t("agentsSub.searchByKeyName")}
                      loading={loadingKeys}
                      value={selectedExistingKey}
                      onChange={(value) => setSelectedExistingKey(value)}
                      filterOption={(input, option) =>
                        (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={existingKeys.map((k) => ({
                        label: k.key_alias || k.token?.slice(0, 12) + "…",
                        value: k.token,
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            type="button"
            className="text-sm text-gray-500 underline hover:text-gray-700"
            onClick={() => setKeyAssignOption("skip")}
          >
            {t("agentsSub.skipForNow")}
          </button>
        </div>
      </div>
    );
  };

  const renderReadyStep = () => (
    <div className="text-center py-6">
      <CheckCircleFilled className="text-5xl text-green-500 mb-4" style={{ fontSize: 48 }} />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("agentsSub.agentCreated")}</h3>
      <div className="flex justify-center mb-4">
        <Tag icon={<RobotOutlined />} color="purple" className="px-3 py-1 text-sm">
          {createdAgentName}
        </Tag>
      </div>
      {createdKeyValue && (
        <div className="mt-4 text-left max-w-md mx-auto">
          <CreatedKeyDisplay apiKey={createdKeyValue} />
        </div>
      )}
      {assignedKeyAlias && (
        <p className="text-sm text-gray-600 mt-2">
          {t("agentsSub.keyAssignedToAgent", { keyAlias: assignedKeyAlias })}
        </p>
      )}
      {!createdKeyValue && !assignedKeyAlias && keyAssignOption === "skip" && (
        <p className="text-sm text-gray-500 mt-2">
          {t("agentsSub.noKeyAssigned")}
        </p>
      )}
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
          {selectedLogo && currentStep < 1 && (
            <img src={selectedLogo} alt="Agent" className="w-6 h-6 object-contain" />
          )}
          <h2 className="text-xl font-semibold text-gray-900">{t("agentsSub.addNewAgent")}</h2>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      className="top-8"
      styles={{
        body: { padding: "24px" },
        header: { padding: "24px 24px 0 24px", border: "none" },
      }}
    >
      <div className="mt-4">
        {/* Step indicator */}
        <Steps current={currentStep} size="small" className="mb-8">
          <Step title={t("agentsSub.stepConfigure")} />
          <Step title={t("agentsSub.stepAssignKey")} />
          <Step title={t("agentsSub.stepReady")} />
        </Steps>

        <Form
          form={form}
          layout="vertical"
          initialValues={agentType === "a2a" ? getDefaultFormValues() : {}}
          className="space-y-4"
        >
          {currentStep === 0 && renderConfigureStep()}
          {currentStep === 1 && renderAssignKeyStep()}
          {currentStep === 2 && renderReadyStep()}
        </Form>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
          <div>
            {currentStep > 0 && currentStep < 2 && (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gray-600 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50"
              >
                ← {t("common.back")}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep < 2 && (
              <Button variant="secondary" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
            )}
            {currentStep === 0 && (
              <Button variant="primary" onClick={handleNext}>
                {t("common.next")} →
              </Button>
            )}
            {currentStep === 1 && (
              <Button variant="primary" loading={isSubmitting} onClick={handleCreateAgent}>
                {isSubmitting ? t("agentsSub.creating") : t("agentsSub.createAgent")}
              </Button>
            )}
            {currentStep === 2 && (
              <Button variant="primary" onClick={handleClose}>
                {t("agentsSub.done")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddAgentForm;
