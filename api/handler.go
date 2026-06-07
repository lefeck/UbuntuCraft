package api

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/lefeck/ubuntu-autoinstaller/cmd"
	"github.com/lefeck/ubuntu-autoinstaller/logger"
	"github.com/lefeck/ubuntu-autoinstaller/utils"

	"github.com/lefeck/ubuntu-autoinstaller/config"
	"github.com/lefeck/ubuntu-autoinstaller/generator"

	"github.com/gin-gonic/gin"
)

// Handler
type Handler struct {
	userDataGen *generator.UserDataGenerator
	generator   *generator.Generator
	buildStatus map[string]*BuildStatus
}

// BuildStatus
type BuildStatus struct {
	ID       string            `json:"id"`
	Status   string            `json:"status"`
	Progress int               `json:"progress"`
	Steps    map[string]string `json:"steps"`
	Logs     []string          `json:"logs"`
	Error    string            `json:"error,omitempty"`
	Output   string            `json:"output,omitempty"`
}

// NewHandler
func NewHandler() *Handler {
	dir, err := os.MkdirTemp("", "tmp.")
	if err != nil {
		logger.Fatalf("Failed to create temporary directory: %v", err)
	}
	executor, err := generator.NewGenerator(&cmd.Executor{}, dir)
	if err != nil {
		logger.Error("Failed to create executor: %v", err)
	}
	return &Handler{
		userDataGen: generator.NewUserDataGenerator(),
		generator:   executor,
		buildStatus: make(map[string]*BuildStatus),
	}
}

// GenerateUserData Generate user-data configuration file
// @Summary Generate user-data configuration
// @Description Generate a user-data configuration file based on provided config
// @Tags user-data
// @Accept json
// @Produce json
// @Param request body config.Config true "Configuration object"
// @Success 200 {object} map[string]interface{} "User-data generated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request parameters"
// @Failure 500 {object} map[string]interface{} "Failed to generate user-data"
// @Router /userdata/generate [post]
func (h *Handler) GenerateUserData(c *gin.Context) {
	var request struct {
		Config *config.Config `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters: %s " + err.Error(),
		})
		return
	}

	// Generate user-data
	userData, err := h.userDataGen.GenerateFromConfig(request.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate user-data: " + err.Error(),
		})
		return
	}

	// Validate generated user-data
	if err := h.userDataGen.ValidateUserData(userData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "User-data validation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"userData": string(userData),
		"message":  "User-data generated successfully",
	})
}

// GetDefaultConfig Get default configuration
// @Summary Get default configuration
// @Description Get the default configuration template
// @Tags config
// @Produce json
// @Success 200 {object} map[string]interface{} "Default config retrieved successfully"
// @Failure 500 {object} map[string]interface{} "Failed to generate default config"
// @Router /config/default [get]
func (h *Handler) GetDefaultConfig(c *gin.Context) {
	yamlData, err := config.LoadTemplateYAML("default")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to load default template: " + err.Error(),
		})
		return
	}

	// Hard error on invalid templates (parse + validate)
	cfg, err := h.userDataGen.LoadConfigFromYAML(yamlData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid default template YAML: " + err.Error(),
		})
		return
	}
	if err := cfg.Validate(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid default template config: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config":  string(yamlData),
		"message": "Default config retrieved successfully",
	})
}

// LoadConfigFromYAML Load configuration from YAML
// @Summary Load configuration from YAML
// @Description Load and validate a configuration from YAML data
// @Tags config
// @Accept json
// @Produce json
// @Param request body map[string]string true "YAML data"
// @Success 200 {object} map[string]interface{} "Config loaded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request parameters or YAML parsing failed"
// @Router /config/load [post]
func (h *Handler) LoadConfigFromYAML(c *gin.Context) {
	var request struct {
		YAMLData string `json:"yamlData" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters: " + err.Error(),
		})
		return
	}

	// Load configuration from YAML
	cfg, err := h.userDataGen.LoadConfigFromYAML([]byte(request.YAMLData))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse YAML config: " + err.Error(),
		})
		return
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Config validation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config":  cfg,
		"message": "Config loaded successfully",
	})
}

// ValidateConfig Validate configuration
// @Summary Validate configuration
// @Description Validate a configuration object
// @Tags config
// @Accept json
// @Produce json
// @Param request body config.Config true "Configuration object"
// @Success 200 {object} map[string]interface{} "Config validation passed"
// @Failure 400 {object} map[string]interface{} "Config validation failed"
// @Router /config/validate [post]
func (h *Handler) ValidateConfig(c *gin.Context) {
	var request struct {
		Config *config.Config `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters: " + err.Error(),
		})
		return
	}

	// Validate configuration
	if err := request.Config.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Config validation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Config validation passed",
	})
}

// PreviewUserData Preview generated user-data
// @Summary Preview user-data configuration
// @Description Preview the user-data configuration that would be generated from a config object
// @Tags user-data
// @Accept json
// @Produce json
// @Param request body config.Config true "Configuration object"
// @Success 200 {object} map[string]interface{} "User-data preview generated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request parameters"
// @Failure 500 {object} map[string]interface{} "Failed to generate user-data preview"
// @Router /userdata/preview [post]
func (h *Handler) PreviewUserData(c *gin.Context) {
	var request struct {
		Config *config.Config `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters: " + err.Error(),
		})
		return
	}

	// Generate user-data preview
	userData, err := h.userDataGen.GenerateFromConfig(request.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate user-data preview: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"user-data": string(userData),
		"message":   "User-data preview generated successfully",
	})
}

