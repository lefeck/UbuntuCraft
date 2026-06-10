package middleware

import (
	"fmt"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"net/http"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Content-Type,AccessToken,X-CSRF-Token, Authorization, Token, x-token")
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PATCH, PUT")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")
		c.Header("Access-Control-Allow-Credentials", "true")

		if method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
		}
	}
}

// GinLogger returns a custom logger middleware matching KickCraft's log format:
// [2026-06-25 12:43:15] [INFO] GET /api/config/default 200 349.33µs
func GinLogger(out io.Writer) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status code
		statusCode := c.Writer.Status()

		// Format client IP
		clientIP := c.ClientIP()
		method := c.Request.Method
		status := fmt.Sprintf("%d", statusCode)
		latencyStr := latency.String()

		if raw != "" {
			path = path + "?" + raw
		}

		// Format log entry matching KickCraft style
		timestamp := time.Now().Format("2006-01-02 15:04:05")
		logLine := fmt.Sprintf("[%s] [%s] %s %s%s %s\n",
			timestamp,
			method,
			path,
			status,
			latencyStr,
			clientIP,
		)

		fmt.Fprint(out, logLine)
	}
}
