package generator

import (
	"fmt"

	"gopkg.in/yaml.v3"

	"github.com/lefeck/ubuntu-autoinstaller/config"
)

// UserDataGenerator generates cloud-init user-data content.
type UserDataGenerator struct{}

// NewUserDataGenerator creates a new user-data generator.
func NewUserDataGenerator() *UserDataGenerator {
	return &UserDataGenerator{}
}

// GenerateFromConfig generates user-data from a config struct.
func (gen *UserDataGenerator) GenerateFromConfig(cfg *config.Config) ([]byte, error) {
	// Validate configuration
	if err := gen.validateConfig(cfg); err != nil {
		return nil, fmt.Errorf("config validation failed: %v", err)
	}

	// Password is used as-is (assumed to be already hashed in templates)
	// No automatic encryption - template values are used directly

	// Generate user-data YAML content
	userData, err := gen.generateUserData(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to generate user-data: %v", err)
	}

	return userData, nil
}

// validateConfig validates the provided config.
func (gen *UserDataGenerator) validateConfig(cfg *config.Config) error {
	if cfg == nil {
		return fmt.Errorf("config must not be nil")
	}

	// Delegate validation to config struct
	return cfg.Validate()
}

// generateUserData marshals the config into YAML with #cloud-config header.
// It explicitly excludes EmbeddedFiles since that's not a valid cloud-init parameter.
func (gen *UserDataGenerator) generateUserData(cfg *config.Config) ([]byte, error) {
	// Create a copy without EmbeddedFiles to avoid including it in cloud-init user-data
	cloudCfg := config.Config{
		Autoinstall: config.Autoinstall{
			Apt:           cfg.Autoinstall.Apt,
			Drivers:       cfg.Autoinstall.Drivers,
			Identity:      cfg.Autoinstall.Identity,
			Kernel:        cfg.Autoinstall.Kernel,
			Keyboard:      cfg.Autoinstall.Keyboard,
			Locale:        cfg.Autoinstall.Locale,
			Network:       cfg.Autoinstall.Network,
			SSH:           cfg.Autoinstall.SSH,
			Storage:       cfg.Autoinstall.Storage,
			Updates:       cfg.Autoinstall.Updates,
			Shutdown:      cfg.Autoinstall.Shutdown,
			Version:       cfg.Autoinstall.Version,
			Packages:      cfg.Autoinstall.Packages,
			EarlyCommands: cfg.Autoinstall.EarlyCommands,
			LateCommands:  cfg.Autoinstall.LateCommands,
			ErrorCommands: cfg.Autoinstall.ErrorCommands,
			UserData:      cfg.Autoinstall.UserData,
			TimeZone:      cfg.Autoinstall.TimeZone,
			// Explicitly exclude EmbeddedFiles - not a valid cloud-init parameter
		},
	}

	// Serialize config to YAML
	data, err := yaml.Marshal(cloudCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal YAML: %v", err)
	}

	// Prepend required cloud-config header
	result := append([]byte("#cloud-config\n"), data...)
	return result, nil
}

// ValidateUserData checks that user-data YAML is syntactically valid and contains required fields.
func (gen *UserDataGenerator) ValidateUserData(userData []byte) error {
	if len(userData) == 0 {
		return fmt.Errorf("user-data must not be empty")
	}

	// Parse YAML to validate syntax
	var config map[string]interface{}
	if err := yaml.Unmarshal(userData, &config); err != nil {
		return fmt.Errorf("invalid YAML syntax: %v", err)
	}

	// Ensure required 'autoinstall' field exists
	if _, exists := config["autoinstall"]; !exists {
		return fmt.Errorf("missing required 'autoinstall' field")
	}

	return nil
}

// GenerateDefaultConfig returns a default config encoded as user-data.
func (gen *UserDataGenerator) GenerateDefaultConfig() ([]byte, error) {
	defaultConfig := config.NewDefaultConfig()
	return gen.GenerateFromConfig(defaultConfig)
}

// LoadConfigFromYAML parses a Config from YAML bytes.
func (gen *UserDataGenerator) LoadConfigFromYAML(yamlData []byte) (*config.Config, error) {
	var cfg config.Config
	if err := yaml.Unmarshal(yamlData, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse YAML config: %v", err)
	}
	return &cfg, nil
}

// SaveConfigToYAML serializes a Config to YAML bytes.
func (gen *UserDataGenerator) SaveConfigToYAML(cfg *config.Config) ([]byte, error) {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %v", err)
	}
	return data, nil
}
