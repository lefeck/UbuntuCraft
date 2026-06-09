package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/lefeck/ubuntu-autoinstaller/logger"
)

// CalculateSHA256
func CalculateSHA256(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

type DownloadProgress struct {
	Downloaded int64
	Total      int64
	Percent    float64
}

type ProgressCallback func(DownloadProgress)

type LoggerCallback func(string)

// downloadFile
func DownloadFile(url, dest string) error {
	return DownloadFileWithProgress(url, dest, nil, nil)
}

func DownloadFileWithProgress(url, dest string, progress ProgressCallback, logProgress LoggerCallback) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return fmt.Errorf("failed to create download directory: %w", err)
	}

	tmpDest := dest + ".part"
	if err := os.Remove(tmpDest); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove stale partial file: %w", err)
	}

	if err := downloadFileWithCurl(url, tmpDest, progress, logProgress); err != nil {
		_ = os.Remove(tmpDest)
		return err
	}

	if err := os.Rename(tmpDest, dest); err != nil {
		_ = os.Remove(tmpDest)
		return fmt.Errorf("failed to finalize downloaded file: %w", err)
	}

	logger.Infof("Download complete: %s", dest)
	return nil
}

func downloadFileWithCurl(url, dest string, progress ProgressCallback, logProgress LoggerCallback) error {
	if _, err := exec.LookPath("curl"); err != nil {
		return fmt.Errorf("curl not found: %w", err)
	}

	totalSize, _ := fetchRemoteFileSize(url)
	if totalSize > 0 && logProgress != nil {
		logProgress(fmt.Sprintf("🌎 Downloading ISO Image... 0.0%% · 0 B / %s", FormatBytes(totalSize)))
	}

	var wg sync.WaitGroup
	done := make(chan struct{})
	wg.Add(1)
	go func() {
		defer wg.Done()
		monitorDownloadProgress(dest, totalSize, progress, logProgress, done)
	}()

	cmd := exec.Command("curl", "-fL", "--output", dest, url)
	err := cmd.Run()
	close(done)
	wg.Wait()
	if err != nil {
		return fmt.Errorf("curl download failed: %w", err)
	}

	fileInfo, statErr := os.Stat(dest)
	if statErr == nil && progress != nil {
		finalSize := fileInfo.Size()
		finalTotal := totalSize
		if finalTotal <= 0 {
			finalTotal = finalSize
		}
		progress(DownloadProgress{
			Downloaded: finalSize,
			Total:      finalTotal,
			Percent:    100,
		})
	}
	if statErr == nil && logProgress != nil {
		finalSize := fileInfo.Size()
		finalTotal := totalSize
		if finalTotal <= 0 {
			finalTotal = finalSize
		}
		logProgress(fmt.Sprintf("🌎 Downloading ISO Image... 100.0%% · %s / %s", FormatBytes(finalSize), FormatBytes(finalTotal)))
	}

	return nil
}

func fetchRemoteFileSize(url string) (int64, error) {
	cmd := exec.Command("curl", "-fsLI", url)
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to fetch remote file size: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToLower(trimmed), "content-length:") {
			value := strings.TrimSpace(strings.TrimPrefix(trimmed, "Content-Length:"))
			value = strings.TrimSpace(strings.TrimPrefix(value, "content-length:"))
			size, parseErr := strconv.ParseInt(value, 10, 64)
			if parseErr == nil {
				return size, nil
			}
		}
	}

	return 0, nil
}

func monitorDownloadProgress(dest string, totalSize int64, progress ProgressCallback, logProgress LoggerCallback, done <-chan struct{}) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	lastLoggedPercent := -1
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			fileInfo, err := os.Stat(dest)
			if err != nil {
				if os.IsNotExist(err) {
					continue
				}
				return
			}

			downloaded := fileInfo.Size()
			percent := 0.0
			percentInt := lastLoggedPercent
			if totalSize > 0 {
				percent = float64(downloaded) / float64(totalSize) * 100
				if percent > 100 {
					percent = 100
				}
				percentInt = int(percent)
			}

			if progress != nil {
				progress(DownloadProgress{
					Downloaded: downloaded,
					Total:      totalSize,
					Percent:    percent,
				})
			}

			if logProgress != nil && totalSize > 0 && percentInt != lastLoggedPercent && percentInt >= 0 && percentInt%5 == 0 {
				lastLoggedPercent = percentInt
				logProgress(fmt.Sprintf("🌎 Downloading ISO Image... %.1f%% (%s / %s)", percent, FormatBytes(downloaded), FormatBytes(totalSize)))
			}
		}
	}
}

func FormatBytes(size int64) string {
	if size <= 0 {
		return "0 B"
	}

	units := []string{"B", "KB", "MB", "GB", "TB"}
	value := float64(size)
	unitIndex := 0
	for value >= 1024 && unitIndex < len(units)-1 {
		value /= 1024
		unitIndex++
	}

	if unitIndex == 0 {
		return fmt.Sprintf("%d %s", size, units[unitIndex])
	}
	return fmt.Sprintf("%.1f %s", value, units[unitIndex])
}

type ImageMeta struct {
	Distro   string
	Version  string
	Build    string
	Variant  string
	Arch     string
	Ext      string
	CodeName string
	VolumeID string
}

// Mapping Ubuntu major versions to codenames
var UbuntuCodenames = map[string]string{
	"26.04": "resolute",
	"24.04": "noble",
	"22.04": "jammy",
	"20.04": "focal",
}

// getCodename maps an Ubuntu version string to its codename, supporting precise minor version lookups.
func getCodename(version string) string {
	for prefix, codename := range UbuntuCodenames {
		if strings.HasPrefix(version, prefix) {
			return codename
		}
	}
	return "unknown"
}

// ubuntu-22.04.5-live-server-amd64.iso
// ParseImageName parses the ISO filename and extracts metadata
func NewImageMeta(filename string) (*ImageMeta, error) {
	base := filepath.Base(filename)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)

	parts := strings.Split(name, "-")
	if len(parts) < 5 {
		return nil, fmt.Errorf("unexpected ISO filename format: %s", filename)
	}

	imageMeta := &ImageMeta{
		Distro:   parts[0], // ubuntu
		Version:  parts[1], // 22.04.5
		Build:    parts[2], // live
		Variant:  parts[3], // server
		Arch:     parts[4], // amd64
		Ext:      ext,      // .iso
		CodeName: getCodename(parts[1]),
	}

	volumeID, err := readISOVolumeID(filename)
	if err != nil {
		logger.Warnf("failed to read ISO volume ID for %s: %v", filename, err)
	} else {
		imageMeta.VolumeID = volumeID
	}

	return imageMeta, nil
}

func readISOVolumeID(filename string) (string, error) {
	if _, err := exec.LookPath("xorriso"); err != nil {
		return "", fmt.Errorf("xorriso not found: %w", err)
	}

	cmd := exec.Command("xorriso", "-indev", filename, "-pvd_info")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to inspect ISO volume ID: %w: %s", err, strings.TrimSpace(string(output)))
	}

	for _, line := range strings.Split(string(output), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "Volume id") || strings.HasPrefix(trimmed, "Volume Id") {
			parts := strings.SplitN(trimmed, ":", 2)
			if len(parts) != 2 {
				continue
			}
			volumeID := strings.TrimSpace(parts[1])
			volumeID = strings.Trim(volumeID, "'\"")
			if volumeID != "" {
				return volumeID, nil
			}
		}
	}

	return "", fmt.Errorf("volume ID not found in xorriso output")
}
