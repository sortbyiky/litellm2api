"use client";

import { useUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUISettings";
import { useUpdateUISettings } from "@/app/(dashboard)/hooks/uiSettings/useUpdateUISettings";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import NotificationManager from "@/components/molecules/notifications_manager";
import PageVisibilitySettings from "./PageVisibilitySettings";
import { Alert, Card, Divider, Skeleton, Space, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";

export default function UISettings() {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const { data, isLoading, isError, error } = useUISettings();
  const { mutate: updateSettings, isPending: isUpdating, error: updateError } = useUpdateUISettings(accessToken);

  const schema = data?.field_schema;
  const property = schema?.properties?.disable_model_add_for_internal_users;
  const disableTeamAdminDeleteProperty = schema?.properties?.disable_team_admin_delete_team_user;
  const requireAuthForPublicAIHubProperty = schema?.properties?.require_auth_for_public_ai_hub;
  const forwardClientHeadersProperty = schema?.properties?.forward_client_headers_to_llm_api;
  const enabledPagesProperty = schema?.properties?.enabled_ui_pages_internal_users;
  const values = data?.values ?? {};
  const isDisabledForInternalUsers = Boolean(values.disable_model_add_for_internal_users);
  const isDisabledTeamAdminDeleteTeamUser = Boolean(values.disable_team_admin_delete_team_user);

  const handleToggle = (checked: boolean) => {
    updateSettings(
      { disable_model_add_for_internal_users: checked },
      {
        onSuccess: () => {
          NotificationManager.success(t("uiTheme.settingsUpdatedSuccess"));
        },
        onError: (error) => {
          NotificationManager.fromBackend(error);
        },
      },
    );
  };

  const handleToggleTeamAdminDelete = (checked: boolean) => {
    updateSettings(
      { disable_team_admin_delete_team_user: checked },
      {
        onSuccess: () => {
          NotificationManager.success(t("uiTheme.settingsUpdatedSuccess"));
        },
        onError: (error) => {
          NotificationManager.fromBackend(error);
        },
      },
    );
  };

  const handleUpdatePageVisibility = (settings: { enabled_ui_pages_internal_users: string[] | null }) => {
    updateSettings(settings, {
      onSuccess: () => {
          NotificationManager.success(t("uiTheme.pageVisibilityUpdated"));
      },
      onError: (error) => {
        NotificationManager.fromBackend(error);
      },
    });
  };

  const handleToggleForwardClientHeaders = (checked: boolean) => {
    updateSettings(
      { forward_client_headers_to_llm_api: checked },
      {
        onSuccess: () => {
          NotificationManager.success(t("uiTheme.settingsUpdatedSuccess"));
        },
        onError: (error) => {
          NotificationManager.fromBackend(error);
        },
      },
    );
  };

  const handleToggleRequireAuthForPublicAIHub = (checked: boolean) => {
    updateSettings(
      { require_auth_for_public_ai_hub: checked },
      {
        onSuccess: () => {
          NotificationManager.success(t("uiTheme.settingsUpdatedSuccess"));
        },
        onError: (error) => {
          NotificationManager.fromBackend(error);
        },
      },
    );
  };

  return (
    <Card title={t("uiTheme.uiSettings")}>
      {isLoading ? (
        <Skeleton active />
      ) : isError ? (
        <Alert
          type="error"
          message={t("uiTheme.couldNotLoad")}
          description={error instanceof Error ? error.message : undefined}
        />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {schema?.description && (
            <Typography.Paragraph style={{ marginBottom: 0 }}>{schema.description}</Typography.Paragraph>
          )}

          {updateError && (
            <Alert
              type="error"
              message={t("uiTheme.couldNotUpdate")}
              description={updateError instanceof Error ? updateError.message : undefined}
            />
          )}

          <Space align="start" size="middle">
            <Switch
              checked={isDisabledForInternalUsers}
              disabled={isUpdating}
              loading={isUpdating}
              onChange={handleToggle}
              aria-label={property?.description ?? t("uiTheme.disableModelAddForInternalUsers")}
            />
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{t("uiTheme.disableModelAddForInternalUsers")}</Typography.Text>
              {property?.description && <Typography.Text type="secondary">{property.description}</Typography.Text>}
            </Space>
          </Space>

          <Space align="start" size="middle">
            <Switch
              checked={isDisabledTeamAdminDeleteTeamUser}
              disabled={isUpdating}
              loading={isUpdating}
              onChange={handleToggleTeamAdminDelete}
              aria-label={disableTeamAdminDeleteProperty?.description ?? t("uiTheme.disableTeamAdminDeleteTeamUser")}
            />
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{t("uiTheme.disableTeamAdminDeleteTeamUser")}</Typography.Text>
              {disableTeamAdminDeleteProperty?.description && (
                <Typography.Text type="secondary">{disableTeamAdminDeleteProperty.description}</Typography.Text>
              )}
            </Space>
          </Space>

          <Space align="start" size="middle">
            <Switch
              checked={values.require_auth_for_public_ai_hub}
              disabled={isUpdating}
              loading={isUpdating}
              onChange={handleToggleRequireAuthForPublicAIHub}
              aria-label={requireAuthForPublicAIHubProperty?.description ?? t("uiTheme.requireAuthForPublicAIHub")}
            />
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{t("uiTheme.requireAuthForPublicAIHub")}</Typography.Text>
              {requireAuthForPublicAIHubProperty?.description && (
                <Typography.Text type="secondary">{requireAuthForPublicAIHubProperty.description}</Typography.Text>
              )}
            </Space>
          </Space>

          <Space align="start" size="middle">
            <Switch
              checked={Boolean(values.forward_client_headers_to_llm_api)}
              disabled={isUpdating}
              loading={isUpdating}
              onChange={handleToggleForwardClientHeaders}
              aria-label={forwardClientHeadersProperty?.description ?? t("uiTheme.forwardClientHeaders")}
            />
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{t("uiTheme.forwardClientHeaders")}</Typography.Text>
              <Typography.Text type="secondary">
                {forwardClientHeadersProperty?.description ??
                  t("uiTheme.forwardClientHeadersDesc")}
              </Typography.Text>
            </Space>
          </Space>

          <Divider />

          {/* Page Visibility for Internal Users */}
          <PageVisibilitySettings
            enabledPagesInternalUsers={values.enabled_ui_pages_internal_users}
            enabledPagesPropertyDescription={enabledPagesProperty?.description}
            isUpdating={isUpdating}
            onUpdate={handleUpdatePageVisibility}
          />
        </Space>
      )}
    </Card>
  );
}
