import React from "react";
import { useTranslation } from "react-i18next";
import { Typography, Select, Modal, Space, Button, Input } from "antd";

const { Text } = Typography;
const { Option } = Select;

interface KeywordModalProps {
  visible: boolean;
  keyword: string;
  action: "BLOCK" | "MASK";
  description: string;
  onKeywordChange: (keyword: string) => void;
  onActionChange: (action: "BLOCK" | "MASK") => void;
  onDescriptionChange: (description: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

const KeywordModal: React.FC<KeywordModalProps> = ({
  visible,
  keyword,
  action,
  description,
  onKeywordChange,
  onActionChange,
  onDescriptionChange,
  onAdd,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={t("guardrailsSub.addBlockedKeyword")}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <Text strong>{t("guardrailsSub.keyword")}</Text>
          <Input
            placeholder={t("guardrailsSub.enterSensitiveKeyword")}
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        <div>
          <Text strong>{t("guardrailsSub.action")}</Text>
          <Text type="secondary" style={{ display: "block", marginTop: 4, marginBottom: 8 }}>
            {t("guardrailsSub.chooseActionOnKeyword")}
          </Text>
          <Select
            value={action}
            onChange={onActionChange}
            style={{ width: "100%" }}
          >
            <Option value="BLOCK">{t("guardrailsSub.block")}</Option>
            <Option value="MASK">{t("guardrailsSub.mask")}</Option>
          </Select>
        </div>

        <div>
          <Text strong>{t("guardrailsSub.descriptionOptional")}</Text>
          <Input.TextArea
            placeholder={t("guardrailsSub.explainWhyKeywordSensitive")}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            style={{ marginTop: 8 }}
          />
        </div>
      </Space>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}>
        <Button onClick={onCancel}>
          {t("guardrailsSub.cancel")}
        </Button>
        <Button type="primary" onClick={onAdd}>
          {t("guardrailsSub.add")}
        </Button>
      </div>
    </Modal>
  );
};

export default KeywordModal;

