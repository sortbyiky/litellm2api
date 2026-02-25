from litellm._logging import verbose_proxy_logger
from litellm.caching.caching import DualCache
from litellm.integrations.custom_logger import CustomLogger
from litellm.proxy._types import UserAPIKeyAuth


class ThinkingInjectionHook(CustomLogger):
    """Auto-inject thinking params for Anthropic Claude models when not provided by client."""

    MIN_OUTPUT_TOKENS = 4096
    MIN_BUDGET = 1024

    async def async_pre_call_hook(
        self,
        user_api_key_dict: UserAPIKeyAuth,
        cache: DualCache,
        data: dict,
        call_type: str,
    ):
        model = data.get("model", "")
        if "claude" not in model.lower() and "anthropic" not in model.lower():
            return data
        if "thinking" in data or "reasoning_effort" in data:
            return data

        max_tokens = data.get("max_tokens") or data.get("max_completion_tokens") or 16000
        budget = max_tokens - self.MIN_OUTPUT_TOKENS
        if budget < self.MIN_BUDGET:
            return data

        data["max_tokens"] = max_tokens
        data["thinking"] = {"type": "enabled", "budget_tokens": budget}
        verbose_proxy_logger.debug(
            "ThinkingInjectionHook: injected thinking for model=%s, max_tokens=%s, budget=%s",
            model,
            max_tokens,
            budget,
        )
        return data
