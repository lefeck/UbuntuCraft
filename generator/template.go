package generator

import "text/template"

var (
	NameTemplate = template.Must(template.New("iso").Parse(
		"ubuntu-server-{{.codename}}-autoinstall"))

	ShellTemplate = `#!/bin/bash
# The default installation package will be downloaded to /cdrom/mnt/packages/ directory
cp /etc/apt/sources.list /etc/apt/sources.list.bak
echo 'deb [trusted=yes] file:///mnt/packages/ ./' > /etc/apt/sources.list
apt-get update
{{range .}}
apt-get install -y {{.}}
{{end}}
`
)
