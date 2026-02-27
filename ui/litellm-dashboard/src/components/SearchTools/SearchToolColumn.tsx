import { Tag } from "antd";
import { ColumnsType } from "antd/es/table";
import { TFunction } from "react-i18next";
import TableIconActionButton from "../common_components/IconActionButton/TableIconActionButtons/TableIconActionButton";
import { SearchTool } from "./types";

export const searchToolColumns = (
  onView: (searchToolId: string) => void,
  onEdit: (searchToolId: string) => void,
  onDelete: (searchToolId: string) => void,
  availableProviders: Array<{ provider_name: string; ui_friendly_name: string }>,
  t: TFunction,
): ColumnsType<SearchTool> => [
    {
      title: t("searchTools.searchToolId"),
      dataIndex: "search_tool_id",
      key: "search_tool_id",
      render: (_, tool) => {
        const isFromConfig = tool.is_from_config;

        if (isFromConfig) {
          return <span className="text-xs">-</span>;
        }

        return (
          <button
            onClick={() => onView(tool.search_tool_id!)}
            className="font-mono text-blue-500 bg-blue-50 hover:bg-blue-100 text-xs font-normal px-2 py-0.5 text-left cursor-pointer max-w-40"
          >
            <span className="truncate block">{tool.search_tool_id}</span>
          </button>
        );
      },
    },
    {
      title: t("common.name"),
      dataIndex: "search_tool_name",
      key: "search_tool_name",
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: t("searchTools.provider"),
      key: "provider",
      render: (_, tool) => {
        const provider = tool.litellm_params.search_provider;
        const providerInfo = availableProviders.find((p) => p.provider_name === provider);
        const displayName = providerInfo?.ui_friendly_name || provider;

        return <span className="text-sm">{displayName}</span>;
      },
    },
    {
      title: t("searchTools.createdAt"),
      dataIndex: "created_at",
      key: "created_at",
      render: (_, tool) => {
        return <span className="text-xs">{tool.created_at ? new Date(tool.created_at).toLocaleDateString() : "-"}</span>;
      },
    },
    {
      title: t("searchTools.updatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      render: (_, tool) => {
        return <span className="text-xs">{tool.updated_at ? new Date(tool.updated_at).toLocaleDateString() : "-"}</span>;
      },
    },
    {
      title: t("searchTools.source"),
      key: "source",
      render: (_, tool) => {
        const isFromConfig = tool.is_from_config ?? false;

        return (
          <Tag color={isFromConfig ? "default" : "blue"}>
            {isFromConfig ? t("searchTools.config") : t("searchTools.db")}
          </Tag>
        );
      },
    },
    {
      title: t("common.actions"),
      key: "actions",
      render: (_, tool) => {
        const toolId = tool.search_tool_id;
        const isFromConfig = tool.is_from_config ?? false;

        return (
          <div className="flex items-center gap-2">
            <TableIconActionButton
              variant="Edit"
              tooltipText={t("searchTools.editSearchTool")}
              disabled={isFromConfig}
              disabledTooltipText={t("searchTools.configCannotEdit")}
              onClick={() => {
                if (toolId && !isFromConfig) {
                  onEdit(toolId);
                }
              }}
            />
            <TableIconActionButton
              variant="Delete"
              tooltipText={t("searchTools.deleteSearchTool")}
              disabled={isFromConfig}
              disabledTooltipText={t("searchTools.configCannotDelete")}
              onClick={() => {
                if (toolId && !isFromConfig) {
                  onDelete(toolId);
                }
              }}
            />
          </div>
        );
      },
    },
  ];
