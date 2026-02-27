import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Form, Input, Select, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { fetchAvailableModels, ModelGroup } from "../playground/llm_calls/fetch_models";

interface S3VectorsConfigProps {
  accessToken: string | null;
  providerParams: Record<string, any>;
  onParamsChange: (params: Record<string, any>) => void;
}

const S3VectorsConfig: React.FC<S3VectorsConfigProps> = ({
  accessToken,
  providerParams,
  onParamsChange,
}) => {
  const { t } = useTranslation();
  const [embeddingModels, setEmbeddingModels] = useState<ModelGroup[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await fetchAvailableModels(accessToken);
        // Filter for embedding models only
        const embeddingOnly = models.filter((model) => model.mode === "embedding");
        setEmbeddingModels(embeddingOnly);
      } catch (error) {
        console.error("Error fetching embedding models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [accessToken]);

  const handleFieldChange = (fieldName: string, value: string) => {
    onParamsChange({
      ...providerParams,
      [fieldName]: value,
    });
  };

  return (
    <>
      {/* S3 Vectors Setup Instructions */}
      <Alert
        message={t("vectorStores.awsS3VectorsSetup")}
        description={
          <div>
            <p>{t("vectorStores.s3VectorsDescription")}</p>
            <ul style={{ marginLeft: "16px", marginTop: "8px" }}>
              <li>{t("vectorStores.s3AutoCreate")}</li>
              <li>{t("vectorStores.s3AutoDetect")}</li>
              <li>{t("vectorStores.s3Permissions")}</li>
              <li>
                  {t("vectorStores.learnMore")}:{" "}
                <a
                  href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vector-buckets.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("vectorStores.awsS3VectorsDocs")}
                </a>
              </li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: "16px" }}
      />

      {/* Vector Bucket Name */}
      <Form.Item
        label={
          <span>
            Vector Bucket Name{" "}
            <Tooltip title={t("vectorStores.vectorBucketNameTooltip")}>
              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
            </Tooltip>
          </span>
        }
        required
        validateStatus={
          providerParams.vector_bucket_name && providerParams.vector_bucket_name.length < 3
            ? "error"
            : undefined
        }
        help={
          providerParams.vector_bucket_name && providerParams.vector_bucket_name.length < 3
            ? t("vectorStores.bucketNameMinChars")
            : undefined
        }
      >
        <Input
          value={providerParams.vector_bucket_name || ""}
          onChange={(e) => handleFieldChange("vector_bucket_name", e.target.value)}
          placeholder={t("vectorStores.vectorBucketPlaceholder")}
          size="large"
          className="rounded-md"
        />
      </Form.Item>

      {/* Index Name (Optional) */}
      <Form.Item
        label={
          <span>
            Index Name{" "}
            <Tooltip title={t("vectorStores.indexNameTooltip")}>
              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
            </Tooltip>
          </span>
        }
        validateStatus={
          providerParams.index_name && providerParams.index_name.length > 0 && providerParams.index_name.length < 3
            ? "error"
            : undefined
        }
        help={
          providerParams.index_name && providerParams.index_name.length > 0 && providerParams.index_name.length < 3
            ? t("vectorStores.indexNameMinChars")
            : undefined
        }
      >
        <Input
          value={providerParams.index_name || ""}
          onChange={(e) => handleFieldChange("index_name", e.target.value)}
          placeholder={t("vectorStores.indexNamePlaceholder")}
          size="large"
          className="rounded-md"
        />
      </Form.Item>

      {/* AWS Region */}
      <Form.Item
        label={
          <span>
            AWS Region{" "}
            <Tooltip title={t("vectorStores.awsRegionTooltip")}>
              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
            </Tooltip>
          </span>
        }
        required
      >
        <Input
          value={providerParams.aws_region_name || ""}
          onChange={(e) => handleFieldChange("aws_region_name", e.target.value)}
          placeholder="us-west-2"
          size="large"
          className="rounded-md"
        />
      </Form.Item>

      {/* Embedding Model */}
      <Form.Item
        label={
          <span>
            Embedding Model{" "}
            <Tooltip title={t("vectorStores.embeddingModelTooltip")}>
              <InfoCircleOutlined style={{ marginLeft: "4px" }} />
            </Tooltip>
          </span>
        }
        required
      >
        <Select
          value={providerParams.embedding_model || undefined}
          onChange={(value) => handleFieldChange("embedding_model", value)}
          placeholder={t("vectorStores.selectEmbeddingModel")}
          size="large"
          showSearch
          loading={isLoadingModels}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          options={embeddingModels.map((model) => ({
            value: model.model_group,
            label: model.model_group,
          }))}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </>
  );
};

export default S3VectorsConfig;
