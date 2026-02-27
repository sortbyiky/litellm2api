import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button } from "antd";

export function OnboardingErrorView() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-md mt-10">
      <Alert
        type="error"
        message={t("onboarding.failedToLoad")}
        description={t("onboarding.invalidOrExpired")}
        showIcon
      />
      <div className="mt-4">
        <Button href="/ui/login">{t("onboarding.backToLogin")}</Button>
      </div>
    </div>
  );
}
