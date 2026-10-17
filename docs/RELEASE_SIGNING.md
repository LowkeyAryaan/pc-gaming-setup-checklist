# Secure release signing (Windows + GitHub Actions)

The community app uses the permanent Android package ID **`com.aryaan.pcsetup.community`** (from the existing package name plus the `.community` release suffix). It installs **beside** the older debug-signed personal app.

Android permits in-place APK updates only when the package IDs and signing certificates match. The existing debug APKs were signed by ephemeral GitHub Actions keys and **cannot be upgraded into the new community APK**. Export a backup from the old app, install the community app alongside it, then import the backup. Do **not** uninstall your old app until its data is safely transferred.

## 1. Generate YOUR private keystore locally

Never send your keystore or passwords to anyone in chat, and never commit them. On your **Windows PC**, install JDK 17 or newer if `keytool` is not available. In PowerShell, run:

```powershell
keytool -genkeypair -v -keystore "$HOME\pc-gaming-community-release.jks" -alias pcgaming -keyalg RSA -keysize 3072 -validity 10000 -storetype PKCS12
```

Follow the prompts and choose a **strong, unique password**. Save it in a secure password manager. PKCS12 generally uses the same password for the keystore and key. The alias is **pcgaming**.

Securely back up the keystore and password in at least two different locations, ideally one encrypted offline. Without the private key, you may be unable to update released APKs.

To inspect the **public** certificate fingerprint:

```powershell
keytool -list -v -keystore "$HOME\pc-gaming-community-release.jks" -alias pcgaming
```

Record the `SHA256:` fingerprint and compare it against later releases.

## 2. Add four GitHub Actions secrets

In your **new clean repository**, go to **Settings → Secrets and variables → Actions → New repository secret**. Create these exact four names:

| Secret | Value |
| --- | --- |
| `ANDROID_SIGNING_KEYSTORE_BASE64` | Base64 encoding of your private keystore file |
| `ANDROID_SIGNING_STORE_PASSWORD` | Your keystore password |
| `ANDROID_SIGNING_KEY_ALIAS` | `pcgaming` |
| `ANDROID_SIGNING_KEY_PASSWORD` | Your key password (typically the same as store password for PKCS12) |

To copy keystore base64 to your clipboard from PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\pc-gaming-community-release.jks")) | Set-Clipboard
```

Paste the result **only** into the GitHub secret form, never into a commit, issue, conversation or screenshot. Clear your clipboard afterwards.

**Base64 is not encryption.** The private GitHub Actions secret protects the encoded bytes. Limit repository and workflow write access.

## 3. Build the signed APK

Go to **Actions → Build signed community release APK → Run workflow**.

The manual-only workflow validates the project, restores the keystore temporarily from secrets, builds the `release` variant, verifies the signature and package ID, and uploads an artifact named **PC-Gaming-Setup-Checklist-v1.4.1-SIGNED**. It then removes the temporary key file.

If required secrets are missing, the job fails explicitly; it will **not** silently upload a debug or unsigned release.

Download the artifact and extract `PC-Gaming-Setup-Checklist-v1.4.1-signed.apk`.

## 4. Test migration without uninstalling

1. Export every preset from the old app separately, including images.
2. Verify the backup files exist and are readable.
3. Install the new community APK side-by-side; do not uninstall the previous version.
4. Complete onboarding, import your JSON backups into new presets, and verify savings, categories, notes and pictures.
5. Check Chrome links and restart persistence.
6. Test a later APK signed with the **same key** and an **increased versionCode** to confirm Android accepts normal updates.

Keep the package name `com.aryaan.pcsetup.community` and the same signing key for all future community versions.

## 5. Signing security

- Never commit `.jks`, `.p12`, secrets, passwords or signing-key base64.
- This workflow runs on **manual dispatch only**, not untrusted community pull requests.
- Review Gradle and release workflow changes before signing.
- GitHub Actions artifacts can expire. After verification, publish the exact signed APK as a GitHub Release asset.
- These instructions cover direct APK distribution; Google Play signing has a separate process.

Official references: https://developer.android.com/studio/publish/app-signing and https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
