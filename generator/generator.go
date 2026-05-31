package generator

import (
	"bytes"
	"compress/gzip"
	"crypto/md5"
	"encoding/base64"
	"fmt"
	"io"

	"github.com/lefeck/ubuntu-autoinstaller/cmd"
	"github.com/lefeck/ubuntu-autoinstaller/config"
	"github.com/lefeck/ubuntu-autoinstaller/logger"
	"github.com/lefeck/ubuntu-autoinstaller/utils"

	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"text/template"
	"time"
)

func (p Package) String() string {
	return string(p)
}

// PackageInfo describes required system packages and the primary command to check.
type PackageInfo struct {
	Packages []string // System package names
	Command  string   // Provided command used to check existence
}

type Package string

const (
	PackageXorriso  Package = "xorriso"
	PackageSed      Package = "sed"
	PackageCurl     Package = "curl"
	PackageGpg      Package = "gpg"
	Package7z       Package = "7z"
	PackageDpkgDev  Package = "dpkg-dev"
	PackageAptitude Package = "aptitude"
)

var packages = map[Package]PackageInfo{
	PackageXorriso: {
		Packages: []string{"xorriso", "isolinux", "binutils", "fakeroot"},
		Command:  "xorriso",
	},
	PackageSed: {
		Packages: []string{"sed"},
		Command:  "sed",
	},
	PackageCurl: {
		Packages: []string{"curl"},
		Command:  "curl",
	},
	PackageGpg: {
		Packages: []string{"gpg"},
		Command:  "gpg",
	},
	Package7z: {
		Packages: []string{"p7zip-full"},
		Command:  "7z",
	},
	PackageDpkgDev: {
		Packages: []string{"dpkg-dev"},
		Command:  "dpkg-scanpackages",
	},
	PackageAptitude: {
		Packages: []string{"aptitude"},
		Command:  "aptitude",
	},
}

// Generator orchestrates the ISO build workflow.
type Generator struct {
	executor *cmd.Executor
	Path     *utils.Path
}

// NewGenerator creates a Generator and prepares base directories.
// NewGenerator constructs a Generator and ensures base directories exist.
func NewGenerator(executor *cmd.Executor, rootDir string) (*Generator, error) {
	path := utils.NewPath(rootDir)
	// Prepare base directories
	dirs := []string{
		rootDir,
		path.DownloadDir(),
		path.BuildDir(),
		path.Mount(),
		path.Packages(),
		path.Scripts(),
	}

	// Create directories if not present
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, DefaultDirPerm); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}
	logger.Infof("Using temporary directory: %s", rootDir)
	return &Generator{
		executor: executor,
		Path:     path,
	}, nil
}

// isExistPackage checks if a package/command exists.
func (g *Generator) isExistPackage(command string) bool {
	_, err := exec.LookPath(command)
	return err == nil
}

// CheckNetwork checks network connection.
func (g *Generator) checkNetwork() error {
	logger.Info("Checking network connectivity...")
	_, _, err := g.executor.RunCmdWithAttempts(PingCmdTemplate, 3, 5*time.Second)
	if err != nil {
		logger.Errorf("Network connectivity check failed: %v", err)
		return fmt.Errorf("network connectivity check failed: %v", err)
	}
	logger.Info("Network connection is active")
	return nil
}

func (g *Generator) updateSource() error {
	logger.Info("Updating package list...")
	_, _, err := g.executor.RunCmdWithAttempts(AptUpdateCmdTemplate, 3, 5*time.Second)
	if err != nil {
		logger.Errorf("Failed to update package list: %v", err)
		return fmt.Errorf("Failed to update package list: %v", err)
	}
	return nil
}

func (g *Generator) ensurePackagesInstalled(pkg Package) error {
	info, ok := packages[pkg]
	if !ok {
		return fmt.Errorf("package %s not found", pkg)
	}
	if g.isExistPackage(info.Command) {
		logger.Infof("Command %s already exists, skip installation", info.Command)
		return nil
	}

	logger.Infof("Command %s not found, attempting to install", info.Command)

	if err := g.updateSource(); err != nil {
		return err
	}

	if err := g.checkNetwork(); err != nil {
		return err
	}

	var pkgs []string
	for _, name := range info.Packages {
		pkgs = append(pkgs, name)
	}
	if len(pkgs) > 0 {
		if err := g.installPackages(strings.Join(pkgs, " ")); err != nil {
			return err
		}
	}
	return nil
}

func (g *Generator) installPackages(pkgs string) error {
	logger.Infof("Installing packages: %s", pkgs)
	aptCmd := fmt.Sprintf(AptCmdTemplate, pkgs)
	_, _, err := g.executor.RunCmdWithAttempts(aptCmd, 3, 5*time.Second)
	if err != nil {
		logger.Errorf("Package installation failed for %s: %v", pkgs, err)
		return fmt.Errorf("installation of package %s failed: %v", pkgs, err)
	}

	logger.Infof("Successfully installed packages: %s", pkgs)
	return nil
}

// CheckPackages checks and installs necessary packages.
func (g *Generator) checkPackages(codename string) error {
	pkgs := []Package{
		PackageXorriso,
		PackageSed,
		PackageCurl,
		PackageGpg,
		Package7z,
		PackageDpkgDev,
		PackageAptitude,
	}
	for _, pkg := range pkgs {
		if err := g.ensurePackagesInstalled(pkg); err != nil {
			return err
		}
	}
	// Special check for focal release, like shell.
	if codename == "focal" {
		if _, err := os.Stat(ISOhdpfxPath); os.IsNotExist(err) {
			return fmt.Errorf("isolinux is not installed. On Ubuntu, install the 'isolinux' package")
		}
	}
	logger.Info("All necessary packages are installed successfully")
	return nil
}

