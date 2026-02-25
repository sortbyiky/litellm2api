from litellm._logging import verbose_proxy_logger
from litellm.caching.caching import DualCache
from litellm.integrations.custom_logger import CustomLogger
from litellm.proxy._types import UserAPIKeyAuth


class ThinkingInjectionHook(CustomLogger):
    """Auto-inject thinking params for Anthropic Claude models when not provided by client."""

    THINKING_BUDGET = 10000

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

        budget = self.THINKING_BUDGET
        max_tokens = data.get("max_tokens") or data.get("max_completion_tokens")
        if max_tokens and max_tokens <= budget:
            data["max_tokens"] = budget + max_tokens
        elif not max_tokens:
            data["max_tokens"] = 16000

        data["thinking"] = {"type": "enabled", "budget_tokens": budget}
        verbose_proxy_logger.debug(
            "ThinkingInjectionHook: injected thinking for model=%s, max_tokens=%s",
            model,
            data["max_tokens"],
        )
        return data
