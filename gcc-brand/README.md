# gcc-brand

GCC LLC brand assets — canonical logo + favicon mirror.

## Layout

| Path | Contents |
|------|----------|
| `source/gcc-logo-transparent.ico` | **Master** multi-resolution ICO (16/32/48/64/128/256, 32bpp PNG-embedded). Authored externally; mirrored here. |
| `raster/gcc-logo.ico`             | Identical copy used by consumers. |
| `raster/gcc-logo-{16..256}.png`   | Per-size PNG renders extracted from the ICO. |
| `scripts/sync-logo.ps1`           | Re-extracts PNGs + mirrors the ICO if a new master is dropped into `source/`. |

## Brand color

| Token   | Hex      | Use                                            |
|---------|----------|------------------------------------------------|
| Forest  | `#1E4D2B`| Primary brand green; `<meta name="theme-color">` |

## Refresh from a new master

1. Replace `source/gcc-logo-transparent.ico` with the new master.
2. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\sync-logo.ps1
   ```
3. Commit + push. Downstream consumers (`gcc-app`, `gcc-site`) re-mirror on
   their next build/publish.

## Consumers (each holds its own copy under VCS so deploys don't depend on this repo at runtime)

| Consumer | Mirrored path |
|----------|---------------|
| `gcc-site` favicon | `assets/favicon.ico` |
| `gcc-site` Apple touch / OG | `assets/img/gcc-logo-256.png` |
| `gcc-app` Windows tray icon | `assets/gcc-logo.ico` |