// Preprocess combines creation and checks, similar to original shell.
func (g *Generator) Preprocess(codename string) error {
	return g.checkPackages(codename)
}

// PrepareEnvironment ensures required system packages are installed. Wrapper for Preprocess.
func (g *Generator) PrepareEnvironment(codename string) error {
	return g.Preprocess(codename)
}

// buildDownloadURL builds the Ubuntu release URL for the given codename.
func (g *Generator) buildDownloadURL(codename string) string {
	return DownloadURL + codename
}

// DownloadImage downloads the Ubuntu ISO page, resolves the filename and fetches the ISO.
func (gen *Generator) DownloadImage(codename string, gpgVerify bool) (imagepath string, err error) {
	url := gen.buildDownloadURL(codename)
	logger.Info("Checking for current release...")

	// Fetch release page and extract ISO filename
	logger.Infof("Fetching download page for Ubuntu %s...", codename)
	curlCmdTemplate := fmt.Sprintf(CurlCmdTemplate, codename)
	stdout, _, err := gen.executor.RunCmd(curlCmdTemplate)
	if err != nil {
		logger.Errorf("Failed to fetch download page: %v", err)
		return "", fmt.Errorf("failed to fetch download page: %w", err)
	}

	re := regexp.MustCompile(RegexISOName)
	matches := re.FindStringSubmatch(stdout)
	if len(matches) == 0 {
		return "", fmt.Errorf("no ISO file found on the download page")
	}
	fileName := matches[0] // 22.04.5-live-server-amd64.iso

	imagePath := gen.Path.DownloadFile(fileName) // /tmp/downloads/ubuntu-22.04.5-live-server-amd64.iso

	version := strings.SplitN(fileName, "-", 2)[1] // 22.04.5

	// Download if not exists, otherwise reuse local file
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		logger.Infof("Downloading ISO image for Ubuntu %s %s...", version, codename)
		downloadURL := fmt.Sprintf("%s/%s", url, fileName)
		if err := utils.DownloadFile(downloadURL, imagePath); err != nil {
			return "", fmt.Errorf("failed to download ISO: %w", err)
		}
		logger.Infof("Downloaded and saved to %s", imagePath)
	} else {
		logger.Infof("Using existing %s file", imagePath)
		if gpgVerify {
			downloadDir := gen.Path.DownloadDir()
			if imagePath != filepath.Join(downloadDir, fileName) {
				logger.Warn("Automatic GPG verification is enabled. If the source ISO file is not the latest daily or release image, verification will fail!")
			}
		}
	}
	return imagePath, nil
}

// DownloadISOImage is a clearer alias for DownloadImage.
func (gen *Generator) DownloadISOImage(codename string, gpgVerify bool) (string, error) {
	return gen.DownloadImage(codename, gpgVerify)
}

// VerifyISO verifies ISO using downloaded SHA256SUMS and Ubuntu signing keys.
func (gen *Generator) VerifyISO(gpgVerify bool, sourceISO string, codename string) error {
	if !gpgVerify {
		logger.Info("Skipping verification of source ISO")
		return nil
	}

	shaSuffix := time.Now().Format("20060102150405")
	shaSumsFile := gen.Path.Sha256SumsFile(shaSuffix)
	shaSumsGPGFile := gen.Path.Sha256SumsGPGFile(shaSuffix)
	keyringFile := gen.Path.KeyringFile(UbuntuGPGKeyID)

	// Build base URL for the selected codename
	baseURL := gen.buildDownloadURL(codename)

	// Download SHA256SUMS and SHA256SUMS.gpg
	if err := gen.downloadSHA256Files(baseURL, shaSumsFile, shaSumsGPGFile); err != nil {
		return err
	}

	// Download Ubuntu signing key (to custom keyring)
	if err := gen.downloadSigningKey(keyringFile); err != nil {
		return err
	}

	// Verify GPG signature for SHA256SUMS file
	if err := gen.verifyGPGSignature(keyringFile, shaSumsGPGFile, shaSumsFile); err != nil {
		return err
	}

	// Compute SHA256 for the ISO file
	digest, err := utils.CalculateSHA256(sourceISO)
	if err != nil {
		return fmt.Errorf("failed to calculate SHA256 digest: %w", err)
	}

	// Validate SHA256 against SHA256SUMS
	if err := gen.verifySHA256Checksum(shaSumsFile, digest); err != nil {
		return err
	}

	logger.Info("Verification succeeded")
	return nil
}

// downloadSHA256Files downloads SHA256SUMS and SHA256SUMS.gpg to the download directory.
func (g *Generator) downloadSHA256Files(baseURL, shaSumsFile, shaSumsGPGFile string) error {
	if _, err := os.Stat(shaSumsFile); os.IsNotExist(err) {
		logger.Info("Downloading SHA256SUMS & SHA256SUMS.gpg files...")
		// Must use the same directory as ISO
		logger.Infof("Downloading SHA256SUMS from: %s/SHA256SUMS", baseURL)
		if err := utils.DownloadFile(fmt.Sprintf("%s/SHA256SUMS", baseURL), shaSumsFile); err != nil {
			return fmt.Errorf("failed to download SHA256SUMS: %w", err)
		}
		logger.Infof("Downloading SHA256SUMS.gpg from: %s/SHA256SUMS.gpg", baseURL)
		if err := utils.DownloadFile(fmt.Sprintf("%s/SHA256SUMS.gpg", baseURL), shaSumsGPGFile); err != nil {
			return fmt.Errorf("failed to download SHA256SUMS.gpg: %w", err)
		}
	} else {
		logger.Infof("Using existing SHA256SUMS & SHA256SUMS.gpg files")
	}
	return nil
}