// GenerateISORequest Generate ISO request structure
type GenerateISORequest struct {
	SourceType     string                `json:"sourceType" binding:"required"` // "local" or "download"
	SourceISO      string                `json:"sourceISO"`                     // Local ISO file path (when sourceType is "local")
	CodeName       string                `json:"codeName"`                      // Ubuntu release name (when sourceType is "download")
	DestinationISO string                `json:"destinationISO"`                // Output ISO file path
	UserData       string                `json:"userData" binding:"required"`   // user-data configuration content
	PackageList    []string              `json:"packageList"`                   // Additional package list
	UseHWEKernel   bool                  `json:"useHWEKernel"`                  // Whether to use HWE kernel
	MD5Checksum    bool                  `json:"md5Checksum"`                   // Whether to update MD5 checksum
	GPGVerify      bool                  `json:"gpgVerify"`                     // Whether to perform GPG verification
	Apps           string                `json:"apps"`                          // local build Application packages
	EmbeddedFiles  []config.EmbeddedFile `json:"embeddedFiles"`                 // Custom files to inject into ISO
}

// validateGenerateISORequest Validate ISO generation request parameters
func (h *Handler) validateGenerateISORequest(request *GenerateISORequest) error {
	// Validate source type
	if request.SourceType != "local" && request.SourceType != "download" {
		return fmt.Errorf("sourceType must be 'local' or 'download'")
	}

	// If local ISO, validate path
	if request.SourceType == "local" && request.SourceISO == "" {
		return fmt.Errorf("sourceISO is required when sourceType is 'local'")
	}

	// If downloading ISO, validate release name
	if request.SourceType == "download" && request.CodeName == "" {
		return fmt.Errorf("CodeName is required when sourceType is 'download'")
	}

	// Validate release name validity
	if request.CodeName != "" {
		validReleases := []string{"focal", "jammy", "noble", "resolute"}
		isValid := false
		for _, release := range validReleases {
			if request.CodeName == release {
				isValid = true
				break
			}
		}
		if !isValid {
			return fmt.Errorf("CodeName must be one of: focal, jammy, noble, resolute")
		}
	}

	// Validate output path
	if !strings.HasSuffix(request.DestinationISO, ".iso") {
		return fmt.Errorf("outputPath must end with .iso extension")
	}

	return nil
}

// GenerateISO 生成新的ISO镜像文件
// @Summary Generate ISO image
// @Description Generate a new ISO image with the provided configuration
// @Tags iso
// @Accept json
// @Produce json
// @Param request body GenerateISORequest true "ISO generation request"
// @Success 200 {object} map[string]interface{} "ISO generation started"
// @Failure 400 {object} map[string]interface{} "Invalid request parameters"
// @Failure 500 {object} map[string]interface{} "Failed to start ISO generation"
// @Router /iso/generate [post]
func (h *Handler) GenerateISO(c *gin.Context) {
	var request GenerateISORequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters: " + err.Error(),
		})
		return
	}

	// Validate request parameters
	if err := h.validateGenerateISORequest(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parameter validation failed: " + err.Error(),
		})
		return
	}

	// Generate build ID
	buildID := fmt.Sprintf("build_%d", time.Now().UnixNano())

	// Initialize build status
	buildStatus := &BuildStatus{
		ID:       buildID,
		Status:   "running",
		Progress: 0,
		Steps:    make(map[string]string),
		Logs:     []string{},
	}
	h.buildStatus[buildID] = buildStatus

	// Execute build process in background
	go func() {
		if err := h.buildProcessWithStatus(&request, buildStatus, c); err != nil {
			//if err := h.buildProcessWithStatus(&request, buildStatus); err != nil {
			buildStatus.Status = "failed"
			buildStatus.Error = err.Error()
			buildStatus.Logs = append(buildStatus.Logs, fmt.Sprintf("ERROR: %s", err.Error()))
		} else {
			buildStatus.Status = "completed"
			buildStatus.Progress = 100
			buildStatus.Steps["complete"] = "completed"

			// Use correct ISO file path
			// If file is in download directory
			downloadPath := filepath.Join(h.generator.Path.DownloadDir(), request.DestinationISO)
			if _, err := os.Stat(downloadPath); err == nil {
				// File is in download directory
				buildStatus.Output = downloadPath
				logger.Infof("Found ISO file at: %s", downloadPath)
			} else if filepath.IsAbs(request.DestinationISO) && fileExists(request.DestinationISO) {
				// Use absolute path
				buildStatus.Output = request.DestinationISO
				logger.Infof("Using absolute path: %s", request.DestinationISO)
			} else {
				// Try to find in current directory
				absPath, err := filepath.Abs(request.DestinationISO)
				if err == nil && fileExists(absPath) {
					buildStatus.Output = absPath
					logger.Infof("Using file in current directory: %s", absPath)
				} else {
					// Finally try to find in working directory
					workingDir, _ := os.Getwd()
					workingPath := filepath.Join(workingDir, request.DestinationISO)
					if fileExists(workingPath) {
						buildStatus.Output = workingPath
						logger.Infof("Using file in working directory: %s", workingPath)
					} else {
						// File not found, record all attempted paths
						logger.Warnf("Could not find ISO file at any of these locations:")
						logger.Warnf("- %s", downloadPath)
						logger.Warnf("- %s", request.DestinationISO)
						logger.Warnf("- %s", absPath)
						logger.Warnf("- %s", workingPath)
						buildStatus.Output = downloadPath // Use most likely path
					}
				}
			}

			buildStatus.Logs = append(buildStatus.Logs, "✅ ISO generation completed successfully!")
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"buildID": buildID,
		"message": "ISO generation started",
	})
}

