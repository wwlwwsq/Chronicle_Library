package com.mybook.android;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** WebView 资源/控制台诊断日志，落盘 filesDir/weblog.txt，启动时弹窗可复制。 */
public final class WebLog {

    private static final int MAX_BYTES = 64 * 1024;

    private WebLog() {
    }

    public static synchronized void log(Context c, String line) {
        try {
            File f = file(c);
            if (f.length() > MAX_BYTES) {
                f.delete();
            }
            String ts = new SimpleDateFormat("MM-dd HH:mm:ss", Locale.US).format(new Date());
            try (FileOutputStream fos = c.openFileOutput("weblog.txt", Context.MODE_APPEND)) {
                fos.write((ts + " " + line + "\n").getBytes("UTF-8"));
            }
        } catch (Exception ignored) {
        }
    }

    public static File file(Context c) {
        return new File(c.getFilesDir(), "weblog.txt");
    }
}