// downloadSigningKey downloads the Ubuntu signing key to a local keyring file.
func (g *Generator) downloadSigningKey(keyringFile string) error {
	if _, err := os.Stat(keyringFile); os.IsNotExist(err) {
		logger.Info("Downloading and saving Ubuntu signing key...")
		gpgRecvKeyCmdTemplate := fmt.Sprintf(GpgRecvKeyCmdTemplate, keyringFile, UbuntuGPGKeyID)
		_, _, err := g.executor.RunCmd(gpgRecvKeyCmdTemplate)
		if err != nil {
			logger.Errorf("Failed to download Ubuntu signing key: %v", err)
			return fmt.Errorf("failed to download Ubuntu signing key: %w", err)
		}
		logger.Infof("Successfully downloaded and saved Ubuntu signing key to %s", keyringFile)
	} else {
		logger.Infof("Using existing Ubuntu signing key saved in %s", keyringFile)
	}
	return nil
}

// verifyGPGSignature verifies the SHA256SUMS.gpg signature against the keyring.
func (g *Generator) verifyGPGSignature(keyringFile, shaSumsGPGFile, shaSumsFile string) error {
	logger.Infof("Verifying integrity and authenticity...")
	logger.Infof("GPG command: gpg --keyring %s --verify %s %s", keyringFile, shaSumsGPGFile, shaSumsFile)

	// Ensure required files exist
	if _, err := os.Stat(keyringFile); os.IsNotExist(err) {
		return fmt.Errorf("keyring file not found: %s", keyringFile)
	}
	if _, err := os.Stat(shaSumsGPGFile); os.IsNotExist(err) {
		return fmt.Errorf("SHA256SUMS.gpg file not found: %s", shaSumsGPGFile)
	}
	if _, err := os.Stat(shaSumsFile); os.IsNotExist(err) {
		return fmt.Errorf("SHA256SUMS file not found: %s", shaSumsFile)
	}

	gpgVerifyCmdTemplate := fmt.Sprintf(GpgVerifyCmdTemplate, keyringFile, shaSumsGPGFile, shaSumsFile)
	_, stderr, err := g.executor.RunCmd(gpgVerifyCmdTemplate)
	if err != nil {
		logger.Errorf("GPG signature verification failed: %v", err)
		logger.Errorf("GPG stderr output: %s", stderr)
		// Clean temporary keyring if present
		tempKeyringFile := fmt.Sprintf("%s~", keyringFile)
		if _, statErr := os.Stat(tempKeyringFile); statErr == nil {
			if rmErr := os.Remove(tempKeyringFile); rmErr != nil {
				logger.Warnf("Failed to remove temporary keyring file %s: %v", tempKeyringFile, rmErr)
			}
		}
		return fmt.Errorf("verification of SHA256SUMS signature failed: %v, stderr: %s", err, stderr)
	}

	logger.Info("GPG signature verification completed successfully")

	// Clean temporary keyring if present
	tempKeyringFile := fmt.Sprintf("%s~", keyringFile)
	if _, statErr := os.Stat(tempKeyringFile); statErr == nil {
		if rmErr := os.Remove(tempKeyringFile); rmErr != nil {
			logger.Warnf("Failed to remove temporary keyring file %s: %v", tempKeyringFile, rmErr)
		}
	}
	return nil
}

// verifySHA256Checksum checks if a SHA256 digest exists within SHA256SUMS.
func (g *Generator) verifySHA256Checksum(shaSumsFile, digest string) error {
	shaSums, err := os.ReadFile(shaSumsFile)
	if err != nil {
		return fmt.Errorf("failed to read SHA256SUMS file: %w", err)
	}
	if !bytes.Contains(shaSums, []byte(digest)) {
		return fmt.Errorf("verification of ISO digest failed")
	}
	return nil
}

// ISO extraction

// ExtractISO extracts ISO contents into the build directory and fixes permissions.
func (gen *Generator) ExtractISO(codename string, sourceISO string) error {
	buildDir := gen.Path.BuildDir()
	boot := gen.Path.Boot()
	packagesDir := gen.Path.Packages()
	scriptsDir := gen.Path.Scripts()

	logger.Info("Extracting ISO image...")

	// Preserve user-created directories under mnt before cleaning build dir
	// These directories are created by the user via Embedded Files feature
	// and should not be deleted during ISO extraction
	packagesFiles := make(map[string][]byte)
	scriptsFiles := make(map[string][]byte)

	// Backup packages directory contents
	if err := backupDirContents(packagesDir, packagesFiles); err != nil {
		logger.Warnf("Failed to backup packages directory: %v", err)
	}

	// Backup scripts directory contents
	if err := backupDirContents(scriptsDir, scriptsFiles); err != nil {
		logger.Warnf("Failed to backup scripts directory: %v", err)
	}

	// Clean up build directory before extraction to ensure fresh state
	if err := os.RemoveAll(buildDir); err != nil {
		logger.Warnf("Failed to clean build directory: %v", err)
	}
	if err := os.MkdirAll(buildDir, DefaultDirPerm); err != nil {
		return fmt.Errorf("failed to create build directory: %w", err)
	}

	// Restore the preserved directories (mnt/packages, mnt/script)
	if err := os.MkdirAll(packagesDir, DefaultDirPerm); err != nil {
		return fmt.Errorf("failed to create packages directory: %w", err)
	}
	if err := os.MkdirAll(scriptsDir, DefaultDirPerm); err != nil {
		return fmt.Errorf("failed to create scripts directory: %w", err)
	}

	// Restore backed up files
	if err := restoreDirContents(packagesDir, packagesFiles); err != nil {
		logger.Warnf("Failed to restore packages directory: %v", err)
	}
	if err := restoreDirContents(scriptsDir, scriptsFiles); err != nil {
		logger.Warnf("Failed to restore scripts directory: %v", err)
	}

	// Choose extractor by codename
	if err := gen.extractISOImage(codename, sourceISO); err != nil {
		return err
	}
	// Cleanup and move boot artifacts
	if err := gen.cleanupAndMoveFiles(codename, boot); err != nil {
		return err
	}
	// Fix permissions under build dir
	if err := gen.adjustPermissions(); err != nil {
		return err
	}

	logger.Infof("Extracted to %s", buildDir)
	return nil
}

