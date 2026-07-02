# Modifying the Target System During Installation

This document describes how to use `late-commands` in the autoinstall `user-data` file to modify files inside the target system while Ubuntu Autoinstall is running — before the first reboot.

This is the standard, supported way to make persistent changes that a Cloud-Init / autoinstall directive alone cannot express.

---

## Overview

Cloud-Init runs **after** the system has rebooted into the installed OS. Anything injected via `user-data` into the running installer therefore cannot be written into the freshly installed filesystem by Cloud-Init itself.

When a setting must live inside the installed filesystem at first boot (for example, a kernel command-line parameter persisted into `/etc/default/grub`), it has to be applied during installation by **curtin** in a `late-commands` block. Curtin is the underlying installer that Autoinstall drives, and `late-commands` runs in a chroot with the target system mounted at `/target`.

---

## Syntax

```yaml
late-commands:
  - curtin in-target --target=/target -- <command>
```

| Part               | Meaning                                                     |
|--------------------|-------------------------------------------------------------|
| `late-commands`    | List of shell-style commands to run near the end of install |
| `curtin in-target` | Run the following command inside the chroot at `/target`    |
| `--target=/target` | Required: path to the installed system root                 |
| `--`               | Separator: everything after `--` is the actual command      |
| `<command>`        | The shell command to execute                                |

Quoting works as in any YAML string. Use single quotes `'…'` for the outer YAML string and double quotes `"…"` inside sed / etc., or the other way around — but **never** nest the same quote style.

---

## Recipe 1 — Edit `/etc/default/grub` In Place (Recommended)

Use `sed -i` when `GRUB_CMDLINE_LINUX_DEFAULT` already exists in `/etc/default/grub` (the default on Ubuntu Server). This is the safest option because it preserves the rest of the file, including any other kernel parameters you may have set elsewhere.

```yaml
late-commands:
  - curtin in-target --target=/target -- sed -i \
      's/^GRUB_CMDLINE_LINUX_DEFAULT="/GRUB_CMDLINE_LINUX_DEFAULT="biosdevname=0 net.ifnames=0 /' \
      /etc/default/grub

  - curtin in-target --target=/target -- update-grub
```

### What This Does

1. **`sed -i …`** — replaces the leading `GRUB_CMDLINE_LINUX_DEFAULT="…"` line with one that prepends `biosdevname=0 net.ifnames=0 ` inside the quoted value. The existing trailing parameters are kept intact.
2. **`update-grub`** — regenerates the GRUB configuration so the new kernel command line is actually applied at boot.

### Why `biosdevname=0 net.ifnames=0`

Together these two parameters make the kernel use the traditional `eth0`/`eth1`/`eth2`… names instead of the predictable interface names `eno0`/`ens3`/… or the systemd `enp0s3`-style names. This is useful when:

- The system runs legacy software that hard-codes `eth0`.
- A BMC / IPMI console or out-of-band management tool expects stable `eth*` device names.
- NIC ordering must match physical port labels on the chassis.

### When To Use This Form

- Ubuntu Server ISO (always has `/etc/default/grub` populated).
- You want to keep existing parameters such as `quiet splash` or `nomodeset`.

---

## Recipe 2 — Append a New Line (When `GRUB_CMDLINE_LINUX` Is Empty)

If the line does not yet exist (very rare on a server image, but possible on a minimal variant), append it instead:

```yaml
late-commands:
  - curtin in-target --target=/target -- bash -c \
      'echo GRUB_CMDLINE_LINUX=\"biosdevname=0 net.ifnames=0\" >> /etc/default/grub'

  - curtin in-target --target=/target -- update-grub
```

### Notes

- This form is **destructive to use on a system that already has `GRUB_CMDLINE_LINUX`** — running it twice would create two separate lines, and GRUB would only honor one of them.
- The outer YAML string uses **single quotes** so the embedded double quotes survive to `bash`.
- The backslash `\` before the `"` is YAML line continuation, not a shell escape.

---

## Verification

After installing with this `user-data`, log in to the installed system and confirm:

```bash
cat /etc/default/grub | grep GRUB_CMDLINE_LINUX
```

Expected output (one line):

```
GRUB_CMDLINE_LINUX_DEFAULT="biosdevname=0 net.ifnames=0 quiet splash"
```

And confirm the parameter reached the running kernel:

```bash
cat /proc/cmdline
```

Expected to contain `biosdevname=0 net.ifnames=0`.

Finally, confirm the NIC was actually renamed:

```bash
ip link show
```

You should see `eth0` instead of `eno1`/`ens3`/etc.

---

## Common Pitfalls

| Symptom                                            | Cause                                                                                | Fix                                                                                            |
|----------------------------------------------------|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `update-grub` is not found                         | The package `grub2-common` is not yet installed when `late-commands` runs            | Install it first: `curtin in-target -- apt-get install -y grub2-common`                        |
| `/proc/cmdline` shows the old values               | `update-grub` was not run, or the wrong GRUB file was edited                        | Always end the block with `curtin in-target -- update-grub`                                    |
| File changes appear to be lost                     | Editing the installer-side file instead of the chroot (missing `in-target --target`) | Make sure every line begins with `curtin in-target --target=/target --`                        |
| Two `GRUB_CMDLINE_LINUX` lines after install      | Used Recipe 2 on a system that already had the line                                  | Use Recipe 1 (`sed -i`) instead, or remove the duplicate line in `late-commands`               |
| `sed` reports "no such file"                       | Leading space mismatch — `/etc/default/grub` may not exist if GRUB was not installed | Check the installed system: `curtin in-target -- ls /etc/default/grub`                         |

---