// UploadISO handles the upload of an ISO file
func (h *Handler) uploadISO(c *gin.Context) (string, error) {
	// Get the uploaded file
	file, err := c.FormFile("iso")
	if err != nil {
		return "", fmt.Errorf("failed to retrieve uploaded file: %w", err)
	}

	// Validate file extension
	if filepath.Ext(file.Filename) != ".iso" {
		return "", fmt.Errorf("only ISO file format is supported")
	}

	// Validate file size ( max 10GB)
	const maxSize = 10 << 30 // 10GB
	if file.Size > maxSize {
		return "", fmt.Errorf("file size exceeds the maximum limit of %d bytes", maxSize)
	}

	// Destination path
	localImagePath := h.generator.Path.DownloadDir()
	dst := filepath.Join(localImagePath, file.Filename)

	// Save the uploaded file
	if err := c.SaveUploadedFile(file, dst); err != nil {
		return "", fmt.Errorf("failed to save uploaded file: %w", err)
	}

	return dst, nil
}

// UploadISOHandler is the Gin API wrapper
// @Summary Upload ISO file
// @Description Upload an ISO file to the server and extract it automatically
// @Tags iso
// @Accept multipart/form-data
// @Produce json
// @Param iso formData file true "ISO file to upload"
// @Success 200 {object} map[string]interface{} "ISO file uploaded and extracted successfully"
// @Failure 400 {object} map[string]interface{} "Failed to upload ISO file"
// @Failure 500 {object} map[string]interface{} "Failed to extract ISO"
// @Router /iso/upload [post]
func (h *Handler) UploadISO(c *gin.Context) {
	dst, err := h.uploadISO(c)
	if err != nil {
		logger.Error("ISO upload failed: ", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	logger.Info("Successfully uploaded ISO file: ", dst)

	// Get ISO metadata for codename
	imageMeta, err := utils.NewImageMeta(dst)
	if err != nil {
		logger.Warn("Failed to read ISO metadata: ", err)
		// Return success even if metadata reading fails
		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"filePath": dst,
			"fileName": filepath.Base(dst),
			"message":  "ISO file uploaded successfully",
		})
		return
	}

	// Return success - extraction will happen when Generate ISO Image is clicked
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"filePath": dst,
		"fileName": filepath.Base(dst),
		"codeName": imageMeta.CodeName,
		"message":  "ISO file uploaded successfully",
	})
}