// backupDirContents recursively reads all files under srcDir and stores them in the backup map.
// Keys are relative paths from srcDir.
func backupDirContents(srcDir string, backup map[string][]byte) error {
	if _, err := os.Stat(srcDir); os.IsNotExist(err) {
		return nil
	}
	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		backup[relPath] = data
		return nil
	})
}

// restoreDirContents writes all files from the backup map into destDir.
func restoreDirContents(destDir string, backup map[string][]byte) error {
	for relPath, data := range backup {
		targetPath := filepath.Join(destDir, relPath)
		parentDir := filepath.Dir(targetPath)
		if err := os.MkdirAll(parentDir, DefaultDirPerm); err != nil {
			return err
		}
		if err := os.WriteFile(targetPath, data, DefaultFilePerm); err != nil {
			return err
		}
	}
	return nil
}

// extractISOImage selects xorriso or 7z to extract based on codename.
func (g *Generator) extractISOImage(codename string, sourceISO string) error {
	buidDir := g.Path.BuildDir()
	switch codename {
	case "focal":
		logger.Info("Extracting ISO using xorriso...")
		xorrisoCmd := fmt.Sprintf(XorrisoCmdTemplate, sourceISO, buidDir)
		_, _, err := g.executor.RunCmd(xorrisoCmd)
		if err != nil {
			logger.Errorf("Failed to extract ISO using xorriso: %v", err)
			return fmt.Errorf("failed to extract ISO image using xorriso: %w", err)
		}
		logger.Info("Successfully extracted ISO using xorriso")
	default:
		logger.Info("Extracting ISO using 7z...")
		s7zCmd := fmt.Sprintf(S7zCmdTemplate, sourceISO, buidDir)
		fmt.Println(s7zCmd)
		_, _, err := g.executor.RunCmd(s7zCmd)
		if err != nil {
			logger.Errorf("Failed to extract ISO using 7z: %v", err)
			return fmt.Errorf("failed to extract ISO image using 7z: %w", err)
		}
		logger.Info("Successfully extracted ISO using 7z")
	}
	return nil
}

// cleanupAndMoveFiles removes unwanted dirs and moves [BOOT] to BOOT when required.
func (gen *Generator) cleanupAndMoveFiles(codename string, boot string) error {
	bootISO := gen.Path.BootISO()
	switch codename {
	case "focal":
		if err := os.RemoveAll(bootISO); err != nil {
			return fmt.Errorf("failed to remove [BOOT] directory: %w", err)
		}
	default:
		// Remove existing boot dir if present
		if _, err := os.Stat(boot); err == nil {
			if err := os.RemoveAll(boot); err != nil {
				return fmt.Errorf("failed to remove bootdir: %w", err)
			}
		}
		if _, err := os.Stat(bootISO); !os.IsNotExist(err) {
			logger.Infof("Moving [BOOT] from %s to %s", bootISO, boot)
			if err := os.Rename(bootISO, boot); err != nil {
				return fmt.Errorf("failed to move [BOOT] to bootDir: %w", err)
			}
		}
	}
	return nil
}

// adjustPermissions sets DefaultDirPerm recursively for build dir.
func (gen *Generator) adjustPermissions() error {
	buildDir := gen.Path.BuildDir()
	if err := os.Chmod(buildDir, DefaultDirPerm); err != nil {
		return fmt.Errorf("failed to change permissions of tmpDir: %w", err)
	}
	if err := filepath.Walk(buildDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return os.Chmod(path, DefaultDirPerm)
	}); err != nil {
		return fmt.Errorf("failed to recursively change permissions: %w", err)
	}
	return nil
}

// RepackageISOImage rebuilds ISO using xorriso templates appropriate for codename.
func (gen *Generator) RepackageISOImage(codename string, destinationISO string) error {
	logger.Info("Repackaging extracted files into an ISO image...")

	// Ensure destination has .iso extension
	if filepath.Ext(destinationISO) != ".iso" {
		return fmt.Errorf("verification of iso image format failed")
	}

	buildDir := gen.Path.BuildDir()
	// Change into build directory while running xorriso
	restore, err := changeDir(buildDir)
	if err != nil {
		return err
	}
	defer restore()

	destinationISOFile := gen.Path.DownloadFile(destinationISO)
	// Generate final ISO label
	isoName, err := gen.generateISOName(codename)
	if err != nil {
		return fmt.Errorf("failed to generate ISO name: %w", err)
	}

	// Build xorriso command from templates
	cmdStr, err := gen.buildXorrisoCommand(codename, isoName, destinationISOFile)
	if err != nil {
		return fmt.Errorf("failed to build xorriso command: %w", err)
	}

	// Execute xorriso
	logger.Info("Executing xorriso to create final ISO...")
	_, _, err = gen.executor.RunCmd(cmdStr)
	if err != nil {
		logger.Errorf("xorriso command failed: %v", err)
		return err
	}

	logger.Infof("Successfully repackaged into ISO: %s", destinationISO)
	return nil
}

