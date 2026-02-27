import React from "react";
import { useTranslation } from "react-i18next";
import { Form, Switch, Select, Typography } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import NumericalInput from "../shared/numerical_input";

const { Text } = Typography;

interface CacheControlInjectionPoint {
  location: "message";
  role?: "user" | "system" | "assistant";
  index?: number;
}

interface CacheControlSettingsProps {
  form: any; // Form instance from parent
  showCacheControl: boolean;
  onCacheControlChange: (checked: boolean) => void;
}

const CacheControlSettings: React.FC<CacheControlSettingsProps> = ({
  form,
  showCacheControl,
  onCacheControlChange,
}) => {
  const { t } = useTranslation();
  const updateCacheControlPoints = (injectionPoints: CacheControlInjectionPoint[]) => {
    const currentParams = form.getFieldValue("litellm_extra_params");
    try {
      let paramsObj = currentParams ? JSON.parse(currentParams) : {};
      if (injectionPoints.length > 0) {
        paramsObj.cache_control_injection_points = injectionPoints;
      } else {
        delete paramsObj.cache_control_injection_points;
      }
      if (Object.keys(paramsObj).length > 0) {
        form.setFieldValue("litellm_extra_params", JSON.stringify(paramsObj, null, 2));
      } else {
        form.setFieldValue("litellm_extra_params", "");
      }
    } catch (error) {
      console.error("Error updating cache control points:", error);
    }
  };

  return (
    <>
      <Form.Item
        label={t("addModel.cacheControlInjectionPoints")}
        name="cache_control"
        valuePropName="checked"
        className="mb-4"
        tooltip={t("addModel.cacheControlTooltip")}
      >
        <Switch onChange={onCacheControlChange} className="bg-gray-600" />
      </Form.Item>

      {showCacheControl && (
        <div className="ml-6 pl-4 border-l-2 border-gray-200">
          <Text className="text-sm text-gray-500 block mb-4">
            {t("addModel.cacheControlDescription")}
          </Text>

          <Form.List name="cache_control_injection_points" initialValue={[{ location: "message" }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} className="flex items-center mb-4 gap-4">
                    <Form.Item
                      {...field}
                      label={t("addModel.type")}
                      name={[field.name, "location"]}
                      initialValue="message"
                      className="mb-0"
                      style={{ width: "180px" }}
                    >
                      <Select disabled options={[{ value: "message", label: t("addModel.message") }]} />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      label={t("addModel.role")}
                      name={[field.name, "role"]}
                      className="mb-0"
                      style={{ width: "180px" }}
                      tooltip={t("addModel.roleTooltip")}
                    >
                      <Select
                        placeholder={t("addModel.selectRole")}
                        allowClear
                        options={[
                          { value: "user", label: t("addModel.user") },
                          { value: "system", label: t("addModel.system") },
                          { value: "assistant", label: t("addModel.assistant") },
                        ]}
                        onChange={() => {
                          const values = form.getFieldValue("cache_control_points");
                          updateCacheControlPoints(values);
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      label={t("addModel.index")}
                      name={[field.name, "index"]}
                      className="mb-0"
                      style={{ width: "180px" }}
                      tooltip={t("addModel.indexTooltip")}
                    >
                      <NumericalInput
                        type="number"
                        placeholder={t("addModel.optional")}
                        step={1}
                        onChange={() => {
                          const values = form.getFieldValue("cache_control_points");
                          updateCacheControlPoints(values);
                        }}
                      />
                    </Form.Item>

                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        className="text-red-500 cursor-pointer text-lg ml-12"
                        onClick={() => {
                          remove(field.name);
                          setTimeout(() => {
                            const values = form.getFieldValue("cache_control_points");
                            updateCacheControlPoints(values);
                          }, 0);
                        }}
                      />
                    )}
                  </div>
                ))}

                <Form.Item>
                  <button
                    type="button"
                    className="flex items-center justify-center w-full border border-dashed border-gray-300 py-2 px-4 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all rounded"
                    onClick={() => add()}
                  >
                    <PlusOutlined className="mr-2" />
                    {t("addModel.addInjectionPoint")}
                  </button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      )}
    </>
  );
};

export default CacheControlSettings;
