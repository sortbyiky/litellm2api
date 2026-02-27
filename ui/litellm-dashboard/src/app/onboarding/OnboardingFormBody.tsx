import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, Form, Input, Typography } from "antd";

type OnboardingFormBodyProps = {
  variant: "signup" | "reset_password";
  userEmail: string;
  isPending: boolean;
  claimError: string | null;
  onSubmit: (values: { password: string }) => void;
};

export function OnboardingFormBody({
  variant,
  userEmail,
  isPending,
  claimError,
  onSubmit,
}: OnboardingFormBodyProps) {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (userEmail) form.setFieldValue("user_email", userEmail);
  }, [userEmail, form]);

  return (
    <div className="mx-auto w-full max-w-md mt-10">
      <Card>
        <Typography.Title level={5} className="text-center mb-5">
          🚅 {t("onboarding.litellm")}
        </Typography.Title>
        <Typography.Title level={3}>
          {variant === "reset_password" ? t("onboarding.resetPassword") : t("onboarding.signUp")}
        </Typography.Title>
        <Typography.Text>
          {variant === "reset_password"
            ? t("onboarding.resetPasswordDesc")
            : t("onboarding.signUpDesc")}
        </Typography.Text>

        {variant === "signup" && (
          <Alert
            className="mt-4"
            type="info"
            message={t("onboarding.sso")}
            description={
              <div className="flex justify-between items-center">
                <span>{t("onboarding.ssoEnterprise")}</span>
                <Button
                  type="primary"
                  size="small"
                  href="https://forms.gle/W3U4PZpJGFHWtHyA9"
                  target="_blank"
                >
                  {t("onboarding.getFreeTrial")}
                </Button>
              </div>
            }
            showIcon
          />
        )}

        <Form className="mt-10 mb-5" layout="vertical" form={form} onFinish={(values) => onSubmit({ password: values.password })}>
          <Form.Item label={t("onboarding.emailAddress")} name="user_email">
            <Input type="email" disabled />
          </Form.Item>

          <Form.Item
            label={t("onboarding.password")}
            name="password"
            rules={[{ required: true, message: t("onboarding.passwordRequired") }]}
            help={
              variant === "reset_password"
                ? t("onboarding.enterNewPassword")
                : t("onboarding.createPassword")
            }
          >
            <Input.Password />
          </Form.Item>

          {claimError && (
            <Alert type="error" message={claimError} showIcon className="mb-4" />
          )}

          <div className="mt-10">
            <Button htmlType="submit" loading={isPending}>
              {variant === "reset_password" ? t("onboarding.resetPassword") : t("onboarding.signUp")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
