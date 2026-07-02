# DM-Crypt Storage Configuration

This document describes how to configure `dm_crypt` type storage entries in the `user-data` file for Ubuntu Autoinstall.

A `dm_crypt` entry encrypts a block device using LUKS (Linux Unified Key Setup) via the device mapper.

---

## Common Fields

| Field      | Type   | Required | Description                                                                 |
|------------|--------|----------|-----------------------------------------------------------------------------|
| `type`     | string | Yes      | Must be `dm_crypt`                                                          |
| `id`       | string | Yes      | Unique identifier for this storage entry, referenced by other entries       |
| `volume`   | string | Yes      | The ID of the block device or partition to encrypt (e.g. `pv-part`)        |
| `dm_name`  | string | Yes      | The device mapper name for the decrypted device (e.g. `crypto`)            |
| `preserve` | bool   | No       | Whether to keep the existing encrypted device intact (default: `false`)     |
| `wipe`     | string | No       | Cleanup method before encryption. Options: `superblock`, `zero`, `random`  |

> **Note:** `key` and `keyfile` are mutually exclusive — only one can be specified per entry.

---

## Option 1: Inline Key (`key`)

Use a plaintext passphrase embedded directly in the `user-data`. This is the simpler option and suitable for automated installs where the passphrase is acceptable in the config file.

### Parameters

| Field   | Type   | Required | Description                                      |
|---------|--------|----------|--------------------------------------------------|
| `key`   | string | Yes      | Plaintext passphrase used to unlock the volume   |

### Example

```yaml
autoinstall:
  storage:
    config:
      - type: disk
        id: disk0
        grub_device: true
        ptable: gpt
        wipe: superblock-recursive
        match:
          size: largest
        preserve: false

      - type: partition
        id: pv-part
        device: disk0
        size: -1
        wipe: superblock
        preserve: false

      - type: dm_crypt
        id: dm_crypt-0
        volume: pv-part
        dm_name: crypto
        key: "mysecret-passphrase"  # define your own passphrase
        wipe: superblock
        preserve: false

      - type: format
        id: format0
        fstype: ext4
        volume: dm_crypt-0
        preserve: false

      - type: mount
        id: mount0
        device: format0
        path: /
```

---

## Option 2: Key File (`keyfile`)

Use a key file stored on the target system. This avoids embedding the passphrase in plain text and is more suitable for production environments where the key file is provisioned separately (e.g. via a pre-seed script or early-commands).

### Parameters

| Field     | Type   | Required | Description                                                              |
|-----------|--------|----------|--------------------------------------------------------------------------|
| `keyfile` | string | Yes      | Absolute path to the key file on the target system (e.g. `/etc/keys/crypto.key`) |

### Example

```yaml
autoinstall:
...
  storage:
    config:
      - type: disk
        id: disk0
        grub_device: true
        ptable: gpt
        wipe: superblock-recursive
        match:
          size: largest
        preserve: false

      - type: partition
        id: pv-part
        device: disk0
        size: -1
        wipe: superblock
        preserve: false

      - type: dm_crypt
        id: dm_crypt-0
        volume: pv-part
        dm_name: crypto
        keyfile: /tmp/luks.key # Specify the location of the keyfile file
        wipe: superblock
        preserve: false

      - type: format
        id: format0
        fstype: ext4
        volume: dm_crypt-0
        preserve: false

      - type: mount
        id: mount0
        device: format0
        path: /



```

**Note:**

If you are implementing automatic disk encryption/decryption using a keyfile in your storage configuration, you must pay attention to the following two points:

1. **Consistent Device Naming**
The encrypted device name defined in your storage config (e.g., dm_name: crypto) must be identical to the name you write into crypttab during the late-commands phase (e.g., crypto). Otherwise, the system will hang at the initramfs interface after rebooting.

**Reason:** When initramfs starts, it reads /etc/crypttab and creates a device mapping based on the name you provided (such as cryptroot). However, since your fstab and LVM Volume Groups (VG) were created based on the name crypto during installation, they will fail to find the expected path under /dev/mapper/, leading to a root filesystem mount failure.

2. **Keyfile Path Alignment**
The keyfile path defined in your storage configuration (e.g., /tmp/luks.key) must exactly match the path of the keyfile generated in your early-commands. If these paths do not match, the installer will be unable to access the key, and the operating system installation will fail.

---

## Key vs Keyfile Comparison

| Aspect              | `key` (inline passphrase)         | `keyfile` (key file path)                  |
|---------------------|-----------------------------------|--------------------------------------------|
| Setup complexity    | Simple                            | Requires pre-provisioning the key file     |
| Security            | Passphrase visible in user-data   | Passphrase stored in a protected file      |
| Recommended for     | Lab / testing environments        | Production environments                    |
| Mutual exclusivity  | Cannot be used together with `keyfile` | Cannot be used together with `key`    |

---

## Notes

- The `dm_name` value becomes the device mapper path: `/dev/mapper/<dm_name>` (e.g. `/dev/mapper/crypto`).
- Downstream entries (e.g. `format`, `lvm_volgroup`) should reference the `dm_crypt` entry by its `id`, not by `dm_name`.
- If neither `key` nor `keyfile` is provided, the installer will prompt for a passphrase interactively — this is not suitable for fully automated installs.
