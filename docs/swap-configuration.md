# Swap Configuration

Ubuntu Auto Installer supports swap file configuration through the **Storage Configuration** tab.

## Overview

Curtin can configure a swapfile on the filesystem in the target system. Size settings can be integer or string values with suffix.

## Supported Size Units

| Unit | Multiplier |
|------|------------|
| B    | 1          |
| K / KB | 1 << 10 |
| M / MB | 1 << 20 |
| G / GB | 1 << 30 |
| T / TB | 1 << 40 |

## Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **Filename** | string | `/swap.img` | Path to swap file |
| **Size** | string | `0` (disabled) | Exact size of swap file (e.g., `8G`, `1GB`, `4096M`). Set to `0` to disable swap |
| **Max Size** | string | `8G` | Maximum size for heuristic calculation |
| **Force** | boolean | `false` | Force swap file creation on unsupported filesystems |

## Examples

### Disable Swap (Default)

```yaml
storage:
  swap:
    size: "0"
```

### Create 8GB Swap File

```yaml
storage:
  swap:
    filename: /swap.img
    size: 8G
    maxsize: 8G
```

### Create Swap File with Custom Filename

```yaml
storage:
  swap:
    filename: swap.img
    size: 1GB
    maxsize: 4GB
```

### Force Swap on Unsupported Filesystems (btrfs, xfs, zfs)

```yaml
storage:
  swap:
    filename: btrfs_swapfile.img
    size: 1GB
    force: true
```

## Notes

- Setting `size` to `0` will disable swap creation
- If `size` is not set, Curtin will use a heuristic to calculate the swap size, bounded by `maxsize`
- **Warning**: Forced swapfiles may not work on btrfs, xfs, or zfs filesystems and could cause errors

## Relationship with Storage Configurations

The swap file configuration is separate from the Storage Configuration's device types:

- **Swap Configuration**: Simple swapfile setup for most users
- **Storage Config (LVM Swap)**: Advanced scenarios requiring encrypted swap, LVM, or RAID

Both can be used simultaneously depending on your requirements.
