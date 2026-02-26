import { useOrganizations } from "@/app/(dashboard)/hooks/organizations/useOrganizations";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  BlockOutlined,
  BookOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  KeyOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { ConfigProvider, Layout, Menu } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { all_admin_roles, internalUserRoles, isAdminRole, rolesWithWriteAccess } from "../utils/roles";
import NewBadge from "./common_components/NewBadge";
import type { Organization } from "./networking";
import UsageIndicator from "./UsageIndicator";
const { Sider } = Layout;

// Define the props type
interface SidebarProps {
  setPage: (page: string) => void;
  defaultSelectedKey: string;
  collapsed?: boolean;
  enabledPagesInternalUsers?: string[] | null;
}

// Menu item configuration
interface MenuItem {
  key: string;
  page: string;
  label: string | React.ReactNode;
  roles?: string[];
  children?: MenuItem[];
  icon?: React.ReactNode;
  external_url?: string;
}

// Group configuration
interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
  roles?: string[];
}

// Menu groups organized by category - factory function for i18n
const getMenuGroups = (t: (key: string) => string): MenuGroup[] => [
  {
    groupLabel: t("sidebar.aiGateway").toUpperCase(),
    items: [
      {
        key: "api-keys",
        page: "api-keys",
        label: t("sidebar.virtualKeys"),
        icon: <KeyOutlined />,
      },
      {
        key: "llm-playground",
        page: "llm-playground",
        label: t("sidebar.playground"),
        icon: <PlayCircleOutlined />,
        roles: rolesWithWriteAccess,
      },
      {
        key: "models",
        page: "models",
        label: t("sidebar.modelsEndpoints"),
        icon: <BlockOutlined />,
        roles: rolesWithWriteAccess,
      },
      {
        key: "agents",
        page: "agents",
        label: t("sidebar.agents"),
        icon: <RobotOutlined />,
        roles: rolesWithWriteAccess,
      },
      {
        key: "mcp-servers",
        page: "mcp-servers",
        label: t("sidebar.mcpServers"),
        icon: <ToolOutlined />,
      },
      {
        key: "guardrails",
        page: "guardrails",
        label: t("sidebar.guardrails"),
        icon: <SafetyOutlined />,
        roles: all_admin_roles,
      },
      {
        key: "policies",
        page: "policies",
        label: (
          <span className="flex items-center gap-4">
            {t("sidebar.policies")}
          </span>
        ),
        icon: <AuditOutlined />,
        roles: all_admin_roles,
      },
      {
        key: "tools",
        page: "tools",
        label: t("sidebar.searchTools"),
        icon: <ToolOutlined />,
        children: [
          {
            key: "search-tools",
            page: "search-tools",
            label: t("sidebar.searchTools"),
            icon: <SearchOutlined />,
          },
          {
            key: "vector-stores",
            page: "vector-stores",
            label: t("sidebar.vectorStores"),
            icon: <DatabaseOutlined />,
          },
          {
            key: "tool-policies",
            page: "tool-policies",
            label: t("sidebar.toolPolicies"),
            icon: <SafetyOutlined />,
          },
        ],
      },
    ],
  },
  {
    groupLabel: t("sidebar.observability").toUpperCase(),
    items: [
      {
        key: "new_usage",
        page: "new_usage",
        icon: <BarChartOutlined />,
        roles: [...all_admin_roles, ...internalUserRoles],
        label: t("sidebar.usage"),
      },
      {
        key: "logs",
        page: "logs",
        label: t("sidebar.logs"),
        icon: <LineChartOutlined />,
      },
      {
        key: "guardrails-monitor",
        page: "guardrails-monitor",
        label: t("sidebar.guardrailsMonitor"),
        icon: <SafetyOutlined />,
        roles: [...all_admin_roles, ...internalUserRoles],
      },
    ],
  },
  {
    groupLabel: t("sidebar.accessControl").toUpperCase(),
    items: [
      {
        key: "users",
        page: "users",
        label: t("sidebar.internalUsers"),
        icon: <UserOutlined />,
        roles: all_admin_roles,
      },
      {
        key: "teams",
        page: "teams",
        label: t("sidebar.teams"),
        icon: <TeamOutlined />,
      },
      {
        key: "organizations",
        page: "organizations",
        label: t("sidebar.organizations"),
        icon: <BankOutlined />,
        roles: all_admin_roles,
      },
      {
        key: "access-groups",
        page: "access-groups",
        label: (
          <span className="flex items-center gap-2">
            {t("sidebar.accessGroups")} <NewBadge />
          </span>
        ),
        icon: <BlockOutlined />,
        roles: all_admin_roles,
      },
      {
        key: "budgets",
        page: "budgets",
        label: t("sidebar.budgets"),
        icon: <CreditCardOutlined />,
        roles: all_admin_roles,
      },
    ],
  },
  {
    groupLabel: t("sidebar.apiReference").toUpperCase(),
    items: [
      {
        key: "api_ref",
        page: "api_ref",
        label: t("sidebar.apiReference"),
        icon: <ApiOutlined />,
      },
      {
        key: "model-hub-table",
        page: "model-hub-table",
        label: t("sidebar.modelHub"),
        icon: <AppstoreOutlined />,
      },
      {
        key: "learning-resources",
        page: "learning-resources",
        label: t("sidebar.learningResources"),
        icon: <BookOutlined />,
        external_url: "https://models.litellm.ai/cookbook",
      },
      {
        key: "experimental",
        page: "experimental",
        label: t("sidebar.experimental"),
        icon: <ExperimentOutlined />,
        children: [
          {
            key: "caching",
            page: "caching",
            label: t("sidebar.caching"),
            icon: <DatabaseOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "prompts",
            page: "prompts",
            label: t("sidebar.promptManagement"),
            icon: <FileTextOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "transform-request",
            page: "transform-request",
            label: t("sidebar.transformRequest"),
            icon: <ApiOutlined />,
            roles: [...all_admin_roles, ...internalUserRoles],
          },
          {
            key: "tag-management",
            page: "tag-management",
            label: t("sidebar.tagManagement"),
            icon: <TagsOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "claude-code-plugins",
            page: "claude-code-plugins",
            label: t("sidebar.claudeCodePlugins"),
            icon: <ToolOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "4",
            page: "usage",
            label: t("sidebar.oldUsage"),
            icon: <BarChartOutlined />,
          }
        ],
      },
    ],
  },
  {
    groupLabel: t("common.settings").toUpperCase(),
    roles: all_admin_roles,
    items: [
      {
        key: "settings",
        page: "settings",
        label: <span className="flex items-center gap-4">{t("common.settings")}</span>,
        icon: <SettingOutlined />,
        roles: all_admin_roles,
        children: [
          {
            key: "router-settings",
            page: "router-settings",
            label: t("sidebar.routerSettings"),
            icon: <SettingOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "logging-and-alerts",
            page: "logging-and-alerts",
            label: t("sidebar.loggingAlerts"),
            icon: <SettingOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "admin-panel",
            page: "admin-panel",
            label: t("sidebar.adminPanel"),
            icon: <SettingOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "cost-tracking",
            page: "cost-tracking",
            label: t("sidebar.costTracking"),
            icon: <BarChartOutlined />,
            roles: all_admin_roles,
          },
          {
            key: "ui-theme",
            page: "ui-theme",
            label: t("sidebar.uiTheme"),
            icon: <BgColorsOutlined />,
            roles: all_admin_roles,
          },
        ],
      },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ setPage, defaultSelectedKey, collapsed = false, enabledPagesInternalUsers }) => {
  const { userId, accessToken, userRole } = useAuthorized();
  const { data: organizations } = useOrganizations();
  const { t } = useTranslation();
  const menuGroups = useMemo(() => getMenuGroups(t), [t]);

  // Check if user is an org_admin
  const isOrgAdmin = useMemo(() => {
    if (!userId || !organizations) return false;
    return organizations.some((org: Organization) =>
      org.members?.some((member) => member.user_id === userId && member.user_role === "org_admin"),
    );
  }, [userId, organizations]);

  // Navigate to page helper
  const navigateToPage = (page: string) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.set("page", page);
    window.history.pushState(null, "", `?${newSearchParams.toString()}`);
    setPage(page);
  };

  // Filter items based on user role and enabled pages for internal users
  const filterItemsByRole = (items: MenuItem[]): MenuItem[] => {
    const isAdmin = isAdminRole(userRole);

    // Debug logging
    if (enabledPagesInternalUsers !== null && enabledPagesInternalUsers !== undefined) {
      console.log("[LeftNav] Filtering with enabled pages:", {
        userRole,
        isAdmin,
        enabledPagesInternalUsers,
      });
    }

    return items
      .map((item) => ({
        ...item,
        children: item.children ? filterItemsByRole(item.children) : undefined,
      }))
      .filter((item) => {
        // Special handling for organizations menu item - allow org_admins
        if (item.key === "organizations") {
          const hasRoleAccess = !item.roles || item.roles.includes(userRole) || isOrgAdmin;
          if (!hasRoleAccess) return false;

          // Check enabled pages for internal users (non-admins)
          if (!isAdmin && enabledPagesInternalUsers !== null && enabledPagesInternalUsers !== undefined) {
            const isIncluded = enabledPagesInternalUsers.includes(item.page);
            console.log(`[LeftNav] Page "${item.page}" (${item.key}): ${isIncluded ? "VISIBLE" : "HIDDEN"}`);
            return isIncluded;
          }
          return true;
        }

        // Existing role check
        if (item.roles && !item.roles.includes(userRole)) return false;

        // Check enabled pages for internal users (non-admins)
        if (!isAdmin && enabledPagesInternalUsers !== null && enabledPagesInternalUsers !== undefined) {
          // If item has children, check if any children are visible
          if (item.children && item.children.length > 0) {
            const hasVisibleChildren = item.children.some((child) =>
              enabledPagesInternalUsers.includes(child.page)
            );
            if (hasVisibleChildren) {
              console.log(`[LeftNav] Parent "${item.page}" (${item.key}): VISIBLE (has visible children)`);
              return true;
            }
          }

          const isIncluded = enabledPagesInternalUsers.includes(item.page);
          console.log(`[LeftNav] Page "${item.page}" (${item.key}): ${isIncluded ? "VISIBLE" : "HIDDEN"}`);
          return isIncluded;
        }

        return true;
      });
  };

  // Build menu items with groups
  const buildMenuItems = (): MenuProps["items"] => {
    const items: MenuProps["items"] = [];

    menuGroups.forEach((group) => {
      // Check if group has role restriction
      if (group.roles && !group.roles.includes(userRole)) {
        return;
      }

      const filteredItems = filterItemsByRole(group.items);
      if (filteredItems.length === 0) return;

      // Add group with items
      items.push({
        type: "group",
        label: collapsed ? null : (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "#6b7280",
              letterSpacing: "0.05em",
              padding: "12px 0 4px 12px",
              display: "block",
              marginBottom: "2px",
            }}
          >
            {group.groupLabel}
          </span>
        ),
        children: filteredItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          children: item.children?.map((child) => ({
            key: child.key,
            icon: child.icon,
            label: child.label,
            onClick: () => {
              if (child.external_url) {
                window.open(child.external_url, "_blank");
              } else {
                navigateToPage(child.page);
              }
            },
          })),
          onClick: !item.children
            ? () => {
              if (item.external_url) {
                window.open(item.external_url, "_blank");
              } else {
                navigateToPage(item.page);
              }
            }
            : undefined,
        })),
      });
    });

    return items;
  };

  // Find selected menu key
  const findMenuItemKey = (page: string): string => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (item.page === page) return item.key;
        if (item.children) {
          const child = item.children.find((c) => c.page === page);
          if (child) return child.key;
        }
      }
    }
    return "api-keys";
  };

  const selectedMenuKey = findMenuItemKey(defaultSelectedKey);

  return (
    <Layout>
      <Sider
        theme="light"
        width={220}
        collapsed={collapsed}
        collapsedWidth={80}
        collapsible
        trigger={null}
        style={{
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
        }}
      >
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                iconSize: 15,
                fontSize: 13,
                itemMarginInline: 4,
                itemPaddingInline: 8,
                itemHeight: 30,
                itemBorderRadius: 6,
                subMenuItemBorderRadius: 6,
                groupTitleFontSize: 10,
                groupTitleLineHeight: 1.5,
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedMenuKey]}
            defaultOpenKeys={[]}
            inlineCollapsed={collapsed}
            className="custom-sidebar-menu"
            style={{
              borderRight: 0,
              backgroundColor: "transparent",
              fontSize: "13px",
              paddingTop: "4px",
            }}
            items={buildMenuItems()}
          />
        </ConfigProvider>
        {isAdminRole(userRole) && !collapsed && <UsageIndicator accessToken={accessToken} width={220} />}
      </Sider>
    </Layout>
  );
};

export default Sidebar;

// Also export getMenuGroups for advanced use cases
export { getMenuGroups };
