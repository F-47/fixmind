# Fixmind Windows release checklist

Use this checklist for every Windows desktop release. The release workflow is [`.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml). It triggers only when a tag matching `v*.*.*` is pushed.

## Current signing policy

- [x] Ship without paid Windows Authenticode signing for the initial release.
- [x] Require Tauri signatures for automatic-update artifacts.
- [ ] Add trusted Windows publisher signing later, when its ongoing cost is justified.
- [x] Document that Windows can show Unknown publisher or SmartScreen warnings until publisher signing is added.

## Before each release

- [ ] Confirm the working tree is intentionally staged/committed and the intended branch is up to date.
- [ ] Choose a new version; never reuse a published version. Follow semantic versioning (`0.1.1`, `0.2.0`, etc.).
- [ ] Set the same version in both:
  - `apps/desktop/package.json`
  - `apps/desktop/src-tauri/tauri.conf.json`
- [ ] Run the local gates from the repository root:

  ```powershell
  npm run lint
  npm test
  npm run build -w @fixmind/website
  npm run package -w @fixmind/desktop
  npm run smoke:installed -w @fixmind/desktop -- -InstallerPath src-tauri/target/release/bundle/nsis/Fixmind_<version>_x64-setup.exe
  ```

- [ ] Verify the generated installer is the NSIS `.exe`, not an old file in a previous `target` directory.
- [ ] Confirm the website still points to `https://github.com/F-47/fixmind/releases/latest`.
- [ ] Commit the version and release-related changes.

## Start the release

Replace `<version>` with the exact value in `tauri.conf.json`:

```powershell
git tag -a v<version> -m "Fixmind desktop v<version>"
git push origin v<version>
```

The `Desktop release` workflow then:

1. Checks that the tag and Tauri version match.
2. Runs lint, the complete core suite, Rust formatting, and Rust tests.
3. Builds the dashboard, SEA server, and desktop executable in a clean Windows runner.
4. Builds the unsigned NSIS installer with the embedded offline WebView2 runtime.
5. Signs the automatic-update bundle with the Tauri updater key.
6. Runs the fresh-install, repair/reinstall, empty-`PATH`, path-compatibility, uninstall, and data-preservation smoke test.
7. Generates `SHA256SUMS.txt` and publishes the installer, updater metadata, and checksums to the GitHub release.

If the Tauri updater signing secrets are absent or invalid, the workflow must fail before publishing.

## Verify the published release

- [ ] Confirm the GitHub release is published for the intended tag and is not marked as a draft.
- [ ] Download the `.exe` and `SHA256SUMS.txt` from the release page.
- [ ] Verify the checksum:

  ```powershell
  Get-FileHash .\Fixmind_<version>_x64-setup.exe -Algorithm SHA256
  Get-Content .\SHA256SUMS.txt
  ```

- [ ] Confirm the installer is intentionally not Authenticode-signed:

  ```powershell
  Get-AuthenticodeSignature .\Fixmind_<version>_x64-setup.exe | Format-List Status,SignerCertificate
  ```

  `Status` is expected to be `NotSigned` until trusted Windows publisher signing is added.

- [ ] Install the release as a standard user, open Fixmind, and confirm the Start Menu/uninstall entry is present.
- [ ] Confirm the website Download button opens the current `/releases/latest` page.

## Rollback and recovery

- [ ] If the release is defective, mark it as a pre-release or delete the GitHub release and assets.
- [ ] Never reuse the defective version or tag. Increment the version and publish a replacement tag.
- [ ] Keep the website pointed at `/releases/latest`; it will follow the replacement release automatically.
- [ ] Do not delete `%USERPROFILE%\.fixmind` or an explicitly configured `FIXMIND_DATA_DIR` during rollback. Lesson data, review state, configuration, and sync metadata belong to the user.
- [ ] If the updater key is compromised, stop publishing and follow the key-migration plan before releasing another update.

## Current repository state

- Consumer installer: NSIS `.exe`.
- WebView2: embedded offline installer (larger download, no prerequisite download).
- MSI: optional enterprise build via `npm run package:msi -w @fixmind/desktop`.
- Website download URL: `https://github.com/F-47/fixmind/releases/latest`.
- Windows publisher signing: deferred; the installer can trigger Unknown publisher or SmartScreen warnings.
- Automatic-update artifacts: signed with the app-specific Tauri updater key.
