package logger

import (
	"io"
	"os"

	"github.com/sirupsen/logrus"
)

var Logger *logrus.Logger
var AccessLogWriter io.Writer

// LogConfig holds logging configuration
type LogConfig struct {
	ShowCommandOutput bool
	CommandLogLevel   logrus.Level
}

var (
	Info   func(...interface{})
	Warn   func(...interface{})
	Error  func(...interface{})
	Infof  func(string, ...interface{})
	Warnf  func(string, ...interface{})
	Errorf func(string, ...interface{})
	Fatalf func(string, ...interface{})

	// Global log configuration
	Config = LogConfig{
		ShowCommandOutput: false,            // Set to false to hide command output
		CommandLogLevel:   logrus.InfoLevel, // Level for command execution logs
	}
)

func init() {
	Logger = logrus.New()
	Logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})
	Logger.SetLevel(logrus.InfoLevel)

	// Write logs to both stdout and file
	logFile, err := os.OpenFile("/var/log/ubuntucraft.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		Logger.SetOutput(os.Stdout)
		AccessLogWriter = os.Stdout
		Logger.Warnf("Failed to open log file /var/log/ubuntucraft.log, falling back to stdout only: %v", err)
	} else {
		multiWriter := io.MultiWriter(os.Stdout, logFile)
		Logger.SetOutput(multiWriter)
		AccessLogWriter = multiWriter
	}

	// Initialize function variables after Logger is created
	Info = Logger.Info
	Warn = Logger.Warn
	Error = Logger.Error
	Infof = Logger.Infof
	Warnf = Logger.Warnf
	Errorf = Logger.Errorf
	Fatalf = Logger.Fatalf
}

// SetCommandOutputEnabled enables or disables command output logging
func SetCommandOutputEnabled(enabled bool) {
	Config.ShowCommandOutput = enabled
}

// SetCommandLogLevel sets the log level for command execution
func SetCommandLogLevel(level logrus.Level) {
	Config.CommandLogLevel = level
}
