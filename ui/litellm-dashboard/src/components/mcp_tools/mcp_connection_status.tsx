import React, { useEffect } from "react";
import { Button, Spin, Alert, Collapse } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, ToolOutlined } from "@ant-design/icons";
import { Card, Title, Text } from "@tremor/react";
import { useTestMCPConnection } from "../../hooks/useTestMCPConnection";
import { useTranslation } from "react-i18next";

interface MCPConnectionStatusProps {
  accessToken: string | null;
  oauthAccessToken?: string | null;
  formValues: Record<string, any>;
  onToolsLoaded?: (tools: any[]) => void;
}

const MCPConnectionStatus: React.FC<MCPConnectionStatusProps> = ({ accessToken, oauthAccessToken, formValues, onToolsLoaded }) => {
  const { t } = useTranslation();
  const { tools, isLoadingTools, toolsError, toolsErrorStackTrace, canFetchTools, fetchTools } = useTestMCPConnection({
    accessToken,
    oauthAccessToken,
    formValues, 
    enabled: true, // Auto-fetch when required fields are available
  });

  // Notify parent component when tools change
  useEffect(() => {
    onToolsLoaded?.(tools);
  }, [tools, onToolsLoaded]);

  // Don't show anything if required fields aren't filled
  if (!canFetchTools && !formValues.url && !formValues.spec_path) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-blue-600" />
          <Title>{t("mcp.connectionStatus")}</Title>
        </div>

        {!canFetchTools && (formValues.url || formValues.spec_path) && (
          <div className="text-center py-6 text-gray-400 border rounded-lg border-dashed">
            <ToolOutlined className="text-2xl mb-2" />
            <Text>{t("mcp.completeFieldsToTest")}</Text>
            <br />
            <Text className="text-sm">{t("mcp.fillUrlTransportAuth")}</Text>
          </div>
        )}

        {canFetchTools && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Text className="text-gray-700 font-medium">
                  {isLoadingTools
                    ? t("mcp.testingConnection")
                    : tools.length > 0
                      ? t("mcp.connectionSuccessful")
                      : toolsError
                        ? t("mcp.connectionFailed")
                        : t("mcp.readyToTest")}
                </Text>
                <br />
                <Text className="text-gray-500 text-sm">Server: {formValues.url || formValues.spec_path}</Text>
              </div>

              {isLoadingTools && (
                <div className="flex items-center text-blue-600">
                  <Spin size="small" className="mr-2" />
                  <Text className="text-blue-600">{t("mcp.connecting")}</Text>
                </div>
              )}

              {!isLoadingTools && !toolsError && tools.length > 0 && (
                <div className="flex items-center text-green-600">
                  <CheckCircleOutlined className="mr-1" />
                  <Text className="text-green-600 font-medium">{t("mcp.connected")}</Text>
                </div>
              )}

              {toolsError && (
                <div className="flex items-center text-red-600">
                  <ExclamationCircleOutlined className="mr-1" />
                  <Text className="text-red-600 font-medium">{t("mcp.failed")}</Text>
                </div>
              )}
            </div>

            {isLoadingTools && (
              <div className="flex items-center justify-center py-6">
                <Spin size="large" />
                <Text className="ml-3">{t("mcp.testingConnectionLoading")}</Text>
              </div>
            )}

            {toolsError && (
              <Alert
                message={t("mcp.connectionFailed")}
                description={
                  <div>
                    <div>{toolsError}</div>
                    {toolsErrorStackTrace && (
                      <Collapse
                        items={[
                          {
                            key: "stack-trace",
                            label: t("mcp.stackTrace"),
                            children: (
                              <pre style={{ 
                                whiteSpace: "pre-wrap", 
                                wordBreak: "break-word",
                                fontSize: "12px",
                                fontFamily: "monospace",
                                margin: 0,
                                padding: "8px",
                                backgroundColor: "#f5f5f5",
                                borderRadius: "4px",
                                maxHeight: "400px",
                                overflow: "auto"
                              }}>
                                {toolsErrorStackTrace}
                              </pre>
                            ),
                          },
                        ]}
                        style={{ marginTop: "12px" }}
                      />
                    )}
                  </div>
                }
                type="error"
                showIcon
                action={
                  <Button icon={<ReloadOutlined />} onClick={fetchTools} size="small">
                    {t("mcp.retry")}
                  </Button>
                }
              />
            )}

            {!isLoadingTools && tools.length === 0 && !toolsError && (
              <div className="text-center py-6 text-gray-500 border rounded-lg border-dashed">
                <CheckCircleOutlined className="text-2xl mb-2 text-green-500" />
                <Text className="text-green-600 font-medium">{t("mcp.connectionSuccessful")}!</Text>
                <br />
                <Text className="text-gray-500">{t("mcp.noToolsFoundForServer")}</Text>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default MCPConnectionStatus;
