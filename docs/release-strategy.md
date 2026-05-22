# Release Strategy

## Goals

- Keep MCPViews registry installation pointed at a stable remote manifest.
- Make every plugin version produce a GitHub release asset named `tribe-x-persona-studio.zip`.
- Use `RELEASE_NOTES.md` as the single changelog source for release bodies and future update notes.

## Versioning

Use SemVer in `manifest.json.version`.

- Patch or minor versions such as `0.1.18` publish as normal releases.
- Candidate versions such as `0.1.1-rc.1` publish as prereleases.
- Every version must have a matching `manifest.json.download_url` pointing to the release ZIP.

## Release Notes

Maintain `RELEASE_NOTES.md` under `# Unreleased`.

Each release-worthy change should add one concise bullet that describes user-facing behavior, operator impact, or packaging/release impact. Avoid commit-log phrasing. The release workflow uses these bullets as the GitHub release body, then resets the file to `# Unreleased` after the release is created.

## Candidate Flow

1. Bump `manifest.json.version` to the next prerelease, such as `0.1.1-rc.1`.
2. Add release notes under `# Unreleased`.
3. Run `bash build.sh`.
4. Validate the generated `release/tribe-x-persona-studio.zip` in MCPViews.
5. Push to `master`; the release workflow creates a prerelease and uploads the ZIP.

## Stable Flow

1. Promote the validated candidate by bumping `manifest.json.version` to the final version, such as `0.1.1`.
2. Refresh `RELEASE_NOTES.md` with the final user-facing changelog.
3. Run `bash build.sh`.
4. Push to `master`; the release workflow creates a normal release and uploads the ZIP.

## MCPViews Registry

`../tribe-x/mcpviews/registry/registry.json` should keep `tribe-x-persona-studio` pointed at:

```text
https://raw.githubusercontent.com/DeeJanuz/tribe-x-persona-studio/master/manifest.json
```

MCPViews resolves `manifest_url` at registry load time, so future version updates should not require registry edits unless plugin metadata, tags, or the repository URL changes.
