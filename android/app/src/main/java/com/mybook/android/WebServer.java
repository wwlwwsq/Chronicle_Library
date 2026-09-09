package com.mybook.android;

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
 *
 * 资源读取抽象为 {@link AssetOpener}（不直接依赖 android AssetManager），
 * 使本类可在桌面 JVM 上编译并自测（见 selftest/ServeSelfTest.java）。
 */
public class WebServer extends NanoHTTPD {

    /** 按相对路径打开只读流；实现方为 AssetManager::open 或测试的文件系统。 */
    public interface AssetOpener {
        InputStream open(String path) throws IOException;
    }

    private static final String WEB_ROOT = "web";

    private final AssetOpener opener;
    private final String apiBase;

    public WebServer(AssetOpener opener, String apiBase) {
        super("127.0.0.1", 0); // 随机可用端口，避免与用户已开服务冲突
        this.opener = opener;
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
            rel = WEB_ROOT + "/index.html"; // SPA 客户端路由回退，MIME 按实际回退文件算
            body = readAsset(rel);
        }
        if (body == null) {
            rel = WEB_ROOT + "/404.html";
            body = readAsset(rel);
        }
        if (body == null) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404");
        }
        return newFixedLengthResponse(Response.Status.OK, mimeOf(rel),
                new ByteArrayInputStream(body), body.length);
    }

    private byte[] readAsset(String path) {
        try (InputStream in = opener.open(path); ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
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
            // 强制短连接：后端(Node) keep-alive 超时仅 5s，复用池中旧连接发 POST 会
            // "Read timed out"（非幂等请求 HttpURLConnection 不自动重试），故逐请求新建
            conn.setRequestProperty("Connection", "close");

            Method m = session.getMethod();
            boolean hasBody = m == Method.POST || m == Method.PUT
                    || m == Method.PATCH || m == Method.DELETE;
            if (hasBody) {
                String cl = session.getHeaders().get("content-length");
                long len = -1;
                if (cl != null) {
                    try {
                        len = Long.parseLong(cl.trim());
                    } catch (NumberFormatException ignored) {
                    }
                }
                // 请求体由 Content-Length 定界，只能精确转发 len 字节——读到 EOF 是错的
                //（连接在等响应，EOF 永远不会来，只会熬到 soTimeout 断线）
                if (len < 0) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST,
                            "application/json; charset=utf-8",
                            "{\"error\":\"缺少或非法的 Content-Length（代理不接受 chunked 请求体）\"}");
                }
                conn.setDoOutput(true);
                conn.setFixedLengthStreamingMode(len);
                try (OutputStream out = conn.getOutputStream()) {
                    long bytes = pipeN(session.getInputStream(), out, len);
                    if (bytes < len) {
                        throw new IOException("请求体未完整接收（" + bytes + "/" + len + "）");
                    }
                } catch (IOException e) {
                    throw new IOException("请求体转发阶段失败：" + describe(e), e);
                }
            }

            int code;
            try {
                code = conn.getResponseCode();
            } catch (IOException e) {
                throw new IOException("等待后端响应阶段失败：" + describe(e), e);
            }
            InputStream raw = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (raw == null) {
                raw = new ByteArrayInputStream(new byte[0]);
            }
            // 注意：HttpURLConnection 已自动解码 chunked 传输编码，raw 就是纯正文；
            // 后端无 Content-Length 时（total=-1）直接以 chunked 重新封帧透传即可
            // NanoHTTPD 发送完成后会 close 该流；在其 close 时一并断开底层连接
            InputStream body = new FilterInputStream(raw) {
                @Override
                public void close() throws IOException {
                    super.close();
                    conn.disconnect();
                }
            };
            long total = conn.getContentLengthLong();
            Response r = total >= 0
                    ? newFixedLengthResponse(statusOf(code), contentType(conn), body, total)
                    : newChunkedResponse(statusOf(code), contentType(conn), body);
            copyResponseHeaders(conn, r);
            return r;
        } catch (IOException e) {
            return jsonError("代理请求失败（目标 " + apiBase + "）：" + describe(e));
        }
    }

    /** 异常类名 + 堆栈前几帧：前端错误提示可直接定位是哪一步、哪个方向超时。 */
    private static String describe(IOException e) {
        StringBuilder msg = new StringBuilder(e.getClass().getSimpleName()).append(": ").append(e.getMessage());
        StackTraceElement[] st = e.getStackTrace();
        for (int i = 0; i < Math.min(4, st.length); i++) {
            msg.append("\n  at ").append(st[i]);
        }
        return msg.toString();
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

    /** 精确转发 len 字节（请求体按 Content-Length 定界），返回实际转发数。 */
    private static long pipeN(InputStream in, OutputStream out, long len) throws IOException {
        byte[] buf = new byte[64 * 1024];
        long total = 0;
        while (total < len) {
            int n = in.read(buf, 0, (int) Math.min(buf.length, len - total));
            if (n == -1) {
                break;
            }
            out.write(buf, 0, n);
            total += n;
        }
        return total;
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
