package logger

// Example usage of the new logging configuration
func ExampleUsage() {
	// Use the logger package functions
	Info("This is an info message")
	Warn("This is a warning message")
	Error("This is an error message")
	Debug("This is a debug message")
}

// Example of how to configure logging in main.go
func ConfigureLogging() {
	// Set log level (default is INFO)
	// Options: DEBUG, INFO, WARN, ERROR
	SetLevel(INFO)

	// For production: set to WARN level to hide debug and info messages
	SetLevel(WARN)

	// For development: set to DEBUG level to show all messages
	SetLevel(DEBUG)
}
