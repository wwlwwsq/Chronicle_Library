package com.mybook.android;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * 崩溃现场写入 filesDir/last-crash.txt，下次启动由 MainActivity 弹窗展示。
 * 设备无法连 adb 时也能拿到闪退堆栈。
 */
public final class CrashGuard {

    private CrashGuard() {
    }

    public static void install(Context ctx) {
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try {
                File out = new File(ctx.getFilesDir(), "last-crash.txt");
                try (OutputStream os = new FileOutputStream(out)) {
                    os.write(Log.getStackTraceString(e).getBytes("UTF-8"));
                }
            } catch (Exception ignored) {
            }
            if (prev != null) {
                prev.uncaughtException(t, e);
            }
        });
    }

    public static File crashFile(Context ctx) {
        return new File(ctx.getFilesDir(), "last-crash.txt");
    }
}