// buildProcessWithStatus Execute complete ISO build process (with status updates, maintain compatibility)
func (h *Handler) buildProcessWithStatus(request *GenerateISORequest, status *BuildStatus, c *gin.Context) error {
	updateProgress := func(progress int, step, message string) {
		status.Progress = progress
		status.Steps[step] = "completed"
		status.Logs = append(status.Logs, message)
	}

	// Step 1: Preprocessing - Create temporary directory and check packages
	status.Steps["prepare"] = "running"
	status.Logs = append(status.Logs, "📁 Preparing installation environment...")
	if err := h.generator.PrepareEnvironment(request.CodeName); err != nil {
		return fmt.Errorf("preprocessing failed: %w", err)
	}
	updateProgress(10, "prepare", "✅ Installation environment ready")

	var localImagePath string
	var imageMeta *utils.ImageMeta
	var err error

	// Step 2: Process ISO file based on source type
	switch request.SourceType {
	case "download":
		status.Steps["download"] = "running"
		status.Logs = append(status.Logs, "🌎 Downloading ISO...")
		localImagePath, err = h.generator.DownloadISOImage(request.CodeName, request.GPGVerify)
		if err != nil {
			return fmt.Errorf("ISO download failed: %w", err)
		}
		updateProgress(30, "download", "✅ ISO downloaded successfully")

		imageMeta, err = utils.NewImageMeta(localImagePath)
		if err != nil {
			return fmt.Errorf("failed to get image meta: %w", err)
		}

		if request.GPGVerify {
			status.Steps["verify"] = "running"
			status.Logs = append(status.Logs, "🔐 Verifying ISO (GPG)...")
			if err := h.generator.VerifyISO(request.GPGVerify, localImagePath, request.CodeName); err != nil {
				return fmt.Errorf("ISO verification failed: %w", err)
			}
			updateProgress(40, "verify", "✅ ISO verified successfully")
		}

	case "local":
		status.Steps["upload"] = "running"
		status.Logs = append(status.Logs, "📦 Using previously uploaded local ISO...")
		if request.SourceISO == "" {
			return fmt.Errorf("local SourceISO path is empty")
		}
		if _, err := os.Stat(request.SourceISO); err != nil {
			return fmt.Errorf("local ISO not found: %w", err)
		}
		localImagePath = request.SourceISO
		updateProgress(20, "upload", "✅ Local ISO ready")

		imageMeta, err = utils.NewImageMeta(localImagePath)
		if err != nil {
			return fmt.Errorf("failed to get image meta: %w", err)
		}
	}

	// Step 3: Extract ISO image (always extract to ensure fresh state)
	status.Steps["extract"] = "running"
	status.Logs = append(status.Logs, "📂 Extracting ISO contents...")
	if err := h.generator.ExtractISO(imageMeta.CodeName, localImagePath); err != nil {
		return fmt.Errorf("ISO extraction failed: %w", err)
	}
	status.Logs = append(status.Logs, "✅ ISO contents extracted")
	updateProgress(50, "extract", "✅ ISO extracted")

	// Step 4: Add configuration data (user-data and meta-data)
	status.Steps["inject"] = "running"
	status.Logs = append(status.Logs, "🧩 Injecting user-data configuration...")

	userDataFile := h.generator.Path.MetaDataFile(generator.UserDataFile)
	if err := os.WriteFile(userDataFile, []byte(request.UserData), 0644); err != nil {
		return fmt.Errorf("failed to create temporary user-data file: %w", err)
	}
	if err := h.generator.InjectNoCloudConfig(imageMeta.CodeName); err != nil {
		return fmt.Errorf("failed to add config data: %w", err)
	}
	updateProgress(60, "inject", "✅ user-data injected")

	// Step 4b: Inject embedded custom files into ISO
	if len(request.EmbeddedFiles) > 0 {
		status.Steps["embedded"] = "running"
		status.Logs = append(status.Logs, "📁 Injecting embedded custom files...")
		if err := h.generator.InjectEmbeddedFiles(request.EmbeddedFiles); err != nil {
			return fmt.Errorf("failed to inject embedded files: %w", err)
		}
		updateProgress(63, "embedded", fmt.Sprintf("✅ %d embedded file(s) injected", len(request.EmbeddedFiles)))
	}

	// Step 5: Download and prepare additional packages (if any)
	if len(request.PackageList) > 0 {
		status.Steps["packages"] = "running"
		status.Logs = append(status.Logs, "📦 Preparing additional packages...")

		if err := h.generator.PrepareLocalPackagesRepo(request.PackageList); err != nil {
			return fmt.Errorf("failed to download and prepare packages: %w", err)
		}

		updateProgress(65, "packages", "✅ Extra packages prepared")
	}

	// Step 6: Add autoinstall parameters to kernel command line
	status.Steps["kernel"] = "running"
	status.Logs = append(status.Logs, "⚙️ Adding autoinstall kernel parameters...")
	if err := h.generator.AddAutoinstallKernelParams(imageMeta.CodeName); err != nil {
		return fmt.Errorf("failed to add autoinstall parameter: %w", err)
	}
	updateProgress(70, "kernel", "✅ Kernel parameters added")

	// Step 7: Configure HWE kernel (if enabled)
	status.Steps["hwe"] = "running"
	status.Logs = append(status.Logs, "🧪 Configuring HWE kernel if requested...")
	if err := h.generator.ConfigureHWEKernel(imageMeta.CodeName, request.UseHWEKernel); err != nil {
		return fmt.Errorf("failed to configure HWE kernel: %w", err)
	}
	updateProgress(80, "hwe", "✅ HWE kernel configuration processed")

	// Step 8: Update MD5 (if enabled)
	status.Steps["md5"] = "running"
	status.Logs = append(status.Logs, "🔢 Updating MD5 checksums if requested...")
	if err := h.generator.UpdateGrubMD5Sums(imageMeta.CodeName, request.MD5Checksum); err != nil {
		return fmt.Errorf("failed to update MD5 checksum: %w", err)
	}
	updateProgress(90, "md5", "✅ MD5 checksums updated")

	// Step 9: Repackage ISO image
	status.Steps["repackage"] = "running"
	status.Logs = append(status.Logs, "📦 Repackaging ISO image...")
	if err := h.generator.RepackageISOImage(imageMeta.CodeName, request.DestinationISO); err != nil {
		return fmt.Errorf("failed to repackage ISO: %w", err)
	}
	updateProgress(100, "repackage", "✅ ISO repackaged successfully")

	return nil
}

