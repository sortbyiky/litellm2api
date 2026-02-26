#!/bin/bash

echo "========================================="
echo "Building Admin UI (with i18n support)..."
echo "========================================="
pwd

# Install dependencies
if command -v apk &> /dev/null; then
    apk update && apk add curl nodejs npm
elif command -v apt-get &> /dev/null; then
    apt-get update && apt-get install -y curl nodejs npm
fi

# If enterprise colors exist, copy them
if [ -f "enterprise/enterprise_ui/enterprise_colors.json" ]; then
    echo "Using enterprise UI colors"
    cp enterprise/enterprise_ui/enterprise_colors.json ui/litellm-dashboard/ui_colors.json
fi

cd ui/litellm-dashboard

npm install --legacy-peer-deps 2>/dev/null || npm install --force 2>/dev/null || npm install

npm run build

if [ $? -eq 0 ]; then
    echo "Frontend build successful, copying to output directory..."
    destination_dir="../../litellm/proxy/_experimental/out"
    rm -rf "$destination_dir"/*
    cp -r ./out/* "$destination_dir"
    rm -rf ./out
    echo "Frontend deployment completed."
else
    echo "WARNING: Frontend build failed, using existing pre-built assets."
fi

cd ../..