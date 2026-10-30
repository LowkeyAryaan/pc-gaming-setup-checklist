package com.aryaan.pcsetup;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.InputStream;
import android.content.ActivityNotFoundException;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout activityRoot;
    private FrameLayout instantWelcome;
    private boolean webUiReady = false;
    private static final int FILE_PICKER_REQUEST = 9002;
    private static final int BACKUP_SAVE_REQUEST = 9003;
    private String pendingBackupJson;
    private ValueCallback<Uri[]> filePickerCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Show the approved welcome artwork immediately while WebView initializes.
        // The splash disappears only after the webpage has painted its real
        // welcome/onboarding screen, avoiding a flash of the checklist.
        activityRoot = new FrameLayout(this);
        activityRoot.setBackgroundColor(Color.rgb(8, 14, 27));
        instantWelcome = buildInstantWelcome();
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8, 14, 27));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);

        web.addJavascriptInterface(new StartupBridge(), "AndroidStartup");
        web.addJavascriptInterface(new BackupBridge(), "AndroidBackup");
        web.addJavascriptInterface(new FeedbackBridge(), "AndroidFeedback");
        web.addJavascriptInterface(new ClipboardBridge(), "AndroidClipboard");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Only intercept taps/navigation in the main page, not subresources.
                return request.isForMainFrame() && openExternalLink(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternalLink(Uri.parse(url));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (filePickerCallback != null) {
                    filePickerCallback.onReceiveValue(null);
                }
                filePickerCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILE_PICKER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    filePickerCallback.onReceiveValue(null);
                    filePickerCallback = null;
                    Toast.makeText(MainActivity.this, "No file picker is available.", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        activityRoot.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        activityRoot.addView(instantWelcome, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(activityRoot);
        web.loadUrl("file:///android_asset/index.html");
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private FrameLayout buildInstantWelcome() {
        FrameLayout stage = new FrameLayout(this);
        stage.setBackgroundColor(Color.rgb(8, 14, 27));

        try (InputStream in = getAssets().open("welcome.jpg")) {
            Bitmap background = BitmapFactory.decodeStream(in);
            if (background != null) {
                ImageView photo = new ImageView(this);
                photo.setImageBitmap(background);
                photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
                stage.addView(photo, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            }
        } catch (Exception ignored) {
            // Offline fallback: the same dark background as the HTML welcome.
        }

        View shade = new View(this);
        shade.setBackground(new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0x3A050A14, 0x88050A14, 0xFA060D1B}));
        stage.addView(shade, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView kicker = new TextView(this);
        kicker.setText("PLAN  ·  TRACK  ·  BUILD");
        kicker.setTextSize(11);
        kicker.setTextColor(Color.rgb(163, 249, 202));
        kicker.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        kicker.setGravity(Gravity.CENTER);
        content.addView(kicker);

        TextView title = new TextView(this);
        title.setText("My PC &\nGaming Setup");
        title.setTextSize(34);
        title.setTextColor(Color.WHITE);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dp(16);
        content.addView(title, titleParams);

        TextView tagline = new TextView(this);
        tagline.setText("Your dream build starts here.");
        tagline.setTextSize(14);
        tagline.setTextColor(0xFFD1DBE6);
        tagline.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams tagParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tagParams.topMargin = dp(12);
        content.addView(tagline, tagParams);

        TextView buttonVisual = new TextView(this);
        buttonVisual.setText("Let's build your dream setup!");
        buttonVisual.setTextSize(15);
        buttonVisual.setTextColor(0xFF08201A);
        buttonVisual.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        buttonVisual.setGravity(Gravity.CENTER);
        GradientDrawable buttonBackground = new GradientDrawable();
        buttonBackground.setColor(0xFF79F4AA);
        buttonBackground.setCornerRadius(dp(15));
        buttonVisual.setBackground(buttonBackground);
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(56));
        buttonParams.topMargin = dp(22);
        content.addView(buttonVisual, buttonParams);

        TextView credit = new TextView(this);
        credit.setText("Made by Aryaan  ·  @aryaan_creates");
        credit.setTextSize(12);
        credit.setGravity(Gravity.CENTER);
        credit.setTextColor(0xFFCADCE8);
        LinearLayout.LayoutParams creditParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        creditParams.topMargin = dp(20);
        content.addView(credit, creditParams);

        FrameLayout.LayoutParams bodyParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        bodyParams.setMargins(dp(24), 0, dp(24), dp(72));
        stage.addView(content, bodyParams);
        return stage;
    }

    private class StartupBridge {
        @JavascriptInterface
        public void ready() {
            runOnUiThread(() -> {
                if (webUiReady || instantWelcome == null) return;
                webUiReady = true;
                FrameLayout overlay = instantWelcome;
                overlay.animate().alpha(0f).setDuration(120).withEndAction(() -> {
                    if (activityRoot != null) activityRoot.removeView(overlay);
                    instantWelcome = null;
                }).start();
            });
        }
    }

    private class FeedbackBridge {
        // We never transmit feedback in the background. An email client must
        // open a draft, and the person sending it must explicitly tap Send.
        @JavascriptInterface
        public void composeEmail(String message) {
            if (message == null || message.trim().isEmpty() || message.length() > 12000) return;
            runOnUiThread(() -> {
                final String recipient = "aryaanmikaeel@gmail.com";
                final String subject = "PC Gaming Setup Checklist feedback";
                // Include the address and both fields in the mailto URI for
                // email clients that don't honor Intent.EXTRA_TEXT.
                Uri mailto = Uri.parse("mailto:" + recipient
                        + "?subject=" + Uri.encode(subject)
                        + "&body=" + Uri.encode(message));
                Intent email = new Intent(Intent.ACTION_SENDTO, mailto);
                email.putExtra(Intent.EXTRA_EMAIL, new String[]{recipient});
                email.putExtra(Intent.EXTRA_SUBJECT, subject);
                email.putExtra(Intent.EXTRA_TEXT, message);
                try {
                    startActivity(Intent.createChooser(email, "Send feedback by email"));
                } catch (ActivityNotFoundException error) {
                    Toast.makeText(MainActivity.this,
                            "No email app is installed. Your saved comment is still available.",
                            Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    private class ClipboardBridge {
        @JavascriptInterface
        public boolean copy(String text) {
            if (text == null || text.length() > 250000) return false;
            try {
                ClipboardManager clipboard=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) return false;
                clipboard.setPrimaryClip(ClipData.newPlainText("Checklist", text));
                return true;
            } catch (Exception error) {
                return false;
            }
        }
    }

    private class BackupBridge {
        @JavascriptInterface
        public void saveJson(String json) {
            if (json == null || json.length() > 30000000) return;
            runOnUiThread(() -> {
                pendingBackupJson = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "pc-gaming-setup-backup.json");
                try {
                    startActivityForResult(intent, BACKUP_SAVE_REQUEST);
                } catch (ActivityNotFoundException error) {
                    pendingBackupJson = null;
                    Toast.makeText(MainActivity.this, "No document saver installed.", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == BACKUP_SAVE_REQUEST) {
            String json = pendingBackupJson;
            pendingBackupJson = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && json != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    if (output == null) throw new java.io.IOException("Cannot open destination");
                    output.write(json.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Backup saved successfully.", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Failed to save backup.", Toast.LENGTH_LONG).show();
                }
            }
            return;
        }
        if (requestCode == FILE_PICKER_REQUEST && filePickerCallback != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePickerCallback.onReceiveValue(result);
            filePickerCallback = null;
        }
    }

    @Override
    protected void onDestroy() {
        if (filePickerCallback != null) {
            filePickerCallback.onReceiveValue(null);
            filePickerCallback = null;
        }
        super.onDestroy();
    }

    private boolean openExternalLink(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null ||
            (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http"))) {
            return false;
        }

        // Prefer the Chrome app. If it's not installed, use the system browser.
        Intent browser = new Intent(Intent.ACTION_VIEW, uri);
        browser.addCategory(Intent.CATEGORY_BROWSABLE);
        browser.setPackage("com.android.chrome");
        try {
            startActivity(browser);
        } catch (ActivityNotFoundException chromeMissing) {
            browser.setPackage(null);
            try {
                startActivity(browser);
            } catch (ActivityNotFoundException noBrowser) {
                Toast.makeText(this, "No web browser is installed.", Toast.LENGTH_LONG).show();
            }
        }

        // Don't replace the checklist page. Android Back from the browser
        // returns to this still-open Activity and preserves the WebView state.
        return true;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
