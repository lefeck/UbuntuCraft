#!/bin/bash
set -e

REGISTRY_USER="jetfuls"
APP_VERSION="1.0"
# UBUNTU_VERSIONS=("22.04" "20.04")
# UBUNTU_VERSIONS=("20.04")
UBUNTU_VERSIONS=("24.04")
#UBUNTU_VERSIONS=("20.04" "22.04" "24.04")
ALIYUN_REGISTRY="crpi-g7nxbvns4i9rnvaf.cn-hangzhou.personal.cr.aliyuncs.com"

for UBUNTU_VERSION in "${UBUNTU_VERSIONS[@]}"; do
    IMAGE_NAME="${REGISTRY_USER}/ubuntu-craft:${APP_VERSION}-ubuntu${UBUNTU_VERSION}"
    ALIYUN_IMAGE="${ALIYUN_REGISTRY}/${REGISTRY_USER}/ubuntu-craft:${APP_VERSION}-ubuntu${UBUNTU_VERSION}"

    echo "=== Building Docker image: $IMAGE_NAME ==="
    make docker-build REGISTRY_USER="$REGISTRY_USER" APP_VERSION="$APP_VERSION" UBUNTU_VERSION="$UBUNTU_VERSION"

    echo "=== Pushing to Docker Hub: $IMAGE_NAME ==="
    docker push "$IMAGE_NAME"

    echo "=== Tagging for Aliyun: $ALIYUN_IMAGE ==="
    docker tag "$IMAGE_NAME" "$ALIYUN_IMAGE"

    echo "=== Pushing to Aliyun: $ALIYUN_IMAGE ==="
    docker push "$ALIYUN_IMAGE"

    echo "=== Done: Ubuntu $UBUNTU_VERSION ==="
done

echo "All images built and pushed successfully!"
