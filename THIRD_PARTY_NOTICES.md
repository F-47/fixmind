# Third-party notices

Fixmind's MIT license applies to Fixmind-authored source code. It does not replace the licenses of dependencies or third-party assets distributed with the product.

## npm dependencies

The current lockfile includes `caniuse-lite@1.0.30001810`, licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). The package supplies browser-compatibility data used by the frontend toolchain. Its license requires attribution for redistributed data; this notice provides that attribution.

## Rust dependencies

The current Cargo dependency graph includes `webpki-root-certs@1.0.9`, licensed under [CDLA-Permissive-2.0](https://cdla.dev/permissive-2-0/). The package supplies TLS root certificates through the `rustls-webpki` ecosystem. Its license and source are available from the [upstream repository](https://github.com/rustls/webpki-roots).

All other dependency licenses remain governed by their respective package metadata and bundled notices. Before a release, regenerate the dependency inventory from the lockfile and Cargo metadata and review any newly introduced license expression.

## Fixmind-owned assets

Fixmind branding and product assets in this repository are owned by F-47. Third-party brand names and service marks remain the property of their respective owners and are not relicensed by Fixmind's MIT license.
