package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/schollz/progressbar/v3"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

// downloadFile
func DownloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	size := resp.ContentLength

	bar := progressbar.NewOptions64(
		size,
		progressbar.OptionSetDescription("Downloading"),
		progressbar.OptionSetWidth(30),
		progressbar.OptionShowBytes(true),
		progressbar.OptionShowCount(),
		progressbar.OptionSetTheme(progressbar.Theme{
			Saucer:        "#",
			SaucerPadding: "-",
			BarStart:      "[",
			BarEnd:        "]",
		}),
	)

	_, err = io.Copy(out, io.TeeReader(resp.Body, bar))
	if err != nil {
		return err
	}

	fmt.Println("\nDownload complete")
	return nil
}

type ImageMeta struct {
	Distro   string
	Version  string
	Build    string
	Variant  string
	Arch     string
	Ext      string
	CodeName string
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

	//
	parts := strings.Split(name, "-")

	if len(parts) < 5 {
		return nil, fmt.Errorf("unexpected ISO filename format: %s", filename)
	}

	return &ImageMeta{
		Distro:   parts[0], // ubuntu
		Version:  parts[1], // 22.04.5
		Build:    parts[2], // live
		Variant:  parts[3], // server
		Arch:     parts[4], // amd64
		Ext:      ext,      // .iso
		CodeName: getCodename(parts[1]),
	}, nil
}
