import { useEditSSOSettings } from "@/app/(dashboard)/hooks/sso/useEditSSOSettings";
import { useSSOSettings } from "@/app/(dashboard)/hooks/sso/useSSOSettings";
import React from "react";
import DeleteResourceModal from "../../../../common_components/DeleteResourceModal";
import NotificationsManager from "../../../../molecules/notifications_manager";
import { parseErrorMessage } from "../../../../shared/errorUtils";
import { detectSSOProvider } from "../utils";
import { useTranslation } from "react-i18next";

interface DeleteSSOSettingsModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const DeleteSSOSettingsModal: React.FC<DeleteSSOSettingsModalProps> = ({ isVisible, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const { data: ssoSettings } = useSSOSettings();
  const { mutateAsync: editSSOSettings, isPending: isEditingSSOSettings } = useEditSSOSettings();

  // Handle clearing SSO settings
  const handleClearSSO = async () => {
    const clearSettings = {
      google_client_id: null,
      google_client_secret: null,
      microsoft_client_id: null,
      microsoft_client_secret: null,
      microsoft_tenant: null,
      generic_client_id: null,
      generic_client_secret: null,
      generic_authorization_endpoint: null,
      generic_token_endpoint: null,
      generic_userinfo_endpoint: null,
      proxy_base_url: null,
      user_email: null,
      sso_provider: null,
      role_mappings: null,
      team_mappings: null,
    };

    await editSSOSettings(clearSettings, {
      onSuccess: () => {
        NotificationsManager.success(t("sso.ssoClearedSuccess"));
        onCancel();
        onSuccess();
      },
      onError: (error) => {
        NotificationsManager.fromBackend(t("sso.failedToClearSSO") + parseErrorMessage(error));
      },
    });
  };

  return (
    <DeleteResourceModal
      isOpen={isVisible}
      title={t("sso.confirmClearSSOSettings")}
      alertMessage={t("sso.actionCannotBeUndone")}
      message={t("sso.clearSSOConfirmMessage")}
      resourceInformationTitle={t("sso.ssoSettings")}
      resourceInformation={[
        { label: t("sso.provider"), value: (ssoSettings?.values && detectSSOProvider(ssoSettings?.values)) || "Generic" },
      ]}
      onCancel={onCancel}
      onOk={handleClearSSO}
      confirmLoading={isEditingSSOSettings}
    />
  );
};

export default DeleteSSOSettingsModal;
