import { Form, Modal, Input, message } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { useCloudZeroCreate } from "@/app/(dashboard)/hooks/cloudzero/useCloudZeroCreate";

interface CloudZeroCreationModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export default function CloudZeroCreationModal({ open, onOk, onCancel }: CloudZeroCreationModalProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const [form] = Form.useForm();
  const createMutation = useCloudZeroCreate(accessToken || "");

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(
        {
          connection_id: values.connection_id,
          timezone: values.timezone || "UTC",
          ...(values.api_key && { api_key: values.api_key }),
        },
        {
          onSuccess: () => {
            message.success(t("cloudZero.integrationCreatedSuccess"));
            form.resetFields();
            onOk();
          },
          onError: (error: any) => {
            if (error?.errorFields) {
              return;
            }
            message.error(error?.message || t("cloudZero.failedToCreateIntegration"));
          },
        },
      );
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || t("cloudZero.failedToCreateIntegration"));
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t("cloudZero.createIntegration")}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      okText={createMutation.isPending ? t("cloudZero.creating") : t("common.create")}
      cancelText={t("common.cancel")}
      okButtonProps={{
        disabled: createMutation.isPending,
      }}
      cancelButtonProps={{
        disabled: createMutation.isPending,
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label={t("cloudZero.apiKey")}
          name="api_key"
          rules={[{ required: true, message: t("cloudZero.pleaseEnterApiKey") }]}
        >
          <Input.Password placeholder={t("cloudZero.enterApiKey")} />
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