// GetBuildStatus Get build status
// @Summary Get build status
// @Description Get the status of an ISO build process
// @Tags iso
// @Produce json
// @Param id path string true "Build ID"
// @Success 200 {object} map[string]interface{} "Build status retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Build ID cannot be empty"
// @Failure 404 {object} map[string]interface{} "Build ID does not exist"
// @Router /iso/build/{id}/status [get]
func (h *Handler) GetBuildStatus(c *gin.Context) {
	buildID := c.Param("id")
	if buildID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Build ID cannot be empty",
		})
		return
	}

	status, exists := h.buildStatus[buildID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Build ID does not exist",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  status,
		"message": "Build status retrieved successfully",
	})
}

// GetBuildLogs Get build logs
// @Summary Get build logs
// @Description Get the logs of an ISO build process
// @Tags iso
// @Produce json
// @Param id path string true "Build ID"
// @Success 200 {object} map[string]interface{} "Build logs retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Build ID cannot be empty"
// @Failure 404 {object} map[string]interface{} "Build ID does not exist"
// @Router /iso/build/{id}/logs [get]
func (h *Handler) GetBuildLogs(c *gin.Context) {
	buildID := c.Param("id")
	if buildID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Build ID cannot be empty",
		})
		return
	}

	status, exists := h.buildStatus[buildID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Build ID does not exist",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"logs":    status.Logs,
		"message": "Build logs retrieved successfully",
	})
}

// UploadApps Upload additional applications
// @Summary Download generated ISO
// @Description Download the ISO file associated with a completed build task
// @Tags ISO
// @Accept  json
// @Produce  octet-stream
// @Param id path string true "Build ID"
// @Success 200 {file} binary "Returns the ISO file for download"
// @Failure 400 {object} map[string]string "Invalid request or build not completed"
// @Failure 404 {object} map[string]string "Build ID not found or ISO file missing"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /download/{id} [get]
func (h *Handler) DownloadISO(c *gin.Context) {
	// Get build ID from URL path parameter
	buildID := c.Param("id")
	if buildID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Build ID cannot be empty",
		})
		return
	}

	// Check if the build status exists for the given ID
	status, exists := h.buildStatus[buildID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Build ID does not exist",
		})
		return
	}

	// Ensure the build has completed successfully
	if status.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Build is not completed yet",
		})
		return
	}

	// Ensure the output path is set
	if status.Output == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Output file not found",
		})
		return
	}

	// Debug log: attempting file download
	logger.Infof("Attempting to download file: %s", status.Output)

	// Check if the output file exists at the primary path
	fileInfo, err := os.Stat(status.Output)
	if os.IsNotExist(err) {
		logger.Errorf("File not found at primary location: %s", status.Output)

		// Try alternative path in the download directory
		fileName := filepath.Base(status.Output)
		altPath := h.generator.Path.DownloadFile(fileName)

		altInfo, altErr := os.Stat(altPath)
		if altErr == nil {
			// Found alternative file in download dir
			logger.Infof("Found alternative file at: %s", altPath)
			fileInfo = altInfo
			status.Output = altPath
		} else {
			// Try current working directory
			curPath, _ := filepath.Abs(fileName)
			curInfo, curErr := os.Stat(curPath)

			if curErr == nil {
				// Found file in current directory
				logger.Infof("Found file in current directory: %s", curPath)
				fileInfo = curInfo
				status.Output = curPath
			} else {
				// Try working directory path
				workingDir, _ := os.Getwd()
				workPath := filepath.Join(workingDir, fileName)
				workInfo, workErr := os.Stat(workPath)

				if workErr == nil {
					// Found file in working directory
					logger.Infof("Found file in working directory: %s", workPath)
					fileInfo = workInfo
					status.Output = workPath
				} else {
					// File not found anywhere
					logger.Errorf("File not found at any location: %s, %s, %s, %s",
						status.Output, altPath, curPath, workPath)
					c.JSON(http.StatusNotFound, gin.H{
						"error": "ISO file not found on server",
					})
					return
				}
			}
		}
	} else if err != nil {
		// Unexpected error while checking file
		logger.Errorf("Error checking file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error checking file: " + err.Error(),
		})
		return
	}

	// Log file size
	logger.Infof("File exists, size: %d bytes", fileInfo.Size())

	// Set response headers for file download
	fileName := filepath.Base(status.Output)
	logger.Infof("Setting filename for download: %s", fileName)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+fileName)
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Send the file to the client
	logger.Infof("Sending file to client...")
	c.File(status.Output)
}

