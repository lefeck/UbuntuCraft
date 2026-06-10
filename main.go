package main

import (
	"flag"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/lefeck/ubuntu-autoinstaller/api"
	"github.com/lefeck/ubuntu-autoinstaller/logger"
	"github.com/lefeck/ubuntu-autoinstaller/server"
)

func main() {
	port := flag.Int("p", 8080, "Port to run the web server on")
	mode := flag.String("m", gin.ReleaseMode, "Mode to run the server in (debug, release, test)")
	flag.Parse()

	handler := api.NewHandler()
	cfg := &server.ConfigInfo{
		Mode: *mode,
		Port: *port,
	}
	server, err := server.New(handler, cfg)
	if err != nil {
		logger.Fatal(fmt.Sprintf("Failed to create server: %v", err))
	}
	logger.Info(fmt.Sprintf("Starting server on port %d", cfg.Port))
	if err := server.Run(); err != nil {
		logger.Fatal(fmt.Sprintf("Failed to run server: %v", err))
	}
}
