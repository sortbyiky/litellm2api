"use client";

import NotificationsManager from "@/components/molecules/notifications_manager";
import { parseErrorMessage } from "@/components/shared/errorUtils";
import { Button, Form, Modal, Space } from "antd";
import React from "react";
import BaseSSOSettingsForm from "./BaseSSOSettingsForm";
import { useEditSSOSettings } from "@/app/(dashboard)/hooks/sso/useEditSSOSettings";
import { processSSOSettingsPayload } from "../utils";
import { useTranslation } from "react-i18next";

interface AddSSOSettingsModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddSSOSettingsModal: React.FC<AddSSOSettingsModalProps> = ({ isVisible, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { mutateAsync, isPending } = useEditSSOSettings();

  // Enhanced form submission handler
  const handleFormSubmit = async (formValues: Record<string, any>) => {
    const payload = processSSOSettingsPayload(formValues);

    await mutateAsync(payload, {
      onSuccess: () => {
        NotificationsManager.success(t("sso.ssoSettingsAddedSuccess"));
        onSuccess();
      },
      onError: (error) => {
        NotificationsManager.fromBackend(t("sso.failedToSaveSSOSettings") + parseErrorMessage(error));
      },
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t("sso.addSSO")}
      open={isVisible}
      width={800}
      footer={
        <Space>
          <Button onClick={handleCancel} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button loading={isPending} onClick={() => form.submit()}>
            {isPending ? t("sso.adding") : t("sso.addSSO")}
          </Button>
        </Space>
      }
      onCancel={handleCancel}
    >
      <BaseSSOSettingsForm form={form} onFormSubmit={handleFormSubmit} />
    </Modal>
  );
};

export default AddSSOSettingsModal;
