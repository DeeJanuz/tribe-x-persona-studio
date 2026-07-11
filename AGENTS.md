# AGENTS.md

This repository packages the public MCPViews Persona Studio plugin.

## Release And Registry Maintenance

`bash build.sh` is the canonical release-package command. It reads `manifest.json.version`, rewrites `manifest.json.download_url` to `https://github.com/DeeJanuz/tribe-x-persona-studio/releases/download/{version}/tribe-x-persona-studio.zip`, and produces `release/tribe-x-persona-studio.zip` containing `manifest.json`, `renderers/`, and `tools/`.

When preparing a version update:

1. Bump `manifest.json.version`.
2. Add concise user-facing notes under `RELEASE_NOTES.md` `# Unreleased`.
3. Run `bash build.sh` so `download_url` is synchronized and a release package exists.
4. Validate renderer/tool syntax before publishing.
5. Keep `../mcpviews/registry/registry.json` pointed at the repository `manifest_url`; avoid copying every new version into the registry unless registry metadata itself changes.

Release candidates should use SemVer prerelease suffixes such as `0.1.1-rc.1`. The GitHub Actions release workflow treats versions containing `-` as prereleases and clears `RELEASE_NOTES.md` after publishing. Keep `docs/release-strategy.md` aligned when changing the release process.
