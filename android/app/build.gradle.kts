plugins {
    id("com.android.application")
}

android {
    namespace = "com.mybook.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mybook.android"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "2.0.4"
        // 桌面/移动壳统一走「内嵌服务器 + /api 反代」，前端始终同源相对路径访问 API。
        // 这里只配置代理目标；后端迁移时改这一行重打包即可（无需重新构建静态站点）。
        buildConfigField("String", "API_BASE", "\"http://47.115.213.132:3100\"")
    }

    signingConfigs {
        create("release") {
            // 自签名密钥随仓库提交（个人应用），保证后续版本升级签名一致
            storeFile = rootProject.file("mybook-release.keystore")
            storePassword = "mybook2026"
            keyAlias = "mybook"
            keyPassword = "mybook2026"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        checkReleaseBuilds = false
    }
}

dependencies {
    // 轻量内嵌 HTTP 服务器，承载静态站点与 /api 代理（对应桌面壳里手写的 node http server）。
    // 刻意不引入 androidx/appcompat：纯原生 Activity，无主题兼容约束，闪退面更小。
    implementation("org.nanohttpd:nanohttpd:2.3.1")
}
