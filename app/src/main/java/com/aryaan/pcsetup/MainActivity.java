package com.aryaan.pcsetup;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.HapticFeedbackConstants;
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
    private boolean hasResumedBefore = false;
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
        activityRoot.setBackgroundColor(Color.rgb(11, 14, 11));
        instantWelcome = buildInstantWelcome();
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 14, 11));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);

        web.addJavascriptInterface(new StartupBridge(), "AndroidStartup");
        web.addJavascriptInterface(new BackupBridge(), "AndroidBackup");
        web.addJavascriptInterface(new FeedbackBridge(), "AndroidFeedback");
        web.addJavascriptInterface(new ClipboardBridge(), "AndroidClipboard");
        web.addJavascriptInterface(new ProductLookupBridge(), "AndroidProductLookup");
        web.addJavascriptInterface(new PriceWatchBridge(), "AndroidPriceWatch");
        web.addJavascriptInterface(new HapticBridge(), "AndroidHaptics");
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
        // Fast, intentionally minimal native cover. Do not render a fake
        // Get Started button: that would visibly jump to the HTML layout and
        // look like a buffering / restarting welcome screen.
        FrameLayout stage = new FrameLayout(this);
        stage.setBackgroundColor(0xFF090C0A);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.brand_icon);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams =
            new LinearLayout.LayoutParams(dp(94), dp(94));
        logoParams.gravity = Gravity.CENTER_HORIZONTAL;
        content.addView(logo, logoParams);
        TextView label = new TextView(this);
        label.setText("SETUP CHECKLIST");
        label.setTextSize(14);
        label.setTextColor(0xFFF1F9E9);
        label.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        label.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        labelParams.gravity = Gravity.CENTER_HORIZONTAL;
        labelParams.topMargin = dp(18);
        content.addView(label, labelParams);
        stage.addView(content, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER));
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

    // A small bounded pool prevents a launch from opening many connections at once.
    private final java.util.concurrent.ExecutorService pricePool =
        java.util.concurrent.Executors.newFixedThreadPool(3);

    private class PriceWatchBridge {
        @JavascriptInterface
        public void checkBatch(String json, String token) {
            if(json==null||json.length()>160000||token==null||
                !token.matches("[A-Za-z0-9_-]{1,72}"))return;
            try{
                org.json.JSONArray batch=new org.json.JSONArray(json);
                if(batch.length()>400)return;
                for(int i=0;i<batch.length();i++){
                    org.json.JSONObject record=batch.optJSONObject(i);
                    if(record==null)continue;
                    String id=record.optString("id","");
                    String url=record.optString("url","");
                    if(!id.matches("[A-Za-z0-9_-]{1,90}")||
                        url.length()>2048||!url.startsWith("https://"))continue;
                    final String productId=id, requestUrl=url;
                    pricePool.execute(()->{
                        org.json.JSONObject response=ProductPageReader.readPrice(requestUrl);
                        runOnUiThread(()->{
                            if(web==null)return;
                            String js="window.PriceWatchUI && window.PriceWatchUI.receive("+
                                org.json.JSONObject.quote(token)+","+
                                org.json.JSONObject.quote(productId)+","+
                                org.json.JSONObject.quote(response.toString())+");";
                            web.evaluateJavascript(js,null);
                        });
                    });
                }
            }catch(Exception ignored){/* Invalid batches never affect saved prices. */}
        }
    }

    private class ProductLookupBridge {
        @JavascriptInterface
        public void lookup(String url, String requestId) {
            if (url == null || requestId == null || url.length() > 2048 ||
                    !requestId.matches("[0-9]{1,12}")) return;
            new Thread(() -> {
                String result = ProductPageReader.read(url).toString();
                runOnUiThread(() -> {
                    if (web == null) return;
                    String js = "window.ProductLinkImport && window.ProductLinkImport.receive(" +
                        org.json.JSONObject.quote(requestId) + "," +
                        org.json.JSONObject.quote(result) + ");";
                    web.evaluateJavascript(js, null);
                });
            }, "setup-product-metadata").start();
        }
    }

    private class HapticBridge {
        // Short, system-respecting tactile ticks, never a long vibrate.
        // No VIBRATE permission and no IGNORE_GLOBAL_SETTING flag.
        @JavascriptInterface
        public void pulse(String kind) {
            if (kind == null || !kind.matches("tap|navigate|select|long")) return;
            final int feedback;
            if ("long".equals(kind)) feedback = HapticFeedbackConstants.LONG_PRESS;
            else if ("navigate".equals(kind)) feedback = HapticFeedbackConstants.CLOCK_TICK;
            else feedback = HapticFeedbackConstants.VIRTUAL_KEY;
            runOnUiThread(() -> {
                if (web != null && web.isAttachedToWindow() && web.isHapticFeedbackEnabled())
                    web.performHapticFeedback(feedback);
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
    protected void onResume() {
        super.onResume();
        // Reopening an existing process counts as an app opening as well.
        // The JS controller throttles quick back-and-forth transitions.
        if(hasResumedBefore && web!=null)
            web.evaluateJavascript("window.dispatchEvent(new Event('setup-app-resumed'));",null);
        hasResumedBefore=true;
    }

    @Override
    protected void onDestroy() {
        if (filePickerCallback != null) {
            filePickerCallback.onReceiveValue(null);
            filePickerCallback = null;
        }
        pricePool.shutdownNow();
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
