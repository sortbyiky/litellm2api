import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Form, Input, Select, message } from "antd";
import { Button } from "@tremor/react";
import { registerClaudeCodePlugin } from "../networking";
import {
  validatePluginName,
  isValidSemanticVersion,
  isValidEmail,
  isValidUrl,
  parseKeywords,
} from "./helpers";

const { TextArea } = Input;
const { Option } = Select;

interface AddPluginFormProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSuccess: () => void;
}

const PREDEFINED_CATEGORIES = [
  "Development",
  "Productivity",
  "Learning",
  "Security",
  "Data & Analytics",
  "Integration",
  "Testing",
  "Documentation",
];

const AddPluginForm: React.FC<AddPluginFormProps> = ({
  visible,
  onClose,
  accessToken,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceType, setSourceType] = useState<"github" | "url">("github");

  const handleSubmit = async (values: any) => {
    if (!accessToken) {
      message.error(t("claudeCode.noAccessToken"));
      return;
    }

    if (!validatePluginName(values.name)) {
      message.error(t("claudeCode.pluginNameKebabCase"));
      return;
    }

    if (values.version && !isValidSemanticVersion(values.version)) {
      message.error(t("claudeCode.versionSemantic"));
      return;
    }

    if (values.authorEmail && !isValidEmail(values.authorEmail)) {
      message.error(t("claudeCode.invalidEmail"));
      return;
    }

    if (values.homepage && !isValidUrl(values.homepage)) {
      message.error(t("claudeCode.invalidHomepageUrl"));
      return;
    }

    setIsSubmitting(true);
    try {
      // Build plugin data
      const pluginData: any = {
        name: values.name.trim(),
        source:
          sourceType === "github"
            ? {
                source: "github",
                repo: values.repo.trim(),
              }
            : {
                source: "url",
                url: values.url.trim(),
              },
      };

      // Add optional fields
      if (values.version) {
        pluginData.version = values.version.trim();
      }
      if (values.description) {
        pluginData.description = values.description.trim();
      }
      if (values.authorName || values.authorEmail) {
        pluginData.author = {};
        if (values.authorName) {
          pluginData.author.name = values.authorName.trim();
        }
        if (values.authorEmail) {
          pluginData.author.email = values.authorEmail.trim();
        }
      }
      if (values.homepage) {
        pluginData.homepage = values.homepage.trim();
      }
      if (values.category) {
        pluginData.category = values.category;
      }
      if (values.keywords) {
        pluginData.keywords = parseKeywords(values.keywords);
      }

      await registerClaudeCodePlugin(accessToken, pluginData);
      message.success(t("claudeCode.pluginRegisteredSuccess"));
      form.resetFields();
      setSourceType("github");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error registering plugin:", error);
      message.error(t("claudeCode.failedRegisterPlugin"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSourceType("github");
    onClose();
  };

  const handleSourceTypeChange = (value: "github" | "url") => {
    setSourceType(value);
    // Clear repo/url fields when switching
    form.setFieldsValue({ repo: undefined, url: undefined });
  };

  return (
    <Modal
      title={t("claudeCode.addNewPlugin")}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      className="top-8"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        {/* Plugin Name */}
        <Form.Item
          label={t("claudeCode.pluginName")}
          name="name"
          rules={[
            { required: true, message: t("claudeCode.pleaseEnterPluginName") },
            {
              pattern: /^[a-z0-9-]+$/,
              message: t("claudeCode.nameKebabCaseRule"),
            },
          ]}
          tooltip={t("claudeCode.pluginNameTooltip")}
        >
          <Input placeholder="my-awesome-plugin" className="rounded-lg" />
        </Form.Item>

        {/* Source Type */}
        <Form.Item
          label={t("claudeCode.sourceType")}
          name="sourceType"
          initialValue="github"
          rules={[{ required: true, message: t("claudeCode.pleaseSelectSourceType") }]}
        >
          <Select onChange={handleSourceTypeChange} className="rounded-lg">
            <Option value="github">GitHub</Option>
            <Option value="url">URL</Option>
          </Select>
        </Form.Item>

        {/* GitHub Repository */}
        {sourceType === "github" && (
          <Form.Item
            label={t("claudeCode.githubRepository")}
            name="repo"
            rules={[
              { required: true, message: t("claudeCode.pleaseEnterRepository") },
              {
                pattern: /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
                message: t("claudeCode.repoFormatRule"),
              },
            ]}
            tooltip={t("claudeCode.repoTooltip")}
          >
            <Input placeholder="anthropics/claude-code" className="rounded-lg" />
          </Form.Item>
        )}

        {/* Git URL */}
        {sourceType === "url" && (
          <Form.Item
            label={t("claudeCode.gitUrl")}
            name="url"
            rules={[{ required: true, message: t("claudeCode.pleaseEnterGitUrl") }]}
            tooltip={t("claudeCode.gitUrlTooltip")}
          >
            <Input
              type="url"
              placeholder="https://github.com/org/repo.git"
              className="rounded-lg"
            />
          </Form.Item>
        )}

        {/* Version */}
        <Form.Item
          label={t("claudeCode.versionOptional")}
          name="version"
          tooltip={t("claudeCode.versionTooltip")}
        >
          <Input placeholder="1.0.0" className="rounded-lg" />
        </Form.Item>

        <Form.Item
          label={t("claudeCode.descriptionOptional")}
          name="description"
          tooltip={t("claudeCode.descriptionTooltip")}
        >
          <TextArea
            rows={3}
            placeholder={t("claudeCode.descriptionPlaceholder")}
            maxLength={500}
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item
          label={t("claudeCode.categoryOptional")}
          name="category"
          tooltip={t("claudeCode.categoryTooltip")}
        >
          <Select
            placeholder={t("claudeCode.categoryPlaceholder")}
            allowClear
            showSearch
            optionFilterProp="children"
            className="rounded-lg"
          >
            {PREDEFINED_CATEGORIES.map((cat) => (
              <Option key={cat} value={cat}>
                {cat}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Keywords */}
        <Form.Item
          label={t("claudeCode.keywordsOptional")}
          name="keywords"
          tooltip={t("claudeCode.keywordsTooltip")}
        >
          <Input placeholder="search, web, api" className="rounded-lg" />
        </Form.Item>

        {/* Author Name */}
        <Form.Item
          label={t("claudeCode.authorNameOptional")}
          name="authorName"
          tooltip={t("claudeCode.authorNameTooltip")}
        >
          <Input placeholder="Your Name or Organization" className="rounded-lg" />
        </Form.Item>

        {/* Author Email */}
        <Form.Item
          label={t("claudeCode.authorEmailOptional")}
          name="authorEmail"
          rules={[{ type: "email", message: t("claudeCode.pleaseEnterValidEmail") }]}
          tooltip={t("claudeCode.authorEmailTooltip")}
        >
          <Input type="email" placeholder="author@example.com" className="rounded-lg" />
        </Form.Item>

        {/* Homepage */}
        <Form.Item
          label={t("claudeCode.homepageOptional")}
          name="homepage"
          rules={[{ type: "url", message: t("claudeCode.pleaseEnterValidUrl") }]}
          tooltip={t("claudeCode.homepageTooltip")}
        >
          <Input type="url" placeholder="https://example.com" className="rounded-lg" />
        </Form.Item>

        {/* Submit Buttons */}
        <Form.Item className="mb-0 mt-6">
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? t("claudeCode.registering") : t("claudeCode.registerPlugin")}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPluginForm;
