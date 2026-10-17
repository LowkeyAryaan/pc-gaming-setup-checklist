# PC Gaming Setup Checklist

A free, offline-first Android checklist and savings tracker for building a custom PC or gaming setup.

**Made by Aryaan** · [@aryaan_creates on Instagram](https://www.instagram.com/aryaan_creates/)

## Download for Android

**[Download PC Gaming Setup Checklist v1.4.1 — signed APK](https://github.com/LowkeyAryaan/pc-gaming-setup-checklist/releases/download/v1.4.1/PC-Gaming-Setup-Checklist-v1.4.1-signed.apk)**

This is a **direct `.apk` installer**, not a ZIP archive. This v1.4.1 APK is the current stable public release. Any newer version in development is only for testing until its signed release is published. Android may ask you to allow installations from your browser or file manager. Only install the APK from this project's official GitHub Release.

**Android 6.0 or later.** The app stores your products, savings, photos, and notes on your device. Export a JSON backup before uninstalling, resetting the app, or switching devices. Older test builds use a different package identity; install the community version alongside them and import your exported preset backups as needed.

## Features

- **Multiple presets:** separate PC and gaming setups, each with its own products, budgets, categories and photos.
- **Savings dashboard:** track contributions, purchase checkmarks and the live cost of items still to buy. Checked items leave the remaining savings target without losing their price history.
- **Custom products:** add, edit, delete, mark purchased or categorize your components; save links, prices, photos and notes. Filter your Items list by All items, To buy or Purchased.
- **Custom categories:** choose whether each category counts toward current PC cost, setup cost or future purchases.
- **Worldwide currency display:** select ISO-supported currencies separately per preset; prices remain in manually entered units. **Changing currency never performs FX conversion.**
- **Chrome shopping links:** shop externally and return to the checklist without resetting progress.
- **Local backups:** export or import JSON backups, including images.
- **Onboarding and welcome:** first run asks users to select their currency and accept terms; subsequent launches can show a welcome screen.
- **Saved feedback comments:** write, save, edit, copy or delete comments in the Feedback tab. Comments are stored on this device across restarts. Email them directly to aryaanmikaeel@gmail.com using the user’s email application; users must explicitly tap Send.


**Interface polish in v1.4.2 (currently in testing):** Android's default white category/sorting dropdowns are replaced with in-app, dark themed option pickers. Buttons have custom tap feedback with no Android blue tap flash. On a touch device, swipe left/right across non-interactive content to move between Tracker, Items and Summary, or use the bottom tab buttons as before. Swipes never override typing, form controls, modal dialogs, or vertical scrolling. Reduced-motion preferences are respected.

**Purchase tracking in v1.4.2 (currently in testing):** Checking a product removes its price from current budget categories and the remaining savings target, but keeps the product in your Purchased list and totals. Unchecking restores the pending cost. Future purchases never enter the current savings target. Your Saved and PC Contribution inputs represent money still available; adjust them manually if a purchase used those funds. Existing v1.4.1 data and backups are supported.

## Getting started

Install the official **signed release APK** using the direct link above or from the repository's GitHub **Releases** page. New installations begin with an **empty Preset #1** so you can build your own list.

All checklist data lives on your Android device in the app's WebView storage / IndexedDB. There is **no backend account and no automatic cloud sync**. Always export your presets before uninstalling, replacing your phone or clearing app storage.

## Build from source

The Android project wraps HTML, CSS and JavaScript in a small Java `WebView` host. It uses Android Gradle Plugin **8.6.1**, Gradle **8.7**, JDK **17** and Android SDK **35**.

1. Open the project in Android Studio, sync and build a debug APK; or
2. Use **Actions → Build Android APK** for a CI debug/testing build.

The CI workflows download the welcome-screen artwork during the build into `app/src/main/assets/welcome.jpg`. For offline local development, place a legitimately licensed image at that path, or use the existing dark background fallback.

**Important:** Debug APKs use temporary test signing. They are **not** the installable public release. The signed community release uses the stable package ID **`com.aryaan.pcsetup.community`** and a long-lived signing key. See [Release signing](docs/RELEASE_SIGNING.md).

## Privacy and trust

- The app does not operate its own cloud service or automatically upload your checklist, saved amounts or photos.
- Product links and Instagram links open externally; those sites have their own privacy practices.
- The Feedback tab saves drafts **on your device only**, across presets. You can edit, delete, copy, or open an addressed email draft for Aryaan. **No feedback is automatically sent.** You must tap Send in your mail app.
- Sending feedback by email can disclose the sender's email address and message to Aryaan (`aryaanmikaeel@gmail.com`) and involves the sender's email provider. Saved feedback comments are separate from individual presets and are not part of a preset JSON backup. Copy or share any comments you need to keep elsewhere before clearing app data.
- Exported backups can contain your savings, product prices, notes and photos. Treat backup files as private.
- The app's local Terms & Conditions are about the use of the app, not the open-source license.

## Development and contributions

Start with `app/src/main/assets/index.html` (UI), `app.js` (data and savings), `shell.js` (navigation/presets and Feedback), `feedback-store.js` (persistent comments), `onboarding.js` (welcome and first run) and `MainActivity.java` (native Android bridge).

CI runs JavaScript validation and safety/migration tests. New changes should preserve existing saved presets and must never add another person's private product links/prices as public starter data.

Contributions and bug reports will be welcomed after the repository is publicly launched.

## License

Licensed under the **MIT License**. Copyright © 2026 Aryaan. See [LICENSE](LICENSE). The MIT license covers our original software; third-party artwork and assets may have their own license terms. See [Open-source publishing checklist](docs/PUBLISH_OPEN_SOURCE.md).

## Creator

[Instagram · @aryaan_creates](https://www.instagram.com/aryaan_creates/)
