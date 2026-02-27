import React, { useState } from "react";
import { Select, Tooltip, Divider, Switch } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { TextInput } from "@tremor/react";
import { useTranslation } from "react-i18next";

const { Option } = Select;

interface KeyLifecycleSettingsProps {
  form: any; // Form instance from parent
  autoRotationEnabled: boolean;
  onAutoRotationChange: (enabled: boolean) => void;
  rotationInterval: string;
  onRotationIntervalChange: (interval: string) => void;
  isCreateMode?: boolean; // If true, shows "leave empty to never expire" instead of "-1 to never expire"
}

const KeyLifecycleSettings: React.FC<KeyLifecycleSettingsProps> = ({
  form,
  autoRotationEnabled,
  onAutoRotationChange,
  rotationInterval,
  onRotationIntervalChange,
  isCreateMode = false,
}) => {
  const { t } = useTranslation();
  // Predefined intervals
  const predefinedIntervals = ["7d", "30d", "90d", "180d", "365d"];

  // Check if current interval is custom
  const isCustomInterval = rotationInterval && !predefinedIntervals.includes(rotationInterval);

  const [showCustomInput, setShowCustomInput] = useState(isCustomInterval);
  const [customInterval, setCustomInterval] = useState(isCustomInterval ? rotationInterval : "");
  const [durationValue, setDurationValue] = useState<string>(form?.getFieldValue?.("duration") || "");

  const handleIntervalChange = (value: string) => {
    if (value === "custom") {
      setShowCustomInput(true);
      // Don't change the actual interval yet, wait for custom input
    } else {
      setShowCustomInput(false);
      setCustomInterval("");
      onRotationIntervalChange(value);
    }
  };

  const handleCustomIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomInterval(value);
    onRotationIntervalChange(value);
  };

  const handleDurationChange = (value: string) => {
    setDurationValue(value);
    if (form && typeof form.setFieldValue === "function") {
      form.setFieldValue("duration", value);
    } else if (form && typeof form.setFieldsValue === "function") {
      form.setFieldsValue({ duration: value });
    }
  };
  return (
    <div className="space-y-6">
      {/* Key Expiry Section */}
      <div className="space-y-4">
        <span className="text-sm font-medium text-gray-700">{t("commonComponents.keyExpirySettings")}</span>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
            <span>{t("commonComponents.expireKey")}</span>
            <Tooltip
              title={
                isCreateMode
                  ? t("commonComponents.expireKeyTooltipCreate")
                  : t("commonComponents.expireKeyTooltipEdit")
              }
            >
              <InfoCircleOutlined className="text-gray-400 cursor-help text-xs" />
            </Tooltip>
          </label>
          <TextInput
            name="duration"
            placeholder={isCreateMode ? t("commonComponents.durationPlaceholderCreate") : t("commonComponents.durationPlaceholderEdit")}
            className="w-full"
            value={durationValue}
            onValueChange={handleDurationChange}
          />
        </div>
      </div>

      <Divider />

      {/* Auto-Rotation Section */}
      <div className="space-y-4">
        <span className="text-sm font-medium text-gray-700">{t("commonComponents.autoRotationSettings")}</span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <span>{t("commonComponents.enableAutoRotation")}</span>
              <Tooltip title={t("commonComponents.enableAutoRotationTooltip")}>
                <InfoCircleOutlined className="text-gray-400 cursor-help text-xs" />
              </Tooltip>
            </label>
            <Switch
              checked={autoRotationEnabled}
              onChange={onAutoRotationChange}
              size="default"
              className={autoRotationEnabled ? "" : "bg-gray-400"}
            />
          </div>

          {autoRotationEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <span>{t("commonComponents.rotationInterval")}</span>
                <Tooltip title={t("commonComponents.rotationIntervalTooltip")}>
                  <InfoCircleOutlined className="text-gray-400 cursor-help text-xs" />
                </Tooltip>
              </label>
              <div className="space-y-2">
                <Select
                  value={showCustomInput ? "custom" : rotationInterval}
                  onChange={handleIntervalChange}
                  className="w-full"
                  placeholder={t("commonComponents.selectInterval")}
                >
                  <Option value="7d">{t("commonComponents.7days")}</Option>
                  <Option value="30d">{t("commonComponents.30days")}</Option>
                  <Option value="90d">{t("commonComponents.90days")}</Option>
                  <Option value="180d">{t("commonComponents.180days")}</Option>
                  <Option value="365d">{t("commonComponents.365days")}</Option>
                  <Option value="custom">{t("commonComponents.customInterval")}</Option>
                </Select>

                {showCustomInput && (
                  <div className="space-y-1">
                    <TextInput
                      value={customInterval}
                      onChange={handleCustomIntervalChange}
                      placeholder={t("commonComponents.customIntervalPlaceholder")}
                    />
                    <div className="text-xs text-gray-500">
                      {t("commonComponents.supportedFormats")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {autoRotationEnabled && (
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
            {t("commonComponents.rotationNotice")}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyLifecycleSettings;
