import React, { useEffect } from "react";
import { Modal, Form, message } from "antd";
import { useTranslation } from "react-i18next";
import {
  AccessGroupBaseForm,
  AccessGroupFormValues,
} from "./AccessGroupBaseForm";
import {
  useEditAccessGroup,
  AccessGroupUpdateParams,
} from "@/app/(dashboard)/hooks/accessGroups/useEditAccessGroup";
import { AccessGroupResponse } from "@/app/(dashboard)/hooks/accessGroups/useAccessGroups";

interface AccessGroupEditModalProps {
  visible: boolean;
  accessGroup: AccessGroupResponse;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function AccessGroupEditModal({
  visible,
  accessGroup,
  onCancel,
  onSuccess,
}: AccessGroupEditModalProps) {
  const [form] = Form.useForm<AccessGroupFormValues>();
  const editMutation = useEditAccessGroup();
  const { t } = useTranslation();

  // Populate the form with initial values whenever the modal opens or the data changes
  useEffect(() => {
    if (visible && accessGroup) {
      form.setFieldsValue({
        name: accessGroup.access_group_name,
        description: accessGroup.description ?? "",
        modelIds: accessGroup.access_model_names ?? [],
        mcpServerIds: accessGroup.access_mcp_server_ids ?? [],
        agentIds: accessGroup.access_agent_ids ?? [],
      });
    }
  }, [visible, accessGroup, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const params: AccessGroupUpdateParams = {
          access_group_name: values.name,
          description: values.description,
          access_model_names: values.modelIds,
          access_mcp_server_ids: values.mcpServerIds,
          access_agent_ids: values.agentIds,
        };

        editMutation.mutate(
          { accessGroupId: accessGroup.access_group_id, params },
          {
            onSuccess: () => {
              message.success(t("accessGroups.updatedSuccess"));
              onSuccess?.();
              onCancel();
            },
          },
        );
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title={t("accessGroups.editAccessGroup")}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={700}
      okText={t("accessGroups.saveChanges")}
      cancelText={t("common.cancel")}
      confirmLoading={editMutation.isPending}
      destroyOnHidden
    >
      <AccessGroupBaseForm form={form} />
    </Modal>
  );
}