// ResetBuildConfig resets the build configuration and cleans up temporary build files.
// This allows switching between different build modes without residual configuration.
// It keeps the directory structure but empties the contents.
func (h *Handler) ResetBuildConfig(c *gin.Context) {
	path := h.generator.Path

	// Define directories to clean (keep structure, empty contents)
	dirsToClean := []string{
		path.BuildDir(),
		path.DownloadDir(),
		path.Packages(),
		path.Scripts(),
		path.Mount(),
	}

	// Clean each directory's contents while preserving the directory structure
	for _, dir := range dirsToClean {
		entries, err := os.ReadDir(dir)
		if err != nil {
			// Directory might not exist yet, skip it
			continue
		}
		for _, entry := range entries {
			fullPath := filepath.Join(dir, entry.Name())
			if err := os.RemoveAll(fullPath); err != nil {
				logger.Warnf("Failed to remove %s: %v", fullPath, err)
			}
		}
	}

	// Recreate essential subdirectories to maintain structure
	essentialDirs := []string{
		path.Mount(),
		path.Packages(),
		path.Scripts(),
		path.DownloadDir(),
	}
	for _, dir := range essentialDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			logger.Warnf("Failed to recreate directory %s: %v", dir, err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Build configuration reset successfully. Directory structure preserved.",
	})
}

// checkISOExtracted verifies whether the ISO has already been extracted into the mount directory.
func (h *Handler) checkISOExtracted(mountPath string) (bool, error) {
	fi, err := os.Stat(mountPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	if !fi.IsDir() {
		return false, nil
	}
	entries, err := os.ReadDir(mountPath)
	if err != nil {
		return false, err
	}
	return len(entries) > 0, nil
}

// WriteEmbeddedFile writes a file directly to the extracted ISO directory tree.
// POST /api/v1/embedded/write
func (h *Handler) WriteEmbeddedFile(c *gin.Context) {
	var req struct {
		Path       string `json:"path" binding:"required"`
		Content    string `json:"content" binding:"required"`
		Encoding   string `json:"encoding"`   // "text" or "base64", default "text"
		Permission string `json:"permission"` // default "0644"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Security: prevent path traversal
	if strings.Contains(req.Path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	// Use /mnt/build/ for embedded files (separate from ISO extraction logic)
	rootDir := h.generator.Path.Mount()
	targetPath := filepath.Join(rootDir, req.Path)
	absRoot, _ := filepath.Abs(rootDir)
	absTarget, _ := filepath.Abs(targetPath)
	if !strings.HasPrefix(absTarget, absRoot) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	parentDir := filepath.Dir(targetPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create directory: " + err.Error()})
		return
	}
	var content []byte
	if req.Encoding == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(req.Content)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to decode base64: " + err.Error()})
			return
		}
		content = decoded
	} else {
		content = []byte(req.Content)
	}
	perm := os.FileMode(0644)
	if req.Permission != "" {
		fmt.Sscanf(req.Permission, "%o", &perm)
	}
	if err := os.WriteFile(targetPath, content, perm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write file: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"targetPath": targetPath,
		"message":    "File written successfully",
	})
}

// DeleteEmbeddedFile deletes a file from the extracted ISO directory tree.
// DELETE /api/v1/embedded/delete
func (h *Handler) DeleteEmbeddedFile(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.Contains(req.Path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	rootDir := h.generator.Path.Mount()
	targetPath := filepath.Join(rootDir, req.Path)
	absRoot, _ := filepath.Abs(rootDir)
	absTarget, _ := filepath.Abs(targetPath)
	if !strings.HasPrefix(absTarget, absRoot) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found: " + req.Path})
		return
	}
	if err := os.Remove(targetPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete file: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "File deleted successfully",
	})
}

// MkdirEmbedded creates a directory under the embedded root directory.
// POST /api/v1/embedded/mkdir
func (h *Handler) MkdirEmbedded(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.Contains(req.Path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	rootDir := h.generator.Path.Mount()
	targetDir := filepath.Join(rootDir, req.Path)
	absRoot, _ := filepath.Abs(rootDir)
	absTarget, _ := filepath.Abs(targetDir)
	if !strings.HasPrefix(absTarget, absRoot) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create directory: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"targetDir": targetDir,
		"message":   "Directory created successfully",
	})
}

// ListEmbeddedFiles lists all files under the mount directory.
// GET /api/v1/embedded/list
func (h *Handler) ListEmbeddedFiles(c *gin.Context) {
	rootDir := h.generator.Path.Mount()
	var files []map[string]interface{}
	filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		relPath, _ := filepath.Rel(rootDir, path)
		files = append(files, map[string]interface{}{
			"path":     relPath,
			"size":     info.Size(),
			"modified": info.ModTime().Format(time.RFC3339),
		})
		return nil
	})
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"files":   files,
		"message": "Files listed successfully",
	})
}