// generateISOName generates the ISO name based on the codename.
func (gen *Generator) generateISOName(codename string) (string, error) {
	var isoName bytes.Buffer
	data := map[string]string{"codename": codename}
	if err := NameTemplate.Execute(&isoName, data); err != nil {
		return "", err
	}
	return isoName.String(), nil
}

// buildXorrisoCommand builds the xorriso command based on the codename.
func (gen *Generator) buildXorrisoCommand(codename, isoName, destinationISOFile string) (string, error) {
	var cmdBuilder bytes.Buffer
	data := map[string]string{
		"Label":  isoName,
		"Output": destinationISOFile,
	}

	var tmpl *template.Template
	if codename == "focal" {
		tmpl = XorrisoCmdUbuntu2004Template
	} else {
		tmpl = XorrisoCmdUbuntu2204Template
	}

	if err := tmpl.Execute(&cmdBuilder, data); err != nil {
		return "", err
	}

	return cmdBuilder.String(), nil
}

// CleanUp deletes the build directory tree.
func (gen *Generator) CleanUp() error {
	buildDir := gen.Path.BuildDir()
	if err := os.RemoveAll(buildDir); err != nil {
		logger.Warnf("Failed to clean up temporary directory %s: %v", buildDir, err)
		return fmt.Errorf("Failed to clean up temporary directory: %v", err)
	}
	logger.Infof("Successfully cleaned up temporary directory: %s", buildDir)
	return nil
}

// AddConfigData adds meta-data file and updates GRUB/txt configs to use NoCloud datasource.
func (gen *Generator) AddConfigData(codename string) error {
	buildDir := gen.Path.BuildDir()
	logger.Info("Adding user-data and meta-data files...")

	// Create empty meta-data file
	if err := touchFile(filepath.Join(buildDir, MetaDataFile)); err != nil {
		return fmt.Errorf("failed to create meta-data: %w", err)
	}

	// Update GRUB config
	grubCfgPath := filepath.Join(buildDir, GrubConfigPath)
	if err := modifyGrubConfig(grubCfgPath, GrubInsertText); err != nil {
		return fmt.Errorf("failed to modify grub.cfg: %w", err)
	}

	// For focal, also update txt.cfg and loopback.cfg
	if codename == "focal" {
		txtCfgPath := filepath.Join(buildDir, TxtConfigPath)
		if err := modifyGrubConfig(txtCfgPath, ISOLinuxInsertText); err != nil {
			return fmt.Errorf("failed to modify txt.cfg: %w", err)
		}
		loopbackCfgPath := filepath.Join(buildDir, LoopBackConfigPath)
		if err := modifyGrubConfig(loopbackCfgPath, GrubInsertText); err != nil {
			return fmt.Errorf("failed to modify loopback.cfg: %w", err)
		}
	}
	logger.Info("Added data and configured kernel command line")
	return nil
}

// InjectNoCloudConfig is an alias for AddConfigData.
func (gen *Generator) InjectNoCloudConfig(codename string) error {
	return gen.AddConfigData(codename)
}

// InjectEmbeddedFiles writes custom user files into the ISO under build/mnt/<path>.
// Files are placed under /mnt/ in the ISO root directory so they are accessible
// via /mnt/<path> during early-commands and late-commands execution.
func (gen *Generator) InjectEmbeddedFiles(files []config.EmbeddedFile) error {
	if len(files) == 0 {
		logger.Info("No embedded files to inject, skipping")
		return nil
	}

	logger.Infof("Injecting %d embedded file(s) into ISO...", len(files))

	for _, f := range files {
		// Build absolute target path: <builddir>/mnt/<path>
		targetPath := filepath.Join(gen.Path.Mount(), f.Path)

		// Create parent directories if they don't exist
		parentDir := filepath.Dir(targetPath)
		if err := os.MkdirAll(parentDir, DefaultDirPerm); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", parentDir, err)
		}

		// Decode content if base64 encoded
		var fileContent []byte
		if f.Encoding == "base64" {
			decoded, err := base64.StdEncoding.DecodeString(f.Content)
			if err != nil {
				return fmt.Errorf("failed to base64-decode content for %s: %w", f.Path, err)
			}
			fileContent = decoded
		} else {
			// Default to text mode
			fileContent = []byte(f.Content)
		}

		// Write file content
		if err := os.WriteFile(targetPath, fileContent, DefaultFilePerm); err != nil {
			return fmt.Errorf("failed to write file %s: %w", f.Path, err)
		}

		// Set file permission (default to 0644 if not specified)
		permStr := f.Permission
		if permStr == "" {
			permStr = "0644"
		}
		var perm os.FileMode
		if _, err := fmt.Sscanf(permStr, "%o", &perm); err != nil {
			perm = 0644
		}
		if err := os.Chmod(targetPath, perm); err != nil {
			return fmt.Errorf("failed to set permissions on %s: %w", f.Path, err)
		}

		logger.Infof("  injected: %s (perm=%s, encoding=%s, size=%d bytes)", f.Path, permStr, f.Encoding, len(fileContent))
	}

	logger.Info("Successfully injected all embedded files")
	return nil
}

// DownloadAndPreparePackages downloads packages, builds a local repo and creates install script.
func (g *Generator) DownloadAndPreparePackages(packages []string) error {
	if len(packages) == 0 {
		return nil
	}
	logger.Info("Adding config-data files...")

	// Normalize package names list
	pkgs, err := g.parsePackageFile(packages)
	if err != nil {
		return err
	}

	// Download packages
	if err := g.downloadPackages(pkgs); err != nil {
		return err
	}

	// Build local repo index files (Packages/Packages.gz)
	if err := g.generateLocalRepoIndex(); err != nil {
		return err
	}
	logger.Info("Building local dependency packages")

	// Create installation script
	if err := g.createInstallationScript(pkgs); err != nil {
		return err
	}
	logger.Info("Building local dependency packages to write script automatic execution")

	return nil
}

