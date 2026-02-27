import { useAgents } from "@/app/(dashboard)/hooks/agents/useAgents";
import { useMCPServers } from "@/app/(dashboard)/hooks/mcpServers/useMCPServers";
import { ModelSelect } from "@/components/ModelSelect/ModelSelect";
import type { FormInstance } from "antd";
import { Form, Input, Select, Space, Tabs } from "antd";
import { BotIcon, InfoIcon, LayersIcon, ServerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const { TextArea } = Input;

export interface AccessGroupFormValues {
  name: string;
  description: string;
  modelIds: string[];
  mcpServerIds: string[];
  agentIds: string[];
}

interface AccessGroupBaseFormProps {
  form: FormInstance<AccessGroupFormValues>;
  isNameDisabled?: boolean;
}

export function AccessGroupBaseForm({
  form,
  isNameDisabled = false,
}: AccessGroupBaseFormProps) {
  const { data: agentsData } = useAgents();
  const { data: mcpServersData } = useMCPServers();
  const { t } = useTranslation();

  const agents = agentsData?.agents ?? [];
  const mcpServers = mcpServersData ?? [];
  const items = [
    {
      key: "1",
      label: (
        <Space align="center" size={4}>
          <InfoIcon size={16} />
          {t("accessGroups.generalInfo")}
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item
            name="name"
            label={t("accessGroups.groupName")}
            rules={[
              {
                required: true,
                message: t("accessGroups.groupNameRequired"),
              },
            ]}
          >
            <Input
              placeholder={t("accessGroups.groupNamePlaceholder")}
              disabled={isNameDisabled}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("accessGroups.description")}
          >
            <TextArea
              rows={4}
              placeholder={t("accessGroups.descriptionPlaceholder")}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <Space align="center" size={4}>
          <LayersIcon size={16} />
          {t("accessGroups.models")}
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item name="modelIds" label={t("accessGroups.allowedModels")}>
            <ModelSelect
              context="global"
              value={form.getFieldValue("modelIds") ?? []}
              onChange={(values) => form.setFieldsValue({ modelIds: values })}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <Space align="center" size={4}>
          <ServerIcon size={16} />
          {t("accessGroups.mcpServers")}
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item name="mcpServerIds" label={t("accessGroups.allowedMcpServers")}>
            <Select
              mode="multiple"
              placeholder={t("accessGroups.selectMcpServers")}
              style={{ width: "100%" }}
              optionFilterProp="label"
              allowClear
              options={mcpServers.map((server) => ({
                label: server.server_name ?? server.server_id,
                value: server.server_id,
              }))}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "4",
      label: (
        <Space align="center" size={4}>
          <BotIcon size={16} />
          {t("accessGroups.agents")}
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item name="agentIds" label={t("accessGroups.allowedAgents")}>
            <Select
              mode="multiple"
              placeholder={t("accessGroups.selectAgents")}
              style={{ width: "100%" }}
              optionFilterProp="label"
              allowClear
              options={agents.map((agent) => ({
                label: agent.agent_name,
                value: agent.agent_id,
              }))}
            />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      name="access_group_form"
      initialValues={{
        modelIds: [],
        mcpServerIds: [],
        agentIds: [],
      }}
    >
      <Tabs defaultActiveKey="1" items={items} />
    </Form>
  );
}