// ReadEmbeddedFile reads the content of a file from the embedded directory.
// GET /api/v1/embedded/read
func (h *Handler) ReadEmbeddedFile(c *gin.Context) {
	filePath := c.Query("path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}
	if strings.Contains(filePath, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	rootDir := h.generator.Path.Mount()
	targetPath := filepath.Join(rootDir, filePath)
	absRoot, _ := filepath.Abs(rootDir)
	absTarget, _ := filepath.Abs(targetPath)
	if !strings.HasPrefix(absTarget, absRoot) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	content, err := os.ReadFile(targetPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"content": string(content),
		"message": "File read successfully",
	})
}

// countFiles recursively counts all files (not directories) under the given path.
func countFiles(path string) int {
	count := 0
	entries, err := os.ReadDir(path)
	if err != nil {
		return 0
	}
	for _, entry := range entries {
		if entry.IsDir() {
			count += countFiles(filepath.Join(path, entry.Name()))
		} else {
			count++
		}
	}
	return count
}

// ListDirectory lists files and subdirectories under a given path within the embedded directory.
// GET /api/v1/embedded/dir?path=<relpath>
func (h *Handler) ListDirectory(c *gin.Context) {
	rootDir := h.generator.Path.Mount()
	relPath := c.Query("path")
	if relPath == "" {
		relPath = "/"
	}
	if strings.Contains(relPath, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	targetDir := filepath.Join(rootDir, relPath)
	absRoot, _ := filepath.Abs(rootDir)
	absTarget, _ := filepath.Abs(targetDir)
	if !strings.HasPrefix(absTarget, absRoot) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path traversal not allowed"})
		return
	}
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"path":    relPath,
			"rootDir": rootDir,
			"dirs":    []map[string]interface{}{},
			"files":   []map[string]interface{}{},
			"message": "Directory is empty or does not exist",
		})
		return
	}
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read directory: " + err.Error()})
		return
	}
	var dirs []map[string]interface{}
	var files []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			subPath := filepath.Join(targetDir, entry.Name())
			fileCount := countFiles(subPath)
			dirs = append(dirs, map[string]interface{}{
				"name":      entry.Name(),
				"fileCount": fileCount,
			})
		} else {
			info, _ := entry.Info()
			files = append(files, map[string]interface{}{
				"name":     entry.Name(),
				"size":     info.Size(),
				"modified": info.ModTime().Format(time.RFC3339),
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"path":    relPath,
		"rootDir": rootDir,
		"dirs":    dirs,
		"files":   files,
		"message": "Directory listed successfully",
	})
}

// DownloadISO handles downloading of a generated ISO file by build ID
func (h *Handler) UploadApp(c *gin.Context) {
	appFile, err := c.FormFile("app")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to upload app",
		})
		return
	}
	if !fileExists(appFile.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "App file does not exist",
		})
		return
	}
	// support multiple apps type tar.gz, zip file upload
	if strings.HasSuffix(appFile.Filename, ".tar.gz") || strings.HasSuffix(appFile.Filename, ".zip") {
		app := h.generator.Path.Mount()
		if err := os.MkdirAll(app, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create apps directory: " + err.Error(),
			})
			return
		}
		dst := filepath.Join(app, filepath.Base(appFile.Filename))
		if err := c.SaveUploadedFile(appFile, dst); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to save app file: " + err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"filePath": dst,
			"fileName": filepath.Base(dst),
			"message":  "Appcation file uploaded successfully",
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Only .tar.gz and .zip app files are supported",
		})
		return
	}
}

// fileExists Helper function: check if file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// ListTemplates returns a list of all available templates
// @Summary List all templates
// @Description Get all available templates (both preset and user-defined)
// @Tags templates
// @Produce json
// @Success 200 {object} map[string]interface{} "Templates retrieved successfully"
// @Failure 500 {object} map[string]interface{} "Failed to list templates"
// @Router /templates [get]
func (h *Handler) ListTemplates(c *gin.Context) {
	templates, err := config.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"templates": templates,
		"message":   "Templates retrieved successfully",
	})
}

// GetTemplate returns a specific template by name
// @Summary Get a template
// @Description Get a specific template by its name
// @Tags templates
// @Produce json
// @Param name path string true "Template name"
// @Success 200 {object} map[string]interface{} "Template retrieved successfully"
// @Failure 404 {object} map[string]interface{} "Template not found"
// @Failure 500 {object} map[string]interface{} "Failed to get template"
// @Router /templates/{name} [get]
func (h *Handler) GetTemplate(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Template name is required",
		})
		return
	}

	yamlContent, err := config.LoadTemplateYAML(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Template not found: " + err.Error(),
		})
		return
	}

	// Parse the config to get metadata
	templateConfig, err := config.LoadTemplate(name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to parse template: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"name":    name,
		"yaml":    string(yamlContent),
		"config":  templateConfig,
		"message": "Template retrieved successfully",
	})
}

