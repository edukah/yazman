# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-11

### Added
- TypeScript definitions (`dist/yazman.d.ts`)
- ESM build output (`dist/yazman.esm.js`) alongside UMD
- `languageCode` config option with `'auto'` detection from `<html lang>` (falls back to `'en'`)
- English locale file (`en.js`)
- URL scheme validation in Hyperlink format — blocks `javascript:`, `data:`, `vbscript:` URLs
- Security section in README documenting `innerHTML` usage in `status()`

### Changed
- Language system restructured: static imports for tr/en, `Language.init()` with auto-detection
- Hardcoded Turkish button labels in Hyperlink replaced with `Language.get()` calls
- README Script Tag examples now include copy instructions for clarity

### Fixed
- Clipboard paste handler memory leak — `destroy()` now removes the listener

### Removed
- `globalThis.Yazman` assignment from library source (consumers are now responsible for global assignment)
