package generator

import (
	"regexp"
)

const (

	// Global constants
	UbuntuGPGKeyID = "843938DF228D22F7B3742BC0D94AA3F0EFE21092"
	DownloadURL    = "https://releases.ubuntu.com/"

	// Command names
	Curl     = "curl"
	Ping     = "ping"
	AptGet   = "apt-get"
	Xorriso  = "xorriso"
	S7z      = "7z"
	AptCache = "apt-cache"
	Gpg      = "gpg"

	AptUpdateCmdTemplate = AptGet + " update -y"
	// Command templates
	PingCmdTemplate           = Ping + " -c 1 -w 1 8.8.8.8"
	CurlCmdTemplate           = Curl + " -sSL " + DownloadURL + "%s"
	AptCmdTemplate            = AptGet + " install -y %s"
	XorrisoCmdTemplate        = Xorriso + " -osirrox on -indev %s -extract / %s"
	S7zCmdTemplate            = S7z + " -y x %s -o%s"
	AptGetDownloadCmdTemplate = AptGet + " download %s"
	AptCacheCmdTemplate       = AptCache + " depends %s"

	GpgVerifyCmdTemplate  = Gpg + " --keyring %s --verify %s %s"
	GpgRecvKeyCmdTemplate = Gpg + " --no-default-keyring --keyring %s --keyserver hkp://keyserver.ubuntu.com --recv-keys %s"

	GrubConfigPath     = "boot/grub/grub.cfg"
	LoopBackConfigPath = "boot/grub/loopback.cfg"
	TxtConfigPath      = "isolinux/txt.cfg"
	MD5SumFile         = "md5sum.txt"
	MetaDataFile       = "meta-data"
	UserDataFile       = "user-data"
	ISOhdpfxPath       = "/usr/lib/ISOLINUX/isohdpfx.bin"

	CasperDir     = "/casper"
	KernelFile    = CasperDir + "/vmlinuz"
	InitrdFile    = CasperDir + "/initrd"
	HWEKernelFile = CasperDir + "/hwe-vmlinuz"
	HWEInitrdFile = CasperDir + "/hwe-initrd"

	AptGetDownloadCmd          = "apt-get download %s"
	AptCacheDependsCmdTemplate = "apt-cache depends --recurse --no-recommends --no-suggests --no-conflicts --no-breaks --no-replaces --no-enhances --no-pre-depends %s"
	AptitudeShowCmd            = `aptitude show %s | grep "Provided by" | awk -F ' ' '{print $3}'`

	DpkgScanpackagesCmd         = "dpkg-scanpackages"
	DpkgScanpackagesCmdTemplate = DpkgScanpackagesCmd + " ./"

	// addAutoinstallParameter adds autoinstall flags to a given config file if missing.
	AutoInstallKeyword = "autoinstall"            // keyword to check in file
	AutoInstallInject  = "quiet autoinstall  ---" // string to inject
	DefaultFilePerm    = 0644                     // default file permission
	DefaultDirPerm     = 0755                     // default directory permission
	ScriptFileName     = "install-pkgs.sh"

	GrubCdromMarker    = "cdrom"
	GrubReplaceMarker  = "---"
	GrubInsertText     = "autoinstall ds=nocloud\\;s=/cdrom/"
	ISOLinuxInsertText = "autoinstall ds=nocloud;s=/cdrom/"
	GrubFilePerm       = 0644

	DebFilePattern = "*.deb"
)

// Filtering conditions
var (
	RegexISOName   = `ubuntu-[0-9]{2}\.04(\.[0-9]+)?-live-server-amd64\.iso` // Matches Ubuntu ISO filenames with or without patch versions
	DepLineRegex   = regexp.MustCompile(`^[A-Za-z0-9]`)                      // Match lines starting with alphanumeric
	ExcludeKeyword = "i386"                                                  // Exclude this architecture
)
