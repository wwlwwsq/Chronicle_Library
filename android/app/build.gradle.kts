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
        versionCode = 1
        versionName = "2.0.0"
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
    implementation("androidx.appcompat:appcompat:1.7.0")
    // 轻量内嵌 HTTP 服务器，承载静态站点与 /api 代理（对应桌面壳里手写的 node http server）
    implementation("org.nanohttpd:nanohttpd:2.3.1")
    constraints {
        // kotlin-stdlib 1.8 起已并入 jdk7/jdk8 分包内容，androidx 各库带入的新旧分包会类重复，统一到 1.8.22
        implementation("org.jetbrains.kotlin:kotlin-stdlib:1.8.22")
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22")
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22")
    }
}
