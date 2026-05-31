.PHONY: all help deps fmt lint test clean run build build-all checksum package

# Project settings
BINARY_NAME ?= ubuntu-craft
MAIN_FILE   ?= main.go
OUT_DIR     ?= dist
GO          ?= go

# Build settings
CGO_ENABLED ?= 0
LDFLAGS     ?= -s -w

# Build matrix
GOOS_LIST   ?= linux darwin windows
GOARCH_LIST ?= amd64 arm64

# Host platform (for single build)
HOST_GOOS   := $(shell $(GO) env GOOS)
HOST_GOARCH := $(shell $(GO) env GOARCH)

# Default target
all: help

help:
	@echo "Make targets (cross-platform build ready):"
	@echo "  deps        - Download and tidy Go modules"
	@echo "  fmt         - Format Go code"
	@echo "  vet        - Vet Go code"
	@echo "  test        - Run all tests"
	@echo "  build       - Build for host platform ($(HOST_GOOS)/$(HOST_GOARCH))"
	@echo "  checksum    - Generate SHA256 checksums for built artifacts"
	@echo "  package     - Archive artifacts (zip for Windows, tar.gz for others)"
	@echo "  clean       - Remove output directory"
	@echo "  run         - Run $(BINARY_NAME) on host"
	@echo "  docker-build	- Build Docker image for host platform"
	@echo "  docker-run    - Run Docker image on host"
	@echo "  docker-push - Push Docker image to registry"
	@echo "  compose-up - Start stack with docker-compose"
	@echo "  compose-down - Stop stack with docker-compose"
	@echo "  compose-logs - Show stack logs with docker-compose"


# Dependencies
deps:
	@echo "Downloading modules..."
	@$(GO) mod tidy
	@$(GO) mod download

# Code quality
fmt:
	@echo "Formatting..."
	@$(GO) fmt ./...

vet:
	@echo "Vetting..."
	@$(GO) vet ./...

# Tests
test:
	@echo "Running tests..."
	@$(GO) test ./... -count=1 -timeout=5m

# Build for host platform
build: deps
	@mkdir -p $(OUT_DIR)
	@out=$(OUT_DIR)/$(BINARY_NAME)-$(HOST_GOOS)-$(HOST_GOARCH); \
	if [ "$(HOST_GOOS)" = "windows" ]; then out="$$out.exe"; fi; \
	echo "Building $$out"; \
	CGO_ENABLED=$(CGO_ENABLED) $(GO) build -trimpath -ldflags '$(LDFLAGS)' -o "$$out" $(MAIN_FILE)



# Run (host only)
run: build
	@echo "Starting $(BINARY_NAME) ($(HOST_GOOS)/$(HOST_GOARCH))..."
	@bin=$(OUT_DIR)/$(BINARY_NAME)-$(HOST_GOOS)-$(HOST_GOARCH); \
	if [ "$(HOST_GOOS)" = "windows" ]; then bin="$$bin.exe"; fi; \
	"$$bin"

# Checksums for all artifacts
checksum:
	@echo "Generating SHA256SUMS..."
	@ls -1 $(OUT_DIR) >/dev/null 2>&1 || { echo "No artifacts in $(OUT_DIR)"; exit 0; }
	@{ command -v sha256sum >/dev/null 2>&1 && sha256sum $(OUT_DIR)/*; \
	   } || { command -v shasum >/dev/null 2>&1 && shasum -a 256 $(OUT_DIR)/*; \
	   } > $(OUT_DIR)/SHA256SUMS
	@echo "Wrote $(OUT_DIR)/SHA256SUMS"

# Package artifacts (zip for .exe, tar.gz otherwise)
package:
	@echo "Archiving artifacts..."
	@ls -1 $(OUT_DIR) >/dev/null 2>&1 || { echo "No artifacts in $(OUT_DIR)"; exit 0; }
	@set -e; \
	for f in $(OUT_DIR)/*; do \
	  case "$$f" in \
	    *.exe) \
	      zip -j "$$f.zip" "$$f" >/dev/null || true ;; \
	    *) \
	      base="$$(basename "$$f")"; \
	      tar -C $(OUT_DIR) -czf "$(OUT_DIR)/$$base.tar.gz" "$$base" ;; \
	  esac; \
	done
	@echo "Done."

# Cleanup
clean:
	@echo "Cleaning $(OUT_DIR)..."
	@rm -rf $(OUT_DIR)

.PHONY: docker-build  docker-run docker-push compose-up compose-down compose-logs

# Docker settings
# 镜像命名规范：<username>/<repo>:<app-version>[-<release-tag>]-ubuntu<base-version>
REGISTRY_USER ?= jetfuls
REPO_NAME     ?= ubuntu-craft
APP_VERSION   ?= 1.0
UBUNTU_VERSION?= 22.04
RELEASE_TAG   ?=
TAG_SUFFIX    := -ubuntu$(UBUNTU_VERSION)
DOCKER_IMAGE  ?= $(REGISTRY_USER)/$(REPO_NAME):$(APP_VERSION)$(if $(RELEASE_TAG),-$(RELEASE_TAG),)$(TAG_SUFFIX)
DOCKER_PLATFORMS ?= linux/amd64
DOCKER_CONTEXT ?= .

# Build Docker image (single-arch)
docker-build:
	@echo "Building Docker image: $(DOCKER_IMAGE)"
	@docker build \
	  --build-arg UBUNTU_VERSION=$(UBUNTU_VERSION) \
	  --build-arg APP_VERSION=$(APP_VERSION) \
	  --build-arg RELEASE_TAG=$(RELEASE_TAG) \
	  -t $(DOCKER_IMAGE) $(DOCKER_CONTEXT)


# Run container (maps 8080 to host)
docker-run:
	@echo "Running $(DOCKER_IMAGE) on http://localhost:8080"
	@docker run --rm -p 8080:8080 --name ubuntu-craft $(DOCKER_IMAGE)

# Push image to registry (ensure DOCKER_IMAGE has a registry/repo)
docker-push:
	@echo "Pushing image: $(DOCKER_IMAGE)"
	@docker push $(DOCKER_IMAGE)

# Default docker-compose file 22.04
COMPOSE_FILE ?= docker-compose.yml

compose-up:
	@echo "Starting stack with $(COMPOSE_FILE)..."
	@docker compose -f $(COMPOSE_FILE) up -d --build

compose-down:
	@echo "Stopping stack with $(COMPOSE_FILE)..."
	@docker compose -f $(COMPOSE_FILE) down

compose-logs:
	@docker compose -f $(COMPOSE_FILE) logs -f --tail=200



