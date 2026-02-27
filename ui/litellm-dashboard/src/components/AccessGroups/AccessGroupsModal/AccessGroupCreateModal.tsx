import React from "react";
import { Modal, Form, message } from "antd";
import { useTranslation } from "react-i18next";
import {
  AccessGroupBaseForm,
  AccessGroupFormValues,
} from "./AccessGroupBaseForm";
import {
  useCreateAccessGroup,
  AccessGroupCreateParams,
} from "@/app/(dashboard)/hooks/accessGroups/useCreateAccessGroup";

interface AccessGroupCreateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function AccessGroupCreateModal({
  visible,
  onCancel,
  onSuccess,
}: AccessGroupCreateModalProps) {
  const [form] = Form.useForm<AccessGroupFormValues>();
  const createMutation = useCreateAccessGroup();
  const { t } = useTranslation();

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const params: AccessGroupCreateParams = {
          access_group_name: values.name,
          description: values.description,
          access_model_names: values.modelIds,
          access_mcp_server_ids: values.mcpServerIds,
          access_agent_ids: values.agentIds,
        };

        createMutation.mutate(params, {
          onSuccess: () => {
            message.success(t("accessGroups.createdSuccess"));
            form.resetFields();
            onSuccess?.();
            onCancel();
          },
        });
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title={t("accessGroups.createAccessGroup")}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={700}
      okText={t("accessGroups.createGroup")}
      cancelText={t("common.cancel")}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <AccessGroupBaseForm form={form} />
    </Modal>
  );
}
