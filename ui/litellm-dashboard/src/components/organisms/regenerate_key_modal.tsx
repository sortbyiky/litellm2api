import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { Button, Col, Grid, Text, TextInput, Title } from "@tremor/react";
import { Form, InputNumber, Modal } from "antd";
import { add } from "date-fns";
import { useEffect, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { KeyResponse } from "../key_team_helpers/key_list";
import NotificationManager from "../molecules/notifications_manager";
import { useTranslation } from "react-i18next";
import { regenerateKeyCall } from "../networking";

interface RegenerateKeyModalProps {
  selectedToken: KeyResponse | null;
  visible: boolean;
  onClose: () => void;
  onKeyUpdate?: (updatedKeyData: Partial<KeyResponse>) => void;
}

export function RegenerateKeyModal({ selectedToken, visible, onClose, onKeyUpdate }: RegenerateKeyModalProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuthorized();
  const [form] = Form.useForm();
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);
  const [regenerateFormData, setRegenerateFormData] = useState<any>(null);
  const [newExpiryTime, setNewExpiryTime] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Track whether this is the user's own authentication key
  const [isOwnKey, setIsOwnKey] = useState<boolean>(false);

  // Keep track of the current valid access token locally
  const [currentAccessToken, setCurrentAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (visible && selectedToken && accessToken) {
      form.setFieldsValue({
        key_alias: selectedToken.key_alias,
        max_budget: selectedToken.max_budget,
        tpm_limit: selectedToken.tpm_limit,
        rpm_limit: selectedToken.rpm_limit,
        duration: selectedToken.duration || "",
        grace_period: "",
      });

      // Initialize the current access token
      setCurrentAccessToken(accessToken);

      // Check if this is the user's own authentication key by comparing the key values
      const isUserOwnKey = selectedToken.key_name === accessToken;
      setIsOwnKey(isUserOwnKey);
    }
  }, [visible, selectedToken, form, accessToken]);

  useEffect(() => {
    if (!visible) {
      // Reset states when modal is closed
      setRegeneratedKey(null);
      setIsRegenerating(false);
      setIsOwnKey(false);
      setCurrentAccessToken(null);
      form.resetFields();
    }
  }, [visible, form]);

  const calculateNewExpiryTime = (duration: string | undefined): string | null => {
    if (!duration) return null;

    try {
      const now = new Date();
      let newExpiry: Date;

      if (duration.endsWith("s")) {
        newExpiry = add(now, { seconds: parseInt(duration) });
      } else if (duration.endsWith("h")) {
        newExpiry = add(now, { hours: parseInt(duration) });
      } else if (duration.endsWith("d")) {
        newExpiry = add(now, { days: parseInt(duration) });
      } else {
        throw new Error("Invalid duration format");
      }

      return newExpiry.toLocaleString();
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (regenerateFormData?.duration) {
      setNewExpiryTime(calculateNewExpiryTime(regenerateFormData.duration));
    } else {
      setNewExpiryTime(null);
    }
  }, [regenerateFormData?.duration]);

  const handleRegenerateKey = async () => {
    if (!selectedToken || !currentAccessToken) return;

    setIsRegenerating(true);
    try {
      const formValues = await form.validateFields();

      // Use the current access token for the API call
      const response = await regenerateKeyCall(
        currentAccessToken,
        selectedToken.token || selectedToken.token_id,
        formValues,
      );
      setRegeneratedKey(response.key);
      NotificationManager.success(t("keys.regenerateKeySuccess"));

      console.log("Full regenerate response:", response); // Debug log to see what's returned

      // Create updated key data with ALL new values from the response
      const updatedKeyData: Partial<KeyResponse> = {
        // Use the new token/key ID from the response (this is what was missing!)
        token: response.token || response.key_id || selectedToken.token, // Try different possible field names
        key_name: response.key, // This is the new secret key string
        max_budget: formValues.max_budget,
        tpm_limit: formValues.tpm_limit,
        rpm_limit: formValues.rpm_limit,
        expires: formValues.duration ? calculateNewExpiryTime(formValues.duration) : selectedToken.expires,
        // Include any other fields that might be returned by the API
        ...response, // Spread the entire response to capture all updated fields
      };

      console.log("Updated key data with new token:", updatedKeyData); // Debug log

      // Update the parent component with new key data
      if (onKeyUpdate) {
        onKeyUpdate(updatedKeyData);
      }

      setIsRegenerating(false);
    } catch (error) {
      console.error("Error regenerating key:", error);
      NotificationManager.fromBackend(error);
      setIsRegenerating(false); // Reset regenerating state on error
    }
  };

  const handleClose = () => {
    setRegeneratedKey(null);
    setIsRegenerating(false);
    setIsOwnKey(false);
    setCurrentAccessToken(null);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={t("keys.regenerateKey")}
      open={visible}
      onCancel={handleClose}
      footer={
        regeneratedKey
          ? [
              <Button key="close" onClick={handleClose}>
                {t("common.close")}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose} className="mr-2">
                {t("common.cancel")}
              </Button>,
              <Button key="regenerate" onClick={handleRegenerateKey} disabled={isRegenerating}>
                {isRegenerating ? t("keys.regenerateKeyModal.regenerating") : t("keys.regenerateKeyModal.regenerate")}
              </Button>,
            ]
      }
    >
      {regeneratedKey ? (
        <Grid numItems={1} className="gap-2 w-full">
          <Title>{t("keys.regeneratedKey")}</Title>
          <Col numColSpan={1}>
            <p>
              {t("keys.regeneratedKeyWarning")}
            </p>
          </Col>
          <Col numColSpan={1}>
            <Text className="mt-3">{t("keys.keyAlias")}:</Text>
            <div className="bg-gray-100 p-2 rounded mb-2">
              <pre className="break-words whitespace-normal">{selectedToken?.key_alias || t("keys.noAliasSet")}</pre>
            </div>
            <Text className="mt-3">{t("keys.newVirtualKey")}:</Text>
            <div className="bg-gray-100 p-2 rounded mb-2">
              <pre className="break-words whitespace-normal">{regeneratedKey}</pre>
            </div>
            <CopyToClipboard
              text={regeneratedKey}
              onCopy={() => NotificationManager.success(t("keys.keyCopied"))}
            >
              <Button className="mt-3">{t("keys.copyKey")}</Button>
            </CopyToClipboard>
          </Col>
        </Grid>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if ("duration" in changedValues) {
              setRegenerateFormData((prev: { duration?: string }) => ({ ...prev, duration: changedValues.duration }));
            }
          }}
        >
          <Form.Item name="key_alias" label={t("keys.keyAlias")}>
            <TextInput disabled={true} />
          </Form.Item>
          <Form.Item name="max_budget" label={t("keys.maxBudgetUsd")}>
            <InputNumber step={0.01} precision={2} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="tpm_limit" label={t("keys.tpmLimit")}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rpm_limit" label={t("keys.rpmLimit")}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="duration" label={t("keys.expireKey")} className="mt-8">
            <TextInput placeholder="" />
          </Form.Item>
          <div className="mt-2 text-sm text-gray-500">
            {t("keys.currentExpiry")}: {selectedToken?.expires ? new Date(selectedToken.expires).toLocaleString() : t("keys.never")}
          </div>
          {newExpiryTime && <div className="mt-2 text-sm text-green-600">{t("keys.newExpiry")}: {newExpiryTime}</div>}
          <Form.Item
            name="grace_period"
            label={t("keys.gracePeriod")}
            tooltip={t("keys.gracePeriodTooltip")}
            className="mt-8"
            rules={[
              {
                pattern: /^(\d+(s|m|h|d|w|mo))?$/,
                message: t("keys.durationFormatError"),
              },
            ]}
          >
            <TextInput placeholder={t("keys.gracePeriodPlaceholder")} />
          </Form.Item>
          <div className="mt-2 text-sm text-gray-500">
            {t("keys.gracePeriodRecommendation")}
          </div>
        </Form>
      )}
    </Modal>
  );
}