// SaveUserTemplate saves a new user template
// @Summary Save a user template
// @Description Save the current configuration as a user template
// @Tags templates
// @Accept json
// @Produce json
// @Param request body SaveTemplateRequest true "Template to save"
// @Success 200 {object} map[string]interface{} "Template saved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 500 {object} map[string]interface{} "Failed to save template"
// @Router /templates/save [post]
func (h *Handler) SaveUserTemplate(c *gin.Context) {
	var request struct {
		Name   string         `json:"name" binding:"required"`
		Config *config.Config `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Check if template already exists as a preset (built-in)
	if config.PresetExists(request.Name) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Cannot overwrite built-in templates",
		})
		return
	}

	if err := config.SaveUserTemplate(request.Name, request.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save template: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"name":    request.Name,
		"message": "Template saved successfully",
	})
}

// SaveUserTemplateYAML saves a user template with raw YAML content
// @Summary Save a user template with raw YAML
// @Description Save raw YAML content as a user template (preserves all formatting)
// @Tags templates
// @Accept json
// @Produce json
// @Param request body SaveTemplateYAMLRequest true "Template data"
// @Success 200 {object} map[string]interface{} "Template saved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 500 {object} map[string]interface{} "Failed to save template"
// @Router /templates/save-yaml [post]
func (h *Handler) SaveUserTemplateYAML(c *gin.Context) {
	var request SaveTemplateYAMLRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Check if template already exists as a preset (built-in)
	if config.PresetExists(request.Name) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Cannot overwrite built-in templates",
		})
		return
	}

	if err := config.SaveUserTemplateYAML(request.Name, request.YAML); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save template: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"name":    request.Name,
		"message": "Template saved successfully",
	})
}

// SaveTemplateYAMLRequest represents a request to save a template with raw YAML
type SaveTemplateYAMLRequest struct {
	Name string `json:"name" binding:"required"`
	YAML string `json:"yaml" binding:"required"`
}

// ParseYAML parses YAML content and returns the config object
// @Summary Parse YAML
// @Description Parse YAML content and return the config object (used for template editor validation)
// @Tags templates
// @Accept json
// @Produce json
// @Param request body ParseYAMLRequest true "YAML content to parse"
// @Success 200 {object} map[string]interface{} "YAML parsed successfully"
// @Failure 400 {object} map[string]interface{} "Invalid YAML"
// @Failure 500 {object} map[string]interface{} "Parse error"
// @Router /templates/parse [post]
func (h *Handler) ParseYAML(c *gin.Context) {
	var request ParseYAMLRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	cfg, err := h.userDataGen.LoadConfigFromYAML([]byte(request.YAML))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "config": cfg})
}

// ParseYAMLRequest represents a request to parse YAML content
type ParseYAMLRequest struct {
	YAML string `json:"yaml" binding:"required"`
}

// DeleteUserTemplate deletes a user template
// @Summary Delete a user template
// @Description Delete a user-defined template by name
// @Tags templates
// @Produce json
// @Param name path string true "Template name"
// @Success 200 {object} map[string]interface{} "Template deleted successfully"
// @Failure 400 {object} map[string]interface{} "Cannot delete built-in templates"
// @Failure 404 {object} map[string]interface{} "Template not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete template"
// @Router /templates/{name} [delete]
func (h *Handler) DeleteUserTemplate(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Template name is required",
		})
		return
	}

	// Check if it's a built-in template
	templates, err := config.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list templates: " + err.Error(),
		})
		return
	}

	for _, t := range templates {
		if t.Filename == name && t.IsBuiltIn {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Cannot delete built-in templates",
			})
			return
		}
	}

	if err := config.DeleteUserTemplate(name); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Template not found: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"name":    name,
		"message": "Template deleted successfully",
	})
}

// ImportTemplate imports a template from uploaded YAML content
// @Summary Import a template
// @Description Import a template from YAML content
// @Tags templates
// @Accept json
// @Produce json
// @Param request body ImportTemplateRequest true "Template to import"
// @Success 200 {object} map[string]interface{} "Template imported successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 500 {object} map[string]interface{} "Failed to import template"
// @Router /templates/import [post]
func (h *Handler) ImportTemplate(c *gin.Context) {
	var request struct {
		Name string `json:"name" binding:"required"`
		YAML string `json:"yaml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate YAML format (but accept any valid YAML, not just autoinstall)
	_, err := h.userDataGen.LoadConfigFromYAML([]byte(request.YAML))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid YAML format: " + err.Error(),
		})
		return
	}

	// Save the raw YAML directly to preserve formatting
	if err := config.SaveUserTemplateYAML(request.Name, request.YAML); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save template: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"name":    request.Name,
		"message": "Template imported successfully",
	})
}

// SaveTemplateRequest represents a request to save a template
type SaveTemplateRequest struct {
	Name   string         `json:"name" binding:"required"`
	Config *config.Config `json:"config" binding:"required"`
}

// ImportTemplateRequest represents a request to import a template
type ImportTemplateRequest struct {
	Name string `json:"name" binding:"required"`
	YAML string `json:"yaml" binding:"required"`
}
