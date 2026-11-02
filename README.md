# PC Gaming Setup Checklist

A free, offline-first Android checklist and savings tracker for building a custom PC or gaming setup.

**Made by Aryaan** · [@aryaan_creates on Instagram](https://www.instagram.com/aryaan_creates/)

## Download for Android

**[Download PC Gaming Setup Checklist v1.4.2 — signed APK](https://github.com/LowkeyAryaan/pc-gaming-setup-checklist/releases/download/v1.4.2/PC-Gaming-Setup-Checklist-v1.4.2-signed.apk)**

This is the official **signed v1.4.2 APK installer**, not a ZIP archive. It uses the same app identity and signing certificate as the v1.4.1 release, so it can update the installed public app without clearing data. Android may ask you to allow installations from your browser or file manager. Only install the APK from this project's official GitHub Release.

**Android 6.0 or later.** The app stores your products, savings, photos, and notes on your device. Export a JSON backup before uninstalling, resetting the app, or switching devices. Older test builds use a different package identity; install the community version alongside them and import your exported preset backups as needed.

## v1.9.2 Price Impact on Tracker and stronger retailer detection

- A glass **Price Impact** panel on Tracker shows **updated remaining setup goal**, **before tracked changes**, **net increase/decrease**, and counts of price increases/decreases.
- Uses the same `BudgetModel.compute` allocation and contribution scope as the existing Tracker/financial Summary, not a second wallet. Future products and previously purchased products do not alter the remaining goal.
- The first verified price check captures a baseline before automatic updates. The baseline persists in each preset's saved Price Watch records and JSON backups. Later failed store checks do not erase that history; manually changing a product price or its URL starts a fresh baseline.
- Price detection supports additional explicit retailer currency and metadata formats, and targeted WooCommerce product-price markup.
- Stores that block fetches, omit prices, or omit currency remain **Unavailable**, never falsely Stable; the badge exposes the reason when available and existing saved prices remain safe.
- Separate version 1.9.2 preview install, leaving older preview data untouched. Export/import backup to migrate.

## v1.9.1 smooth launch and faster welcome handoff

- Dark native Android activity theme and Android 12+ splash background prevent the transient white screen observed in the launch recording.
- Use a small branded native loading cover without a fake noninteractive Get Started button, so the transition to the real HTML welcome feels continuous rather than duplicated.
- Native-to-WebView handoff waits for the styled first frames, while maintaining a bounded fallback for font readiness.
- Avoid constructing the full international currency picker except during first-time currency setup.
- Keep initial month formatting in the app's first render, avoiding redundant full product-card and planner renders during startup.
- Remove expensive blur and scaling from full-screen welcome transitions in favor of a short opacity fade.
- Delay no-welcome price monitoring until after first paint, and coalesce multiple price responses into fewer full UI repaints.
- This v1.9.1 debug preview uses a separate installation identity. **Export/import a backup** to move user data from v1.9.0; don't delete an older app before backup.

## v1.9.0 launch-time Price Watch

- On launch, after welcome, check each saved public HTTPS product link asynchronously using a bounded three-worker native Android queue. One-time check does not download product photos.
- Show compact product indicators for stable, increased, decreased, unavailable or untracked price. A liquid-glass popup lists detected differences and their old/new prices after checks finish.
- Update **only unpurchased** prices when the retailer gives a valid, matching-currency positive price. The Summary and goal calculations recalculate automatically, while saved cash, contributions and historical purchased prices stay unchanged.
- Very large differences (over 3x or below 25% of the previous price) are flagged for review instead of automatically applied.
- Price checks use best-effort store metadata; stores without readable prices or matching currency are marked unavailable without overwriting the stored amount. Save per-preset last observations in backups.
- Settings provides "Check product prices on launch" (on by default) and "Check prices now". This preview installs separately from older versions; backup/export moves personal data.

## v1.8.1 month presentation, card refinement and haptic feedback

- Display readable month and year such as **November - 2026** in the planner picker, history, product creation, edit form, list badges and detail panels. Persisted month values remain machine-readable `YYYY-MM` to avoid changing history or breaking JSON backups.
- Compact Already Purchased checkbox and consistent one-line **Price (PKR)** label in the manual product editor.
- Three matching category budget-group options with centered typography and more balanced, shorter selection cards.
- Optional short tactile feedback for buttons, checkboxes, selection controls, page tabs/swipes and category long-press actions. **Settings → Haptic feedback** controls a persistent, device-wide preference. Android's system-level haptic settings remain authoritative.
- This standalone 1.8.1 preview has its own install identity so earlier previews are not silently replaced; use backup export/import to move data.

## v1.8 smart product creation and premium product details

- Tap anywhere on a product card to open its detailed glass sheet; the old Details button and inline item notes are removed. Purchase checkbox remains separately actionable.
- Open product listing is a real, full-width glass action button inside product details.
- Product editing opens a separate premium glass sheet with purpose-designed upload control, image preview, clear Save/Cancel/Delete priorities and custom target month selection.
- Add Product initially shows only link, category, priority and optional target month. Product name, price and picture are auto-detected when a store exposes them; edit details can be expanded manually at any time and automatically opens when detection fails or is incomplete.
- Add Category now offers styled budget-group choice cards, keeping its existing budget accounting.
- Summary has a stronger goal hero, savings/purchased cards, clearer category breakdown and reorganized backup actions. Values continue to come from the same local budgeting model.
- Month selection uses refined curved dark glass cards. No new paid infrastructure or remote accounts.
- Existing in-app storage model remains compatible. This preview installs with a new package identifier so earlier preview installations are not overwritten; export/import a backup to move their locally saved records.

## v1.7.2 alignment, image and category management fixes

- Connected edge-to-edge glass header and consistent two-column / three-column dashboard card grid, including safe clearance above the bottom dock.
- Custom category chips have no visible trash action. Tap to filter, hold for 550 ms to open the Edit/Delete glass menu. Keyboard users can press Shift+F10. PC, Setup and Future remain protected.
- Editing a custom category preserves its products, photos and purchases. Users can rename or change its budget group; deleting with products offers safe reassignment.
- Product link import now tries multiple published JSON-LD, OG, Twitter and product-gallery image URLs before falling back to manual image upload. It does not bypass retailer restrictions.

## v1.7 Setup Checklist · liquid-glass refinement

- **New identity:** Setup Checklist label, connected PC monogram in-app and on the Android launcher. Existing production package identity and signing remain unchanged.
- **Controlled glass surfaces:** Floating rounded top bar and bottom dock, restrained translucency and glow, curved controls/cards, glass sheets, confirmation dialogs, Settings and Feedback; Android platform file-selection UI remains system-controlled.
- **Onboarding:** Currency and terms screens restyled dark charcoal/lime; welcome CTA and creator credit separated for breathing room.
- **No permanent floating add button:** Product creation stays at the top of Items and inside the category/product sheets.
- **Native month replacement:** Month/year chooser uses a dark, in-app glass popup for both the monthly planner and product target dates.
- **Product link assistance:** Pasting a public HTTPS product link starts an optional native metadata lookup. It extracts JSON-LD/Open Graph title, price and a small product photo where the store permits; manual fields stay editable. Never assume all retailers expose the price or permit public downloads; the feature does not defeat anti-bot mechanisms.
- **Currency safety:** A detected price in a different currency is NOT silently converted or applied.
- **Privacy and budgets:** Saved presets and planner data stay device-local, and the importer does not use paid APIs, cookies or seller credentials. Export backups before uninstalling.

## v1.6 approved design and product planning

- Artistic abstract ribbon A brand mark on the welcome, header and Android launcher.
- Charcoal/acid-lime UI with lightweight transitions, progress ring, quick add, preset tiles and focused product details.
- Product priority (High, Medium, Low), optional target purchase month and purchased-on-create.
- Search products by name/category/note and sort by priority from Settings.
- Next Purchase shows the highest-priority unpurchased current-goal product, then the earliest target month; it is a suggested planning order, not a compatibility recommendation.
- Planner Salary and Savings tabs reuse the existing local monthly data. Backup import is accessible from welcome.
- Existing presets, categories, contribution amounts and photos retain their saved identity and values.

## v1.5 planner and interface refresh

- **Four sections:** Tracker, Items, Summary and a new monthly financial Planner.
- **Fast welcome transition:** composite-only handoff, reduced blur and shorter delay.
- **Clean item workflow:** Add Product and Add Category open focused bottom sheets. The Tracker no longer contains item filters or creation forms.
- **Custom categories:** PC, Setup and Future remain protected; all other categories (including migrated legacy categories) may be reassigned or deleted.
- **Flexible contribution allocation:** PC only, everything except PC, everything or a named category. Available contribution is separate from ordinary savings and prioritizes current purchases over Future.
- **Global monthly planner:** salary, fixed and variable expenses, planned savings, actual savings and month-by-month history. The planner never automatically treats income as savings or transfers it into preset Tracker funds.
- **Android clipboard:** native bridge for copying checklists and feedback reliably.

Existing per-preset data is retained, including purchased items and original product photos. Local backups now use schema version 5 and can optionally restore the global planner. The planner uses a single currency fixed at first setup; changing a preset currency does not convert the global planner.

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


**Interface polish in v1.4.2:** Dark custom dropdowns, blue navigation and selection accents, tactile tap animations and fast finger-following swipes between Tracker, Items and Summary. Each section scrolls vertically on its own. Monetary amounts and the prominent welcome button use green for visual emphasis. Modal dialogs, text entry, system-edge gestures and vertical scrolling remain protected. Reduced-motion preferences are respected.

**Purchase tracking in v1.4.2:** Checking a product removes its price from current budget categories and the remaining savings target, but keeps the product in your Purchased list and totals. Unchecking restores the pending cost. Future purchases never enter the current savings target. Your Saved and PC Contribution inputs represent money still available; adjust them manually if a purchase used those funds. Existing v1.4.1 data and backups are supported.

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

Contributions, feature requests and bug reports are welcome.

## License

Licensed under the **MIT License**. Copyright © 2026 Aryaan. See [LICENSE](LICENSE). The MIT license covers our original software; third-party artwork and assets may have their own license terms. See [Open-source publishing checklist](docs/PUBLISH_OPEN_SOURCE.md).

## Creator

[Instagram · @aryaan_creates](https://www.instagram.com/aryaan_creates/)
