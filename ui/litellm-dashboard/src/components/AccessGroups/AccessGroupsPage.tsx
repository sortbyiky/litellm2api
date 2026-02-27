import {
  AccessGroupResponse,
  useAccessGroups,
} from "@/app/(dashboard)/hooks/accessGroups/useAccessGroups";
import { useDeleteAccessGroup } from "@/app/(dashboard)/hooks/accessGroups/useDeleteAccessGroup";
import { PlusOutlined } from "@ant-design/icons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Button,
  Card,
  Flex,
  Input,
  Layout,
  Pagination,
  Space,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from "antd";
import {
  BotIcon,
  LayersIcon,
  SearchIcon,
  ServerIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DeleteResourceModal from "../common_components/DeleteResourceModal";
import TableIconActionButton from "../common_components/IconActionButton/TableIconActionButtons/TableIconActionButton";
import {
  SortState,
  TableHeaderSortDropdown,
} from "../common_components/TableHeaderSortDropdown/TableHeaderSortDropdown";
import { AccessGroupDetail } from "./AccessGroupsDetailsPage";
import { AccessGroupCreateModal } from "./AccessGroupsModal/AccessGroupCreateModal";
import { AccessGroup } from "./types";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    responsive?: string[];
  }
}

const { Title, Text } = Typography;
const { Content } = Layout;

function mapResponseToAccessGroup(r: AccessGroupResponse): AccessGroup {
  return {
    id: r.access_group_id,
    name: r.access_group_name,
    description: r.description ?? "",
    modelIds: r.access_model_names,
    mcpServerIds: r.access_mcp_server_ids,
    agentIds: r.access_agent_ids,
    keyIds: r.assigned_key_ids,
    teamIds: r.assigned_team_ids,
    createdAt: r.created_at,
    createdBy: r.created_by ?? "",
    updatedAt: r.updated_at,
    updatedBy: r.updated_by ?? "",
  };
}
function buildAntdColumns(
  table: ReturnType<typeof useReactTable<AccessGroup>>,
  rowLookup: Map<string, Row<AccessGroup>>,
  onSortingChange: (s: SortingState) => void,
) {
  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  return headers.map((header) => {
    const canSort = header.column.getCanSort();
    const isSorted = header.column.getIsSorted();
    const meta = header.column.columnDef.meta as
      | { responsive?: string[] }
      | undefined;

    const col: Record<string, unknown> = {
      title: (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
          {canSort && (
            <TableHeaderSortDropdown
              sortState={isSorted === false ? false : (isSorted as SortState)}
              onSortChange={(newState) => {
                if (newState === false) {
                  onSortingChange([]);
                } else {
                  onSortingChange([
                    { id: header.column.id, desc: newState === "desc" },
                  ]);
                }
              }}
              columnId={header.column.id}
            />
          )}
        </div>
      ),
      key: header.id,
      width: header.column.columnDef.size,
      render: (_: unknown, record: AccessGroup) => {
        const row = rowLookup.get(record.id);
        if (!row) return null;
        const cell = row
          .getVisibleCells()
          .find((c) => c.column.id === header.id);
        if (!cell) return null;
        return flexRender(cell.column.columnDef.cell, cell.getContext());
      },
    };

    if (meta?.responsive) {
      col.responsive = meta.responsive;
    }

    return col;
  });
}

