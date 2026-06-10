package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lefeck/ubuntu-autoinstaller/api"
	_ "github.com/lefeck/ubuntu-autoinstaller/docs"
	"github.com/lefeck/ubuntu-autoinstaller/logger"
	"github.com/lefeck/ubuntu-autoinstaller/middleware"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Server wraps the HTTP engine and API handler.
type Server struct {
	engine     *gin.Engine
	handler    *api.Handler
	ConfigInfo *ConfigInfo
}

type ConfigInfo struct {
	Port          int    `json:"port"`
	Mode          string `json:"mode"`
	EnableCleanup bool   `json:"enable_cleanup"`
}

// New creates a new HTTP server with middleware and Swagger.
func New(handler *api.Handler, cfg *ConfigInfo) (*Server, error) {
	gin.SetMode(cfg.Mode)
	engine := gin.New()
	engine.Use(
		middleware.GinLogger(os.Stdout),
		gin.Recovery(),
		middleware.CORSMiddleware(),
	)

	return &Server{
		engine:     engine,
		handler:    handler,
		ConfigInfo: cfg,
	}, nil
}

// Routes registers all HTTP routes and static2 file handlers.
func (s *Server) Routes() {
	root := s.engine
	root.GET("/health", s.Health)
	root.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Static file service for the web UI
	root.Static("/static", "./static")

	// Serve frontend at root
	root.StaticFile("/", "./static/index.html")
	//root.StaticFile("/index.html", "./static/index.html")

	api := root.Group("/api/v1")

	// Config endpoints
	api.GET("/config/default", s.handler.GetDefaultConfig)
	api.POST("/config/load", s.handler.LoadConfigFromYAML)
	api.POST("/config/validate", s.handler.ValidateConfig)

	// Host info endpoint
	api.GET("/host/info", s.handler.GetHostInfo)

	// user-data endpoints
	api.POST("/userdata/generate", s.handler.GenerateUserData)
	api.POST("/userdata/preview", s.handler.PreviewUserData)

	// ISO endpoints
	api.POST("/iso/upload", s.handler.UploadISO)
	api.POST("/iso/generate", s.handler.GenerateISO)

	// Embedded file endpoints
	api.POST("/embedded/write", s.handler.WriteEmbeddedFile)
	api.DELETE("/embedded/delete", s.handler.DeleteEmbeddedFile)
	api.GET("/embedded/list", s.handler.ListEmbeddedFiles)
	api.GET("/embedded/read", s.handler.ReadEmbeddedFile)
	api.GET("/embedded/dir", s.handler.ListDirectory)
	api.POST("/embedded/mkdir", s.handler.MkdirEmbedded)
	api.POST("/embedded/extract-archive", s.handler.ExtractArchive)

	// Build status endpoints
	api.GET("/build/status/:id", s.handler.GetBuildStatus)
	api.GET("/build/logs/:id", s.handler.GetBuildLogs)
	api.GET("/build/download/:id", s.handler.DownloadISO)
	api.POST("/build/reset", s.handler.ResetBuildConfig)

	// Template endpoints
	api.GET("/templates", s.handler.ListTemplates)
	api.GET("/templates/:name", s.handler.GetTemplate)
	api.POST("/templates/save", s.handler.SaveUserTemplate)
	api.POST("/templates/save-yaml", s.handler.SaveUserTemplateYAML)
	api.POST("/templates/parse", s.handler.ParseYAML)
	api.DELETE("/templates/:name", s.handler.DeleteUserTemplate)
	api.POST("/templates/import", s.handler.ImportTemplate)
}

// Run starts the HTTP server.
func (s *Server) Run() error {
	s.Routes()
	address := fmt.Sprintf("0.0.0.0:%d", s.ConfigInfo.Port)
	server := &http.Server{
		Addr:    address,
		Handler: s.engine,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal(fmt.Sprintf("ListenAndServe: %v", err))
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(5)*time.Second)

	defer cancel()
	ch := <-sig
	logger.Info(fmt.Sprintf("Shutting down server with signal: %s", ch))
	return server.Shutdown(ctx)
}

// @Summary Health
// @Produce json
// @Tags healthz
// @Success 200 {string}  string    "ok"
// @Router /health [get]
func (s *Server) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "Service is running normally",
	})
}
