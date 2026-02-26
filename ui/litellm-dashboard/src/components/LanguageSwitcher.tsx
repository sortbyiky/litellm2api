"use client";

import { useTranslation } from "react-i18next";
import { GlobalOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const items: MenuProps["items"] = [
    {
      key: "en",
      label: t("langSwitch.en"),
    },
    {
      key: "zh",
      label: t("langSwitch.zh"),
    },
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    i18n.changeLanguage(key);
  };

  return (
    <Dropdown menu={{ items, onClick, selectedKeys: [i18n.language?.startsWith("zh") ? "zh" : "en"] }} trigger={["click"]}>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-none bg-transparent"
        style={{ fontSize: 14 }}
      >
        <GlobalOutlined />
        <span>{i18n.language?.startsWith("zh") ? "中文" : "EN"}</span>
      </button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