// PrepareLocalPackagesRepo is an alias for DownloadAndPreparePackages.
func (g *Generator) PrepareLocalPackagesRepo(packages []string) error {
	return g.DownloadAndPreparePackages(packages)
}

// parsePackageFile trims whitespace and removes comments/empty lines.
func (gen *Generator) parsePackageFile(packages []string) ([]string, error) {
	var pkgs []string
	for _, line := range packages {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			pkgs = append(pkgs, line)
		}
	}
	return pkgs, nil
}

// downloadPackages downloads all specified packages and moves .deb files.
func (gen *Generator) downloadPackages(packages []string) error {
	pkgDir := gen.Path.Packages()
	for _, pkg := range packages {
		logger.Infof("Downloading and saving packages %s", pkg)
		if err := gen.downloadPackage(pkgDir, pkg); err != nil {
			return fmt.Errorf("failed to download package %s: %w", pkg, err)
		}
		logger.Infof("Downloaded and saved all packages to %s/%s", pkgDir, pkg)
	}
	return nil
}

// generateLocalRepoIndex generates local APT repository index files.
func (gen *Generator) generateLocalRepoIndex() error {

	if err := gen.buildPackagesIndex(); err != nil {
		return fmt.Errorf("failed to generate package index: %w", err)
	}
	return nil
}

// createInstallationScript writes a shell script that installs the packages.
func (gen *Generator) createInstallationScript(packages []string) error {
	scriptFile := gen.Path.ScriptFile(ScriptFileName)

	if err := createInstallScript(scriptFile, packages); err != nil {
		return fmt.Errorf("failed to create install script: %w", err)
	}

	// Make script executable
	if err := os.Chmod(scriptFile, DefaultDirPerm); err != nil {
		return fmt.Errorf("failed to set script permissions: %w", err)
	}

	return nil
}

func touchFile(path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	return f.Close()
}

func modifyGrubConfig(path string, insertText string) error {
	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil // Skip if file does not exist
	} else if err != nil {
		return fmt.Errorf("failed to stat file %s: %w", filepath.Base(path), err)
	}

	// Read file content
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", filepath.Base(path), err)
	}

	// Split content into lines
	lines := strings.Split(string(content), "\n")
	modified := false

	for i, line := range lines {
		if line == "" {
			continue
		}

		// Preserve original leading indentation (spaces/tabs)
		leadingTrimmed := strings.TrimLeft(line, " \t")
		indent := line[:len(line)-len(leadingTrimmed)]

		// Normalize matcher line without altering original content
		trimmedLine := leadingTrimmed

		// Handle only "append" or "linux" lines ending with "---" (skip linux16)
		if (strings.HasPrefix(trimmedLine, "append") || strings.HasPrefix(trimmedLine, "linux")) && strings.HasSuffix(strings.TrimRight(line, " \t"), "---") {
			// Check if autoinstall is already present
			if !strings.Contains(line, "autoinstall") {
				// Remove trailing "---" temporarily
				baseLine := strings.TrimSpace(strings.TrimSuffix(strings.TrimRight(line, " \t"), "---"))
				// Find the position after "quiet"
				parts := strings.Fields(baseLine) // Split into words (collapses inner spaces)
				var newParts []string
				quietFound := false

				for _, part := range parts {
					newParts = append(newParts, part)
					if part == "quiet" {
						quietFound = true
						// Insert autoinstall params after "quiet"
						newParts = append(newParts, insertText)
					}
				}

				// If "quiet" is not found, append at the end
				if !quietFound && len(parts) > 0 {
					newParts = append(newParts, insertText)
				}

				// Reconstruct the line with "---"
				newLine := indent + strings.Join(newParts, " ") + " ---"
				lines[i] = newLine
				modified = true
			}
		}
	}

	// If no modification, return early
	if !modified {
		return nil
	}

	// Join lines back and write to file
	newContent := []byte(strings.Join(lines, "\n"))
	if err := os.WriteFile(path, newContent, GrubFilePerm); err != nil {
		return fmt.Errorf("failed to write file %s: %w", filepath.Base(path), err)
	}
	return nil
}

// downloadPackage is the main entry for downloading a package and its dependencies
func (g *Generator) downloadPackage(destDir, pkg string) error {
	// Step 1: Resolve dependencies
	deps, err := g.resolveDependencies(pkg)
	if err != nil {
		return err
	}
	if len(deps) == 0 {
		logger.Warnf("No dependencies found for %s", pkg)
		return nil
	}

	// Step 2: Download dependencies
	g.downloadDependencies(deps)

	// Step 3: Move .deb files into the target directory
	if err := moveDebFiles(destDir); err != nil {
		return fmt.Errorf("failed to move deb files for %s: %w", pkg, err)
	}

	return nil
}

// resolveDependencies resolves package dependencies using apt-cache, and falls back to aptitude if needed.
func (g *Generator) resolveDependencies(pkg string) ([]string, error) {
	logger.Infof("Resolving dependencies for package: %s", pkg)
	// Try apt-cache first
	aptCacheCmd := fmt.Sprintf(AptCacheDependsCmdTemplate, pkg)
	out, _, err := g.executor.RunCmd(aptCacheCmd)
	if err != nil || strings.TrimSpace(out) == "" {
		// Fallback: aptitude
		logger.Infof("apt-cache failed, trying aptitude for package: %s", pkg)
		fallbackCmd := fmt.Sprintf(AptitudeShowCmd, pkg)
		out, _, err = g.executor.RunCmd(fallbackCmd)
		if err != nil {
			logger.Errorf("Failed to resolve dependencies for %s: %v", pkg, err)
			return nil, fmt.Errorf("failed to resolve dependencies for %s: %w", pkg, err)
		}
	}

	// Parse and filter dependencies
	deps := filterDependencies(out)
	logger.Infof("Resolved %d dependencies for package: %s", len(deps), pkg)
	return deps, nil
}

