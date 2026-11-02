# Setup Checklist v2.0.0 — Branded public release

The approved PC/checkmark identity is now installed throughout the Android app.

## Included
- Source-extracted, minimalist PC launcher icon, Android splash, in-app header and welcome wordmark.
- Setup Tracker, item checklists, Summary, Salary/Savings planner, presets and local backups.
- Price Watch after app launch, optional haptics, price-impact summaries and per-item indicators.
- Variant price selector and targeted retailer retries. A range-only or unverified listing never silently overwrites a manually confirmed variant price.

## Install and preserve your data
This signed public edition uses Android package ID `com.aryaan.pcsetup.community`. Previous debug and preview APKs have **different package names or signing certificates** and cannot be upgraded in place. Keep the old app installed, export every preset and your backup, install the public edition alongside it, import the backup, and verify every item, price, photo, saving and purchase checkbox before uninstalling anything.

For later public releases, the package ID and signing certificate must stay identical. Installation is supported on Android 6.0 or newer. Actual retailer price extraction remains best effort where stores block automated access or do not publish exact prices.

## Signing
This release asset is published only if GitHub Actions successfully verifies that it was signed with the project's configured permanent keystore. The private signing key is not stored in this repository.
