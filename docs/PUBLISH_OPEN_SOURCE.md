# Preparing a privacy-safe public repository

**Do not switch the existing personal repository to Public.** Its historical Git commits contained a personal computer-parts list and prices. Deleting those files in a new commit does **not** delete history.

The recommended approach is to create a **new repository with fresh Git history** using only the current vetted snapshot, while preserving the original personal repository privately for archived work.

## 1. License and rights review

The maintainer has approved the **MIT License**, included as `LICENSE` with copyright © 2026 Aryaan. The new clean source repository must retain that file and copyright notices.

Review third-party artwork, the welcome photo, launcher icon and any other non-original assets before distributing them; these may have separate licensing requirements. The in-app Terms & Conditions are not a substitute for the MIT software license.

## 2. Export a clean snapshot WITHOUT old commits

In the **private repository**, use the vetted release preparation branch (or the merged release preparation version after approval):

1. Open the branch on GitHub, select **Code → Download ZIP**.
2. Extract the ZIP locally. GitHub's source ZIP includes the current file snapshot, **not the old `.git` commit-history directory**.
3. Look through every included file for secrets, private links, private pricing, personal notes and temporary files.
4. Never use GitHub's **Fork** button, `git clone --mirror`, or `git push --all`, because those approaches may carry old Git history.

The clean app's `app.js` should start with `const items=[];` and not contain preset product data. The existing owner keeps private data in their old Android installation's local storage, **not in the release APK or source**.

## 3. Clean-history repository created privately

The maintainer has created `LowkeyAryaan/pc-gaming-setup-checklist` as a **new private repository**, initialized with one new README commit.

The release source was transferred into a new Git tree and commit **without copying any old commit history or personal Git refs**. Historical source budget placeholders and personal example contribution defaults were removed before the first source-import commit.

Before any public visibility change:
- Check the new commit history contains only this repository's clean initialization and subsequent source imports.
- Verify the app has an empty new-user checklist, with no private products, prices or shopping URLs bundled.
- Keep all Android signing keys, passwords and backup JSON files off GitHub.
- Validate the APK's real-world behavior and open-source artwork licensing.

Do not fork, mirror, or push old branches from the private personal source repository.

## 4. Configure signed community builds

Follow `docs/RELEASE_SIGNING.md`. Generate the release key on your own PC and store four signing secrets in the NEW repository. Never give those secrets to another person or commit them.

Run **Actions → Build signed community release APK → Run workflow**. Verify the resulting artifact contains one signed APK with package ID `com.aryaan.pcsetup.community`.

The older private debug app stays installed independently. Export its personal data, import into the newly signed app, and verify the results before removing anything.

## 5. Publish cautiously

Before changing visibility to Public:
- [ ] All v1.4.1 phone tests, including saved feedback comments, pass on the new signed build.
- [ ] Fresh installations have an empty Preset #1 and show currency/Terms/welcome onboarding.
- [ ] Imported old personal presets survive force-close and restart.
- [ ] APK certificate SHA-256 is recorded and backed up with the keystore.
- [ ] Consistent package name and versionCode increment policy documented.
- [ ] The approved MIT `LICENSE` is present.
- [ ] README, contribution guidelines and privacy description are accurate.
- [ ] Launcher icon, fonts, images, and other third-party assets are legally redistributable.
- [ ] No sensitive information exists in any tracked file or new commit.
- [ ] Issue templates/feedback destination are available if desired.

Then and only then, in the NEW repository, go to **Settings → General → Danger Zone → Change repository visibility → Public**. Keep the old private repository unchanged.

Create **Releases → Draft a new release**, set a `v1.4.1` tag, describe the changes and attach **the exact signed APK from the verified workflow**. Do not attach a `debug` APK as the official release.

## Future updates

Increment `versionCode` for each update, keep the same `com.aryaan.pcsetup.community` Android package name and signing key, and run the protected/manual signed workflow. Never put the signing key in the source repository.
