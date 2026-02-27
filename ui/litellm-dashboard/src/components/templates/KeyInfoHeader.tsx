import React from "react";
import { Button, Typography, Tooltip, Space, Divider, Flex } from "antd";
import {
  ArrowLeftOutlined,
  SyncOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import LabeledField from "../common_components/LabeledField";

const { Title, Text } = Typography;

export interface KeyInfoData {
  keyName: string;
  keyId: string;
  userId: string;
  userEmail: string;
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
  lastActive: string;
}

interface KeyInfoHeaderProps {
  data: KeyInfoData;
  onBack?: () => void;
  onCreateNew?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  canModifyKey?: boolean;
  backButtonText?: string;
  regenerateDisabled?: boolean;
  regenerateTooltip?: string;
}

export function KeyInfoHeader({
  data,
  onBack,
  onCreateNew,
  onRegenerate,
  onDelete,
  canModifyKey = true,
  backButtonText,
  regenerateDisabled = false,
  regenerateTooltip,
}: KeyInfoHeaderProps) {
  const { t } = useTranslation();
  return (
    <div>
      {onCreateNew && (
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew}>
            {t("keys.keyInfoHeader.createNewKey")}
          </Button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          {backButtonText}
        </Button>
      </div>

      <Flex justify="space-between" align="start" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} copyable={{ tooltips: [t("keys.copyKeyAlias"), t("common.copied")] }} style={{ margin: 0 }}>
            {data.keyName}
          </Title>
          <Text type="secondary" copyable={{ text: data.keyId, tooltips: [t("keys.copyKeyId"), t("common.copied")] }}>
            {t("keys.keyId")}: {data.keyId}
          </Text>
        </div>
        {canModifyKey && (
          <Space>
            <Tooltip title={regenerateTooltip || ""}>
              <span>
                <Button icon={<SyncOutlined />} onClick={onRegenerate} disabled={regenerateDisabled}>
                  {t("keys.keyInfoHeader.regenerateKey")}
                </Button>
              </span>
            </Tooltip>
            <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
              {t("keys.keyInfoHeader.deleteKey")}
            </Button>
          </Space>
        )}
      </Flex>

      <Flex align="stretch" gap={40} style={{ marginBottom: 40 }}>
        <Space direction="vertical" size={16}>
          <LabeledField label={t("keys.userEmail")} value={data.userEmail} icon={<MailOutlined />} />
          <LabeledField
            label={t("keys.userId")}
            value={data.userId}
            icon={<UserOutlined />}
            truncate
            copyable
            defaultUserIdCheck
          />
        </Space>

        <Divider type="vertical" style={{ height: "auto" }} />

        <Space direction="vertical" size={16}>
          <LabeledField label={t("keys.createdAt")} value={data.createdAt} icon={<CalendarOutlined />} />
          <LabeledField
            label={t("keys.createdBy")}
            value={data.createdBy}
            icon={<SafetyCertificateOutlined />}
            truncate
            copyable
            defaultUserIdCheck
          />
        </Space>

        <Divider type="vertical" style={{ height: "auto" }} />

        <Space direction="vertical" size={16}>
          <LabeledField label={t("keys.updatedAt")} value={data.lastUpdated} icon={<ClockCircleOutlined />} />
          <LabeledField label={t("keys.lastActive")} value={data.lastActive} icon={<ThunderboltOutlined />} />
        </Space>
      </Flex>
    </div>
  );
}
