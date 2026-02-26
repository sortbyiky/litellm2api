#!/bin/sh

# Sync main project schema to litellm_proxy_extras before startup
EXTRAS_SCHEMA=$(find /usr/lib -path "*/litellm_proxy_extras/schema.prisma" 2>/dev/null | head -1)
if [ -n "$EXTRAS_SCHEMA" ] && [ -f "/app/litellm/proxy/schema.prisma" ]; then
    cp /app/litellm/proxy/schema.prisma "$EXTRAS_SCHEMA"
    echo "Synced schema.prisma to litellm_proxy_extras"
fi

if [ "$SEPARATE_HEALTH_APP" = "1" ]; then
    export LITELLM_ARGS="$@"
    export SUPERVISORD_STOPWAITSECS="${SUPERVISORD_STOPWAITSECS:-3600}"
    exec supervisord -c /etc/supervisord.conf
fi

if [ "$USE_DDTRACE" = "true" ]; then
    export DD_TRACE_OPENAI_ENABLED="False"
    exec ddtrace-run litellm "$@"
else
    exec litellm "$@"
fi