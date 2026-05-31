package main

import (
	"flag"

	"github.com/gin-gonic/gin"
	"github.com/lefeck/UbuntuCraft/api"
	"github.com/lefeck/UbuntuCraft/logger"
	"github.com/lefeck/UbuntuCraft/server"
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
		logger.Fatalf("Failed to create server: %v", err)
	}
	logger.Infof("Starting server on port %d", cfg.Port)
	if err := server.Run(); err != nil {
		logger.Fatalf("Failed to run server: %v", err)
	}
}
