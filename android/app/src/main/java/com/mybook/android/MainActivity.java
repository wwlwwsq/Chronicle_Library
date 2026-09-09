package com.mybook.android;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * 原生 Activity（非 AppCompat）：不依赖 androidx，也不要求 Theme.AppCompat 系主题，
 * 上一版正是主题不匹配导致启动即闪退。文件选择走经典 onActivityResult。
 */
public class MainActivity extends Activity {

    private static final int REQ_FILE_CHOOSER = 1;

    private WebView webView;
    private WebServer server;
    private ValueCallback<Uri[]> pendingFileCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        CrashGuard.install(this);
        super.onCreate(savedInstanceState);

        showLastCrashIfAny();

        webView = new WebView(this);
        webView.setFitsSystemWindows(true); // targetSdk 35 在新系统上强制 edge-to-edge，避开状态栏
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // 登录 token 与书签/阅读进度存 localStorage
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("127.0.0.1".equals(uri.getHost())) {
                    return false; // 应用自身页面，WebView 内处理
                }
                // 外链（随笔外链、游戏"新窗口打开"）交给系统浏览器，与桌面壳一致
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                    WebResourceError error) {
                if (!request.isForMainFrame()) {
                    WebLog.log(MainActivity.this,
                            "ERR " + request.getUrl() + " : " + error.getDescription());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                    WebResourceResponse errorResponse) {
                if (!request.isForMainFrame()) {
                    WebLog.log(MainActivity.this, "HTTP " + errorResponse.getStatusCode()
                            + " " + request.getUrl() + " mime=" + errorResponse.getMimeType());
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                WebLog.log(MainActivity.this, "CONSOLE " + m.sourceId() + ":" + m.lineNumber()
                        + " " + m.message());
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                // 管理后台上传书籍/漫画需要系统文件选择器
                pendingFileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingFileCallback = null;
                    return false;
                }
            }
        });

        server = new WebServer(getAssets()::open, BuildConfig.API_BASE);
        try {
            // 注意：start 的第一个参数是「已接受连接的 soTimeout（毫秒）」而非端口；
            // 端口在 WebServer 构造器里固定传 0（随机）。之前误传 50 导致手机上一读超时就断连。
            server.start(15000, false);
        } catch (IOException e) {
            Toast.makeText(this, "本地服务启动失败：" + e.getMessage(), Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        webView.loadUrl("http://127.0.0.1:" + server.getListeningPort() + "/");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER && pendingFileCallback != null) {
            pendingFileCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            pendingFileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (server != null) {
            server.stop();
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    /** 上次闪退堆栈与 WebView 诊断日志在启动时弹窗展示，可一键复制发给开发者。 */
    private void showLastCrashIfAny() {
        StringBuilder sb = new StringBuilder();
        File crash = CrashGuard.crashFile(this);
        if (crash.exists()) {
            String c = readPrivateFile(crash);
            //noinspection ResultOfMethodCallIgnored
            crash.delete();
            if (c != null && !c.isEmpty()) {
                sb.append("== 闪退堆栈 ==\n").append(c).append("\n");
            }
        }
        File weblog = WebLog.file(this);
        if (weblog.exists()) {
            String w = readPrivateFile(weblog);
            //noinspection ResultOfMethodCallIgnored
            weblog.delete();
            if (w != null && !w.isEmpty()) {
                sb.append("== WebView 日志 ==\n").append(w);
            }
        }
        if (sb.length() == 0) {
            return;
        }
        String content = sb.toString();
        String shown = content.length() > 4000 ? content.substring(0, 4000) + "\n…" : content;
        new AlertDialog.Builder(this)
                .setTitle("上次运行的诊断日志")
                .setMessage(shown)
                .setPositiveButton("复制日志", (d, w) -> {
                    ClipboardManager cm = getSystemService(ClipboardManager.class);
                    if (cm != null) {
                        cm.setPrimaryClip(ClipData.newPlainText("mybook-diag", content));
                        Toast.makeText(this, "已复制", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("忽略", null)
                .show();
    }

    private static String readPrivateFile(File f) {
        try (InputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            return out.toString("UTF-8");
        } catch (IOException e) {
            return null;
        }
    }
}