export function AccessGroupsPage() {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const { data: groupsData, isLoading } = useAccessGroups();
  const groups = useMemo(
    () => (groupsData ?? []).map(mapResponseToAccessGroup),
    [groupsData],
  );

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [groupToDelete, setGroupToDelete] = useState<AccessGroup | null>(null);
  const deleteMutation = useDeleteAccessGroup();
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // ---------- filtered data ----------
  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          group.name.toLowerCase().includes(searchText.toLowerCase()) ||
          group.id.toLowerCase().includes(searchText.toLowerCase()) ||
          group.description.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [groups, searchText],
  );

  // ---------- TanStack column definitions ----------
  const columnDefs = useMemo<ColumnDef<AccessGroup>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: () => <span>ID</span>,
        enableSorting: false,
        size: 170,
        cell: ({ row }) => {
          const record = row.original;
          return (
            <Tooltip title={record.id}>
              <Text
                ellipsis
                className="text-blue-500 bg-blue-50 hover:bg-blue-100 text-xs cursor-pointer"
                style={{ fontSize: 14, padding: "1px 8px" }}
                onClick={() => setSelectedGroupId(record.id)}
              >
                {record.id}
              </Text>
            </Tooltip>
          );
        },
      },
      {
        id: "name",
        accessorKey: "name",
        header: () => <span>{t("accessGroups.name")}</span>,
        enableSorting: true,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        id: "resources",
        header: () => <span>{t("accessGroups.resources")}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const record = row.original;
          const modelIds = record.modelIds ?? [];
          const mcpServerIds = record.mcpServerIds ?? [];
          const agentIds = record.agentIds ?? [];
          return (
            <Flex gap={12} align="center">
              <Tooltip title={t("accessGroups.modelsCount", { count: modelIds?.length })}>
                <Tag color="blue" style={{ fontSize: 14, padding: "2px 8px", margin: 0 }}>
                  <Flex align="center" gap={6}>
                    <LayersIcon size={14} />
                    {modelIds?.length}
                  </Flex>
                </Tag>
              </Tooltip>
              <Tooltip title={t("accessGroups.mcpServersCount", { count: mcpServerIds?.length })}>
                <Tag color="cyan" style={{ fontSize: 14, padding: "2px 8px", margin: 0 }}>
                  <Flex align="center" gap={6}>
                    <ServerIcon size={14} />
                    {mcpServerIds?.length}
                  </Flex>
                </Tag>
              </Tooltip>
              <Tooltip title={t("accessGroups.agentsCount", { count: agentIds?.length })}>
                <Tag color="purple" style={{ fontSize: 14, padding: "2px 8px", margin: 0 }}>
                  <Flex align="center" gap={6}>
                    <BotIcon size={14} />
                    {agentIds?.length}
                  </Flex>
                </Tag>
              </Tooltip>
            </Flex>
          );
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: () => <span>{t("accessGroups.created")}</span>,
        enableSorting: true,
        sortingFn: "datetime",
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleDateString(),
        meta: { responsive: ["lg"] },
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: () => <span>{t("accessGroups.updated")}</span>,
        enableSorting: false,
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleDateString(),
        meta: { responsive: ["xl"] },
      },
      {
        id: "actions",
        header: () => <span>{t("accessGroups.actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <Space>
            <TableIconActionButton
              variant="Delete"
              tooltipText={t("accessGroups.deleteAccessGroup")}
              onClick={() => setGroupToDelete(row.original)}
            />
          </Space>
        ),
      },
    ],
    // setSelectedGroup is stable (useState setter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  // ---------- TanStack table instance ----------
  const table = useReactTable<AccessGroup>({
    data: filteredGroups,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  // All sorted rows from TanStack
  const sortedRows = table.getRowModel().rows;

  // Paginated slice
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Map for O(1) lookup by record id in antd render()
  const rowLookup = useMemo(
    () => new Map(paginatedRows.map((row) => [row.original.id, row])),
    [paginatedRows],
  );

  // Convert TanStack headers → antd columns
  const antdColumns = buildAntdColumns(table, rowLookup, setSorting);

  // antd dataSource (just the originals for the current page)
  const dataSource = paginatedRows.map((row) => row.original);

  if (selectedGroupId) {
    return (
      <AccessGroupDetail
        accessGroupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  return (
    <Content
      style={{ padding: token.paddingLG, paddingInline: token.paddingLG * 2 }}
    >
      <Flex
        justify="space-between"
        align="center"
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>
            {t("accessGroups.title")}
          </Title>
          <Text type="secondary">
            {t("accessGroups.subtitle")}
          </Text>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          {t("accessGroups.createAccessGroup")}
        </Button>
      </Flex>

      <Card styles={{ body: { padding: 0 } }}>
        <Flex
          justify="space-between"
          align="center"
          style={{
            padding: "12px 16px",
          }}
        >
          <Input
            prefix={<SearchIcon size={16} />}
            placeholder={t("accessGroups.searchPlaceholder")}
            style={{ maxWidth: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Pagination
            current={currentPage}
            total={sortedRows?.length}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
            size="small"
            showTotal={(total) => t("accessGroups.totalGroups", { total })}
            showSizeChanger={false}
          />
        </Flex>
        <Table
          columns={antdColumns}
          dataSource={dataSource}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      <AccessGroupCreateModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
      />

      <DeleteResourceModal
        isOpen={!!groupToDelete}
        title={t("accessGroups.deleteAccessGroup")}
        message={t("accessGroups.deleteConfirmMessage")}
        resourceInformationTitle={t("accessGroups.accessGroupInformation")}
        resourceInformation={[
          { label: t("accessGroups.id"), value: groupToDelete?.id, code: true },
          { label: t("accessGroups.name"), value: groupToDelete?.name },
          { label: t("accessGroups.description"), value: groupToDelete?.description || "—" },
        ]}
        onCancel={() => setGroupToDelete(null)}
        onOk={() => {
          if (!groupToDelete) return;
          deleteMutation.mutate(groupToDelete.id, {
            onSuccess: () => {
              setGroupToDelete(null);
            },
          });
        }}
        confirmLoading={deleteMutation.isPending}
      />
    </Content>
  );
}
