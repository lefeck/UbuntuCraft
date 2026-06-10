package logger

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var (
	logger       *Logger
	once         sync.Once
	currentLevel = INFO
)

type Logger struct {
	mu     sync.Mutex
	output io.Writer
}

func Init() {
	once.Do(func() {
		logger = &Logger{
			output: os.Stdout,
		}
	})
}

func InitWithOutput(w io.Writer) {
	once.Do(func() {
		logger = &Logger{
			output: w,
		}
	})
}

func SetLevel(level Level) {
	currentLevel = level
}

func GetWriter() io.Writer {
	if logger == nil {
		Init()
	}
	return logger
}

func (l *Logger) Write(p []byte) (n int, err error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.output.Write(p)
}

func formatTime() string {
	return time.Now().Format("2006-01-02 15:04:05")
}

func levelString(level Level) string {
	switch level {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

func log(level Level, format string, args ...interface{}) {
	if logger == nil {
		Init()
	}
	if level < currentLevel {
		return
	}
	msg := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("[%s] [%s] %s\n", formatTime(), levelString(level), msg)
	logger.mu.Lock()
	defer logger.mu.Unlock()
	fmt.Fprint(logger.output, line)
}

func Debug(format string, args ...interface{}) {
	log(DEBUG, format, args...)
}

func Info(format string, args ...interface{}) {
	log(INFO, format, args...)
}

func Warn(format string, args ...interface{}) {
	log(WARN, format, args...)
}

func Error(format string, args ...interface{}) {
	log(ERROR, format, args...)
}

func Fatal(format string, args ...interface{}) {
	log(ERROR, format, args...)
	os.Exit(1)
}