// filterDependencies parses the raw command output and extracts valid dependencies.
func filterDependencies(raw string) []string {
	lines := strings.Split(raw, "\n")
	var deps []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if DepLineRegex.MatchString(line) && !strings.Contains(line, ExcludeKeyword) {
			deps = append(deps, line)
		}
	}
	return deps
}

// downloadDependencies downloads each dependency using apt-get.
func (g *Generator) downloadDependencies(deps []string) {
	logger.Infof("Downloading %d dependencies...", len(deps))
	for _, dep := range deps {
		downloadCmd := fmt.Sprintf(AptGetDownloadCmd, dep)
		_, _, err := g.executor.RunCmd(downloadCmd)
		if err != nil {
			logger.Warnf("Failed to download dependency %s: %v", dep, err)
			continue
		}
		logger.Infof("Successfully downloaded dependency: %s", dep)
	}
	logger.Info("Completed downloading dependencies")
}

func moveDebFiles(destDir string) error {
	files, err := filepath.Glob(DebFilePattern)
	if err != nil {
		return err
	}
	for _, file := range files {
		if err := os.Rename(file, filepath.Join(destDir, filepath.Base(file))); err != nil {
			return err
		}
	}
	return nil
}

// ChangeDir  changes the current working directory.
func changeDir(dir string) (func(), error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("getwd failed: %w", err)
	}

	if err := os.Chdir(dir); err != nil {
		return nil, fmt.Errorf("chdir to %s failed: %w", dir, err)
	}

	return func() {
		if err := os.Chdir(cwd); err != nil {
			logger.Warnf("failed to revert to original directory: %v", err)
		}
	}, nil
}

func (gen *Generator) buildPackagesIndex() error {
	logger.Info("Building local package repository index...")

	// switch to dir
	packagesDir := gen.Path.Packages()
	restore, err := changeDir(packagesDir)
	if err != nil {
		return err
	}
	defer restore()

	logger.Info("Running dpkg-scanpackages to generate package index...")
	stdout, _, err := gen.executor.RunCmd(DpkgScanpackagesCmdTemplate)
	if err != nil {
		logger.Errorf("dpkg-scanpackages failed: %v", err)
		return fmt.Errorf("dpkg-scanpackages error: %v", err)
	}

	pkgFile := "Packages"
	if err = os.WriteFile(pkgFile, []byte(stdout), 0644); err != nil {
		logger.Errorf("Failed to write Packages file: %v", err)
		return fmt.Errorf("write Packages failed: %w", err)
	}

	// Compress to Packages.gz
	logger.Info("Compressing package index to Packages.gz...")
	if err = writeGzip(pkgFile, "Packages.gz"); err != nil {
		logger.Errorf("Failed to compress package index: %v", err)
		return fmt.Errorf("gzip failed: %w", err)
	}

	logger.Info("Successfully built local package repository index")
	return nil
}

// writeGzip compresses a file into gzip format.
func writeGzip(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	gw, err := gzip.NewWriterLevel(out, gzip.BestCompression)
	if err != nil {
		return err
	}
	if _, err := gw.Write(data); err != nil {
		return err
	}
	return gw.Close()
}

func createInstallScript(path string, packages []string) error {
	t, err := template.New("install-script").Parse(ShellTemplate)
	if err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return t.Execute(f, packages)
}

