import { useCloudZeroUpdateSettings } from "@/app/(dashboard)/hooks/cloudzero/useCloudZeroSettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { Form, Input, message, Modal } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CloudZeroSettings } from "./types";

interface CloudZeroUpdateModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  settings: CloudZeroSettings;
}

export default function CloudZeroUpdateModal({ open, onOk, onCancel, settings }: CloudZeroUpdateModalProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const [form] = Form.useForm();
  const updateMutation = useCloudZeroUpdateSettings(accessToken || "");

  useEffect(() => {
    if (open && settings) {
      form.setFieldsValue({
        connection_id: settings.connection_id,
        timezone: settings.timezone || "UTC",
        api_key: "",
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, settings, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      updateMutation.mutate(
        {
          connection_id: values.connection_id,
          timezone: values.timezone || "UTC",
          ...(values.api_key && { api_key: values.api_key }),
        },
        {
          onSuccess: () => {
            message.success(t("cloudZero.integrationUpdatedSuccess"));
            form.resetFields();
            onOk();
          },
          onError: (error: any) => {
            if (error?.errorFields) {
              return;
            }
            message.error(error?.message || t("cloudZero.failedToUpdateIntegration"));
          },
        },
      );
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || t("cloudZero.failedToUpdateIntegration"));
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t("cloudZero.editIntegration")}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={updateMutation.isPending}
      okText={updateMutation.isPending ? t("cloudZero.updating") : t("common.update")}
      cancelText={t("common.cancel")}
      okButtonProps={{
        disabled: updateMutation.isPending,
      }}
      cancelButtonProps={{
        disabled: updateMutation.isPending,
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label={t("cloudZero.apiKey")}
          name="api_key"
          rules={[{ required: false, message: t("cloudZero.pleaseEnterApiKey") }]}
          tooltip={t("cloudZero.leaveEmptyToKeep")}
        >
          <Input.Password placeholder={t("cloudZero.leaveEmptyToKeepExisting")} />
        </Form.Item>
        <Form.Item
          label={t("cloudZero.connectionId")}
          name="connection_id"
          rules={[{ required: true, message: t("cloudZero.pleaseEnterConnectionId") }]}
        >
          <Input placeholder={t("cloudZero.enterConnectionId")} />
        </Form.Item>
        <Form.Item
          label={t("cloudZero.timezone")}
          name="timezone"
          tooltip={t("cloudZero.timezoneTooltip")}
        >
          <Input placeholder="UTC" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
