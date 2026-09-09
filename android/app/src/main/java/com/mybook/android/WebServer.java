package com.mybook.android;

import android.content.res.AssetManager;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

/**
 * 内嵌静态服务器 + API 反向代理，架构与桌面壳 desktop/main.cjs 一致：
 * - 静态资源来自 assets/web（BUILD_STATIC=1 静态导出产物），未命中的无扩展名路径
 *   回退 index.html，使 /books/5、/blog/xxx 等客户端路由可直接打开和刷新；
 * - /api/* 原样转发到远端后端（请求头/请求体/响应体流式透传，不整块缓冲），
 *   因此前端始终以同源相对路径访问 API，凭据走 cookie（WebView 按 127.0.0.1 存储）+
 *   Bearer（localStorage token）双通道。
 */
public class WebServer extends NanoHTTPD {

    private static final String WEB_ROOT = "web";

    private final AssetManager assets;
    private final String apiBase;

    public WebServer(AssetManager assets, String apiBase) {
        super("127.0.0.1", 0); // 随机可用端口，避免与用户已开服务冲突
        this.assets = assets;
        this.apiBase = apiBase == null || apiBase.isEmpty()
                ? "http://127.0.0.1:1"
                : apiBase.replaceAll("/+$", "");
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        if (uri.contains("..")) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "bad path");
        }
        if (uri.equals("/api") || uri.startsWith("/api/")) {
            return proxy(session);
        }
        return serveStatic(uri);
    }

    // ---------- 静态资源 ----------

    private Response serveStatic(String uri) {
        String rel = WEB_ROOT + (uri.equals("/") ? "/index.html" : uri);
        byte[] body = readAsset(rel);
        if (body == null && !rel.substring(rel.lastIndexOf('/') + 1).contains(".")) {
            body = readAsset(WEB_ROOT + "/index.html"); // SPA 客户端路由回退
        }
        if (body == null) {
            body = readAsset(WEB_ROOT + "/404.html");
        }
        if (body == null) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404");
        }
        return newFixedLengthResponse(Response.Status.OK, mimeOf(rel),
                new ByteArrayInputStream(body), body.length);
    }

    private byte[] readAsset(String path) {
        try (InputStream in = assets.open(path); ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
            pipe(in, out);
            return out.toByteArray();
        } catch (IOException e) {
            return null;
        }
    }

    // ---------- API 代理 ----------

    private Response proxy(IHTTPSession session) {
        String query = session.getQueryParameterString();
        String target = apiBase + session.getUri()
                + (query != null && !query.isEmpty() ? "?" + query : "");
        HttpURLConnection conn;
        try {
            conn = (HttpURLConnection) new URL(target).openConnection();
        } catch (IOException e) {
            return jsonError("后端地址无效：" + target);
        }
        try {
            conn.setRequestMethod(session.getMethod().name());
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(120_000);
            copyRequestHeaders(session, conn);

            Method m = session.getMethod();
            boolean hasBody = m == Method.POST || m == Method.PUT
                    || m == Method.PATCH || m == Method.DELETE;
            if (hasBody) {
                conn.setDoOutput(true);
                String cl = session.getHeaders().get("content-length");
                if (cl != null) {
                    try {
                        conn.setFixedLengthStreamingMode(Long.parseLong(cl));
                    } catch (NumberFormatException nfe) {
                        conn.setChunkedStreamingMode(16 * 1024);
                    }
                } else {
                    conn.setChunkedStreamingMode(16 * 1024);
                }
                try (OutputStream out = conn.getOutputStream()) {
                    pipe(session.getInputStream(), out);
                }
            }

            int code = conn.getResponseCode();
            InputStream raw = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (raw == null) {
                raw = new ByteArrayInputStream(new byte[0]);
            }
            // NanoHTTPD 发送完成后会 close 该流；在其 close 时一并断开底层连接
            InputStream body = new FilterInputStream(raw) {
                @Override
                public void close() throws IOException {
                    super.close();
                    conn.disconnect();
                }
            };
            Response r = newFixedLengthResponse(statusOf(code), contentType(conn), body,
                    conn.getContentLengthLong());
            copyResponseHeaders(conn, r);
            return r;
        } catch (IOException e) {
            return jsonError("无法连接后端服务器（" + apiBase + "）：" + e.getMessage());
        }
    }

    private void copyRequestHeaders(IHTTPSession session, HttpURLConnection conn) {
        for (Map.Entry<String, String> h : session.getHeaders().entrySet()) {
            String k = h.getKey().toLowerCase(Locale.ROOT);
            // 逐跳头与由目标主机决定的头不透传（与桌面壳的转发规则一致）
            switch (k) {
                case "host":
                case "origin":
                case "referer":
                case "content-length":
                case "transfer-encoding":
                case "connection":
                case "keep-alive":
                case "expect":
                case "upgrade":
                    continue;
            }
            if (h.getValue() != null) {
                conn.setRequestProperty(h.getKey(), h.getValue());
            }
        }
    }

    private void copyResponseHeaders(HttpURLConnection conn, Response r) {
        for (Map.Entry<String, List<String>> e : conn.getHeaderFields().entrySet()) {
            String name = e.getKey();
            if (name == null) {
                continue; // 状态行
            }
            String lower = name.toLowerCase(Locale.ROOT);
            // 长度/逐跳头由 NanoHTTPD 管理；content-type 已在构造时指定
            if (lower.equals("content-length") || lower.equals("transfer-encoding")
                    || lower.equals("connection") || lower.equals("keep-alive")
                    || lower.equals("content-type")) {
                continue;
            }
            for (String v : e.getValue()) {
                r.addHeader(name, v);
            }
        }
    }

    private static Response.Status statusOf(int code) {
        Response.Status s = Response.Status.lookup(code);
        if (s != null) {
            return s;
        }
        return code < 400 ? Response.Status.OK
                : code < 500 ? Response.Status.BAD_REQUEST
                : Response.Status.INTERNAL_ERROR;
    }

    private static String contentType(HttpURLConnection conn) {
        String ct = conn.getContentType();
        return ct != null ? ct : "application/octet-stream";
    }

    private static Response jsonError(String message) {
        String body = "{\"error\":" + quote(message) + "}";
        // NanoHTTPD 状态枚举没有 502，用 500 承载网关类错误，语义由 body 里的 message 说明
        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,
                "application/json; charset=utf-8", body);
    }

    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') {
                sb.append('\\');
            }
            sb.append(c < 0x20 ? ' ' : c);
        }
        return sb.append('"').toString();
    }

    private static void pipe(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
    }

    private static String mimeOf(String path) {
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": return "text/html; charset=utf-8";
            case "js": return "application/javascript; charset=utf-8";
            case "mjs": return "application/javascript; charset=utf-8";
            case "css": return "text/css; charset=utf-8";
            case "json": case "map": return "application/json";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "avif": return "image/avif";
            case "gif": return "image/gif";
            case "svg": return "image/svg+xml";
            case "ico": return "image/x-icon";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }
}