// calculateMD5 computes the MD5 checksum of a file.
func calculateMD5(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// updateMD5SumFile upserts the md5sum entry for a given file.
func updateMD5SumFile(md5sumPath, filePath, md5 string) error {
	// Read existing content
	content, err := os.ReadFile(md5sumPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	// Prepare new content
	newLine := fmt.Sprintf("%s  %s", md5, filePath)
	lines := []string{newLine}
	if len(content) > 0 {
		existingLines := strings.Split(string(content), "\n")
		for _, line := range existingLines {
			if line != "" && !strings.Contains(line, filePath) {
				lines = append(lines, line)
			}
		}
	}

	// Write updated content
	return os.WriteFile(md5sumPath, []byte(strings.Join(lines, "\n")), 0644)
}

func addAutoinstallParameter(filePath string) error {
	// Skip if file does not exist
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil // file not found, skip
	}

	// Read file content
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	// Only inject if not already present
	if !bytes.Contains(content, []byte(AutoInstallKeyword)) {
		// Replace '---' with the injection string
		newContent := bytes.Replace(content, []byte(GrubReplaceMarker), []byte(AutoInstallInject), -1)
		if err := os.WriteFile(filePath, newContent, DefaultFilePerm); err != nil {
			return err
		}
	}

	return nil
}

// UpdateMD5ForGrubFile updates or clears MD5 entries for grub files.
func (gen *Generator) UpdateMD5ForGrubFile(codename string, md5CheckSum bool) error {
	md5SumPath := gen.Path.MD5SumFile(MD5SumFile)
	grubConfigPath := gen.Path.GrubConfigFile(GrubConfigPath)
	loopBackConfigPath := gen.Path.LoopBackConfigFile(LoopBackConfigPath)

	if md5CheckSum {
		logger.Info("Updating md5sum.txt with hashes of modified files...")

		// Calculate MD5 for grub.cfg
		grubMD5, err := calculateMD5(grubConfigPath)
		if err != nil {
			return fmt.Errorf("failed to calculate MD5 for grub.cfg: %w", err)
		}

		// Update md5sum.txt entry for grub.cfg
		if err := updateMD5SumFile(md5SumPath, GrubConfigPath, grubMD5); err != nil {
			return fmt.Errorf("failed to update md5sum.txt for grub.cfg: %w", err)
		}

		// For focal, also handle loopback.cfg
		if codename == "focal" {
			loopBackMD5, err := calculateMD5(loopBackConfigPath)
			if err != nil {
				return fmt.Errorf("failed to calculate MD5 for loopback.cfg: %w", err)
			}
			if err := updateMD5SumFile(md5SumPath, LoopBackConfigPath, loopBackMD5); err != nil {
				return fmt.Errorf("failed to update md5sum.txt for loopback.cfg: %w", err)
			}
		}
		logger.Info("Updated hashes")
	} else {
		logger.Info("Clearing MD5 hashes...")
		// Ensure file exists before truncation
		if _, err := os.Stat(md5SumPath); os.IsNotExist(err) {
			if err := os.WriteFile(md5SumPath, []byte{}, 0644); err != nil {
				return fmt.Errorf("failed to create md5sum.txt: %w", err)
			}
		}
		if err := os.Truncate(md5SumPath, 0); err != nil {
			return fmt.Errorf("failed to clear md5sum.txt: %w", err)
		}
		logger.Info("Cleared hashes")
	}

	return nil
}

// UpdateGrubMD5Sums is an alias for UpdateMD5ForGrubFile.
func (gen *Generator) UpdateGrubMD5Sums(codename string, md5CheckSum bool) error {
	return gen.UpdateMD5ForGrubFile(codename, md5CheckSum)
}

// AddAutoinstallParameterToKernel injects autoinstall into kernel command lines.
func (gen *Generator) AddAutoinstallParameterToKernel(codename string) error {
	logger.Info("Adding autoinstall parameter to kernel command line...")

	// Paths to GRUB and related config files
	grubConfigPath := gen.Path.GrubConfigFile(GrubConfigPath)
	loopBackConfigPath := gen.Path.LoopBackConfigFile(LoopBackConfigPath)
	txtConfigPath := gen.Path.TxtConfigFile(TxtConfigPath)

	if err := addAutoinstallParameter(grubConfigPath); err != nil {
		return fmt.Errorf("failed to modify grub.cfg: %w", err)
	}

	// For focal, also update loopback.cfg and txt.cfg
	if codename == "focal" {

		if err := addAutoinstallParameter(loopBackConfigPath); err != nil {
			return fmt.Errorf("failed to modify loopback.cfg: %w", err)
		}

		if err := addAutoinstallParameter(txtConfigPath); err != nil {
			return fmt.Errorf("failed to modify txt.cfg: %w", err)
		}
	}
	logger.Info("Added parameter to UEFI and BIOS kernel command lines")
	return nil
}

// AddAutoinstallKernelParams is an alias for AddAutoinstallParameterToKernel.
func (gen *Generator) AddAutoinstallKernelParams(codename string) error {
	return gen.AddAutoinstallParameterToKernel(codename)
}

// ConfigureHWEKernel switches to HWE kernel/initrd if available and requested.
func (gen *Generator) ConfigureHWEKernel(codename string, useHWEKernel bool) error {
	if useHWEKernel {
		grubConfigPath := gen.Path.GrubConfigFile(GrubConfigPath)
		txtConfigPath := gen.Path.TxtConfigFile(TxtConfigPath)
		loopBackConfigPath := gen.Path.LoopBackConfigFile(LoopBackConfigPath)
		// Ensure HWE kernel is supported by the source ISO
		if _, err := os.Stat(grubConfigPath); os.IsNotExist(err) {
			logger.Warn("This source ISO does not support the HWE kernel. Proceeding with the regular kernel")
			return nil
		}

		// Read grub.cfg contents
		content, err := os.ReadFile(grubConfigPath)
		if err != nil {
			return fmt.Errorf("failed to read grub.cfg: %w", err)
		}
		if !bytes.Contains(content, []byte("hwe-vmlinuz")) {
			logger.Warn("This source ISO does not support the HWE kernel. Proceeding with the regular kernel")
			return nil
		}

		logger.Info("Destination ISO will use HWE kernel")

		// Replace kernel and initrd paths with HWE counterparts

		newContent := bytes.Replace(content, []byte(KernelFile), []byte(HWEKernelFile), -1)
		newContent = bytes.Replace(newContent, []byte(InitrdFile), []byte(HWEInitrdFile), -1)

		if err := os.WriteFile(grubConfigPath, newContent, 0644); err != nil {
			return fmt.Errorf("failed to update grub.cfg: %w", err)
		}

		// For focal, also update txt.cfg and loopback.cfg
		if codename == "focal" {
			if err := updateHWEConfig(txtConfigPath); err != nil {
				return fmt.Errorf("failed to update txt.cfg: %w", err)
			}
			if err := updateHWEConfig(loopBackConfigPath); err != nil {
				return fmt.Errorf("failed to update loopback.cfg: %w", err)
			}
		}
	}
	return nil
}

// updateHWEConfig updates kernel/initrd paths in the target file for HWE.
func updateHWEConfig(filePath string) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	newContent := bytes.Replace(content, []byte(KernelFile), []byte(HWEKernelFile), -1)
	newContent = bytes.Replace(newContent, []byte(InitrdFile), []byte(HWEInitrdFile), -1)
	return os.WriteFile(filePath, newContent, 0644)
}

// Cleanup removes temporary files and directories.
func (gen *Generator) Cleanup() error {
	return os.RemoveAll(gen.Path.RootDir)
}
