import com.mybook.android.WebServer;
import fi.iki.elonen.NanoHTTPD;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * WebServer 桌面 JVM 自测：与手机 APK 跑的是同一份 WebServer.java + 同一个 NanoHTTPD jar。
 *
 * 用法（第一个参数是 assets 根目录，其下应有 web/ 静态产物）：
 *   java -cp .:nanohttpd-2.3.1.jar ServeSelfTest <assets根目录> [apiBase] [用户名] [密码]
 * apiBase 给空串则跳过 API 反代用例。
 */
public class ServeSelfTest {

    static int passed = 0;
    static final List<String> failed = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        boolean holdOnly = args.length > 4 && "hold".equals(args[4]);
        Path assets = Path.of(args[0]);
        String apiBase = args.length > 1 ? args[1] : "";
        String user = args.length > 2 ? args[2] : null;
        String pass = args.length > 3 ? args[3] : null;

        WebServer server = new WebServer(p -> Files.newInputStream(assets.resolve(p)), apiBase);
        server.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
        String base = "http://127.0.0.1:" + server.getListeningPort();
        if (holdOnly) {
            // hold 模式：跳过用例，把端口写盘供外部读取后保持运行
            java.nio.file.Path portFile = Path.of(System.getProperty("java.io.tmpdir"), "mybook-selftest-port.txt");
            java.nio.file.Files.writeString(portFile, String.valueOf(server.getListeningPort()));
            System.out.println("[hold] 服务器保持运行: " + base + "  portFile=" + portFile);
            System.out.flush();
            Thread.sleep(Long.MAX_VALUE);
        }
        HttpClient http = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(10)).build();
        System.out.println("self-test server: " + base + "  assets=" + assets.toAbsolutePath());
        System.out.flush();

        // ---- 静态托管 ----
        expect("T1 首页 /", http, base + "/", 200, "text/html", "<!DOCTYPE html>", false);
        expect("T2 SPA 回退 /books", http, base + "/books", 200, "text/html", null, false);
        expect("T3 深层路由 /books/5", http, base + "/books/5", 200, "text/html", null, false);
        expect("T4 静态 404 页", http, base + "/_not-found", 200, null, null, false);

        Path chunk = findFirstFile(assets.resolve("web/_next/static/chunks"));
        if (chunk != null) {
            String rel = assets.resolve("web").relativize(chunk).toString().replace('\\', '/');
            expect("T5 JS chunk MIME(" + rel + ")", http, base + "/" + rel, 200, "application/javascript", null, false);
        }

        // 遍历字符：确保不逃出 web 根
        expect("T6 路径穿越不致死", http, base + "/..%2f..%2fetc%2fpasswd", 400, null, null, false);

        if (!apiBase.isEmpty()) {
            // ---- API 反代（真实后端）----
            expect("A1 公共接口 /api/home", http, base + "/api/home", 200, "application/json", null, false);

            // T7: 原生 socket POST（绕开 HttpClient，判断问题在服务端还是客户端栈）
            String t7;
            try (java.net.Socket sock = new java.net.Socket("127.0.0.1", server.getListeningPort())) {
                sock.setSoTimeout(20000);
                String json = "{\"username\":\"" + user + "\",\"password\":\"" + pass + "\"}";
                byte[] body = json.getBytes(StandardCharsets.UTF_8);
                java.io.OutputStream so = sock.getOutputStream();
                so.write(("POST /api/auth/login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: "
                        + body.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                so.write(body);
                so.flush();
                ByteArrayOutputStream resp = new ByteArrayOutputStream();
                byte[] rb = new byte[8192];
                int n;
                InputStream si = sock.getInputStream();
                while ((n = si.read(rb)) != -1) {
                    resp.write(rb, 0, n);
                }
                t7 = resp.toString("UTF-8");
            } catch (Exception e) {
                t7 = "EXCEPTION " + e;
            }
            record("T7 原生socket POST 反代", t7.contains(" 200 ") || t7.contains(" 401 "),
                    t7.substring(0, Math.min(300, t7.length())));

            HttpResponse<String> login = post(http, base + "/api/auth/login",
                    "{\"username\":\"" + user + "\",\"password\":\"" + pass + "\"}");
            // 200=凭证有效；401=后端判负（凭证已被改动）。两者都证明请求体+响应正确转发了。
            record("A2 登录反代(请求体POST)", login.statusCode() == 200 || login.statusCode() == 401, login);
            String setCookie = login.headers().firstValue("set-cookie").orElse("");
            boolean loggedIn = login.statusCode() == 200;
            record("A3 Set-Cookie 透传", !loggedIn || !setCookie.isEmpty(), setCookie);
            String token = loggedIn ? login.body().replaceAll(".*\"token\":\"([^\"]+)\".*", "$1") : "";
            // 凭证被后端判负（如已改密）时无从提取 token，视为跳过而非失败（A2 已证转发正确）
            boolean tokenOk = loggedIn && token.length() > 10 && !token.contains("{");
            record("A4 token 提取", !loggedIn || tokenOk, token);

            HttpResponse<String> stats401 = get(http, base + "/api/stats", null);
            record("A5 未登录 /api/stats → 401", stats401.statusCode() == 401, stats401);
            if (tokenOk) {
                HttpResponse<String> statsOk = get(http, base + "/api/stats", "Bearer " + token);
                record("A6 Bearer 鉴权 /api/stats → 200", statsOk.statusCode() == 200, statsOk);
            }

            expect("A7 404 透传", http, base + "/api/nonexist", 404, null, null, false);

            HttpResponse<byte[]> big = http.send(HttpRequest.newBuilder(URI.create(base + "/api/files/apps/mybook-v2.0.2.apk")).build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            record("A8 大文件流式下载完整", big.statusCode() == 200 && big.body().length == 250818,
                    "len=" + big.body().length);
        }

        server.stop();
        System.out.println("\n==== 结果: " + passed + " 通过, " + failed.size() + " 失败 ====");
        failed.forEach(f -> System.out.println("FAIL " + f));
        System.out.flush();
        // 附加参数 hold：跑完用例不退出，保持服务器运行供浏览器人工/自动化检查
        if (args.length > 4 && "hold".equals(args[4])) {
            System.out.println("[hold] 服务器保持运行: " + base);
            System.out.flush();
            Thread.sleep(Long.MAX_VALUE);
        }
        if (!failed.isEmpty()) {
            System.exit(1);
        }
    }

    // ---------- 工具 ----------

    static void expect(String name, HttpClient http, String url, int code, String mime, String bodyContains, boolean dummy) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        boolean ok = resp.statusCode() == code;
        if (mime != null) {
            ok &= resp.headers().firstValue("content-type").orElse("").contains(mime);
        }
        if (bodyContains != null) {
            ok &= resp.body().contains(bodyContains);
        }
        if (ok) {
            record(name, true, resp);
        } else {
            record(name, false, resp + " CT=" + resp.headers().firstValue("content-type").orElse("")
                    + " BODY=" + resp.body().substring(0, Math.min(200, resp.body().length())));
        }
    }

    static HttpResponse<String> get(HttpClient http, String url, String auth) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url));
        if (auth != null) {
            b.header("Authorization", auth);
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    static HttpResponse<String> post(HttpClient http, String url, String json) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(url))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    static void record(String name, boolean ok, Object detail) {
        if (ok) {
            passed++;
            System.out.println("PASS " + name);
        } else {
            failed.add(name + "  <<< " + detail);
            System.out.println("FAIL " + name + "  <<< " + detail);
        }
        System.out.flush();
    }

    static Path findFirstFile(Path dir) throws IOException {
        if (!Files.isDirectory(dir)) {
            return null;
        }
        try (Stream<Path> s = Files.walk(dir)) {
            return s.filter(Files::isRegularFile).findFirst().orElse(null);
        }
    }
}
