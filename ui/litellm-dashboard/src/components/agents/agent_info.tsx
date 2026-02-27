import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, Title, Text, Button as TremorButton, Tab, TabGroup, TabList, TabPanel, TabPanels} from "@tremor/react";
import { Form, Input, Button as AntButton, message, Spin, Descriptions } from "antd";
import { ArrowLeftIcon } from "@heroicons/react/outline";
import { getAgentInfo, patchAgentCall, getAgentCreateMetadata, AgentCreateInfo } from "../networking";
import { Agent } from "./types";
import AgentFormFields from "./agent_form_fields";
import DynamicAgentFormFields, { buildDynamicAgentData } from "./dynamic_agent_form_fields";
import { buildAgentDataFromForm, parseAgentForForm } from "./agent_config";
import AgentCostView from "./agent_cost_view";
import { detectAgentType, parseDynamicAgentForForm } from "./agent_type_utils";

interface AgentInfoViewProps {
  agentId: string;
  onClose: () => void;
  accessToken: string | null;
  isAdmin: boolean;
}

const AgentInfoView: React.FC<AgentInfoViewProps> = ({
  agentId,
  onClose,
  accessToken,
  isAdmin,
}) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm();
  const [agentTypeMetadata, setAgentTypeMetadata] = useState<AgentCreateInfo[]>([]);
  const [detectedAgentType, setDetectedAgentType] = useState<string>("a2a");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = await getAgentCreateMetadata();
        setAgentTypeMetadata(metadata);
      } catch (error) {
        console.error("Error fetching agent metadata:", error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAgentInfo();
  }, [agentId, accessToken]);

  const fetchAgentInfo = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const data = await getAgentInfo(accessToken, agentId);
      setAgent(data);
      
      // Detect agent type
      const agentType = detectAgentType(data);
      setDetectedAgentType(agentType);
      
      // Parse form values based on agent type
      if (agentType === "a2a") {
        form.setFieldsValue(parseAgentForForm(data));
      } else {
        const typeInfo = agentTypeMetadata.find(t => t.agent_type === agentType);
        if (typeInfo) {
          form.setFieldsValue(parseDynamicAgentForForm(data, typeInfo));
        } else {
      form.setFieldsValue(parseAgentForForm(data));
        }
      }
    } catch (error) {
      console.error("Error fetching agent info:", error);
      message.error(t("agentsSub.failedLoadAgentInfo"));
    } finally {
      setIsLoading(false);
    }
  };

  // Re-parse form when metadata is loaded
  useEffect(() => {
    if (agent && agentTypeMetadata.length > 0) {
      const agentType = detectAgentType(agent);
      if (agentType !== "a2a") {
        const typeInfo = agentTypeMetadata.find(t => t.agent_type === agentType);
        if (typeInfo) {
          form.setFieldsValue(parseDynamicAgentForForm(agent, typeInfo));
        }
      }
    }
  }, [agentTypeMetadata, agent]);

  const selectedAgentTypeInfo = agentTypeMetadata.find(t => t.agent_type === detectedAgentType);

  const handleUpdate = async (values: any) => {
    if (!accessToken || !agent) return;

    setIsSaving(true);
    try {
      let updateData: any;
      
      if (detectedAgentType === "a2a") {
        updateData = buildAgentDataFromForm(values, agent);
      } else if (selectedAgentTypeInfo) {
        updateData = buildDynamicAgentData(values, selectedAgentTypeInfo);
        // Preserve the agent_name from form
        updateData.agent_name = values.agent_name;
      } else {
        updateData = buildAgentDataFromForm(values, agent);
      }
      
      await patchAgentCall(accessToken, agentId, updateData);
      message.success(t("agentsSub.agentUpdatedSuccess"));
      setIsEditing(false);
      fetchAgentInfo();
    } catch (error) {
      console.error("Error updating agent:", error);
      message.error(t("agentsSub.failedUpdateAgent"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4">
        <div className="text-center">{t("agentsSub.agentNotFound")}</div>
        <TremorButton onClick={onClose} className="mt-4">
          {t("agentsSub.backToAgentsList")}
        </TremorButton>
      </div>
    );
  }

  // Format date helper function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-4">
      <div>
        <TremorButton icon={ArrowLeftIcon} variant="light" onClick={onClose} className="mb-4">
          {t("agentsSub.backToAgents")}
        </TremorButton>
        <Title>{agent.agent_name || t("agentsSub.unnamedAgent")}</Title>
        <Text className="text-gray-500 font-mono">{agent.agent_id}</Text>
      </div>

      <TabGroup>
        <TabList className="mb-4">
          <Tab key="overview">{t("agentsSub.overview")}</Tab>
          {isAdmin ? <Tab key="settings">{t("agentsSub.settings")}</Tab> : <></>}
        </TabList>

        <TabPanels>
          {/* Overview Panel */}
          <TabPanel>
            <Descriptions bordered column={1}>
              <Descriptions.Item label={t("agentsSub.agentId")}>{agent.agent_id}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.agentName")}>{agent.agent_name}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.displayName")}>{agent.agent_card_params?.name || "-"}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.description")}>{agent.agent_card_params?.description || "-"}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.url")}>{agent.agent_card_params?.url || "-"}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.version")}>{agent.agent_card_params?.version || "-"}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.protocolVersion")}>{agent.agent_card_params?.protocolVersion || "-"}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.streaming")}>
                {agent.agent_card_params?.capabilities?.streaming ? t("common.yes") : t("common.no")}
              </Descriptions.Item>
              {agent.agent_card_params?.capabilities?.pushNotifications && (
                <Descriptions.Item label={t("agentsSub.pushNotifications")}>{t("common.yes")}</Descriptions.Item>
              )}
              {agent.agent_card_params?.capabilities?.stateTransitionHistory && (
                <Descriptions.Item label={t("agentsSub.stateTransitionHistory")}>{t("common.yes")}</Descriptions.Item>
              )}
              <Descriptions.Item label={t("agentsSub.skills")}>
                {agent.agent_card_params?.skills?.length || 0} {t("agentsSub.configured")}
              </Descriptions.Item>
              {agent.litellm_params?.model && (
                <Descriptions.Item label={t("agentsSub.model")}>{agent.litellm_params.model}</Descriptions.Item>
              )}
              {agent.litellm_params?.make_public !== undefined && (
                <Descriptions.Item label={t("agentsSub.makePublic")}>{agent.litellm_params.make_public ? t("common.yes") : t("common.no")}</Descriptions.Item>
              )}
              {agent.agent_card_params?.iconUrl && (
                <Descriptions.Item label={t("agentsSub.iconUrl")}>{agent.agent_card_params.iconUrl}</Descriptions.Item>
              )}
              {agent.agent_card_params?.documentationUrl && (
                <Descriptions.Item label={t("agentsSub.documentationUrl")}>{agent.agent_card_params.documentationUrl}</Descriptions.Item>
              )}
              <Descriptions.Item label={t("agentsSub.createdAt")}>{formatDate(agent.created_at)}</Descriptions.Item>
              <Descriptions.Item label={t("agentsSub.updatedAt")}>{formatDate(agent.updated_at)}</Descriptions.Item>
            </Descriptions>

            <AgentCostView agent={agent} />

            {agent.agent_card_params?.skills && agent.agent_card_params.skills.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title>{t("agentsSub.skills")}</Title>
                <Descriptions bordered column={1} style={{ marginTop: 16 }}>
                  {agent.agent_card_params.skills.map((skill: any, index: number) => (
                    <Descriptions.Item label={skill.name || `Skill ${index + 1}`} key={index}>
                      <div>
                        <div><strong>ID:</strong> {skill.id}</div>
                        <div><strong>Description:</strong> {skill.description}</div>
                        <div><strong>Tags:</strong> {Array.isArray(skill.tags) ? skill.tags.join(", ") : skill.tags}</div>
                        {skill.examples && skill.examples.length > 0 && (
                          <div><strong>Examples:</strong> {Array.isArray(skill.examples) ? skill.examples.join(", ") : skill.examples}</div>
                        )}
                      </div>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </div>
            )}
          </TabPanel>

          {/* Settings Panel (only for admins) */}
          {isAdmin && (
            <TabPanel>
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <Title>{t("agentsSub.agentSettings")}</Title>
                  {!isEditing && (
                    <TremorButton onClick={() => setIsEditing(true)}>{t("agentsSub.editSettings")}</TremorButton>
                  )}
                </div>

                {isEditing ? (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdate}
                  >
                    <Form.Item label={t("agentsSub.agentId")}>
                      <Input value={agent.agent_id} disabled />
                    </Form.Item>

                    {detectedAgentType === "a2a" ? (
                      <AgentFormFields showAgentName={true} />
                    ) : selectedAgentTypeInfo ? (
                      <DynamicAgentFormFields agentTypeInfo={selectedAgentTypeInfo} />
                    ) : (
                    <AgentFormFields showAgentName={true} />
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                      <AntButton onClick={() => {
                        setIsEditing(false);
                        fetchAgentInfo();
                      }}>
                        {t("common.cancel")}
                      </AntButton>
                      <TremorButton loading={isSaving}>
                        {t("agentsSub.saveChanges")}
                      </TremorButton>
                    </div>
                  </Form>
                ) : (
                  <Text>{t("agentsSub.clickEditSettings")}</Text>
                )}
              </Card>
            </TabPanel>
          )}
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export default AgentInfoView;

