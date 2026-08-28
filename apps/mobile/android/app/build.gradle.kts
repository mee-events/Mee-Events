import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseSigningPropertiesFile = rootProject.file("key.properties")
val releaseSigningProperties = Properties()
if (releaseSigningPropertiesFile.isFile) {
    releaseSigningPropertiesFile.inputStream().use(releaseSigningProperties::load)
}

fun releaseSigningValue(propertyName: String, environmentName: String): String? =
    releaseSigningProperties
        .getProperty(propertyName)
        ?.trim()
        ?.takeIf(String::isNotEmpty)
        ?: System.getenv(environmentName)?.trim()?.takeIf(String::isNotEmpty)

val releaseSigningValues =
    mapOf(
        "storeFile" to releaseSigningValue("storeFile", "ANDROID_RELEASE_STORE_FILE"),
        "storePassword" to
            releaseSigningValue("storePassword", "ANDROID_RELEASE_STORE_PASSWORD"),
        "keyAlias" to releaseSigningValue("keyAlias", "ANDROID_RELEASE_KEY_ALIAS"),
        "keyPassword" to releaseSigningValue("keyPassword", "ANDROID_RELEASE_KEY_PASSWORD"),
    )
val configuredReleaseSigningValueCount = releaseSigningValues.values.count { it != null }
if (configuredReleaseSigningValueCount !in listOf(0, releaseSigningValues.size)) {
    throw GradleException(
        "Android release signing configuration is incomplete; provide all required values or none.",
    )
}
val releaseSigningConfigured = configuredReleaseSigningValueCount == releaseSigningValues.size
val releaseSigningStoreFile =
    releaseSigningValues["storeFile"]?.let(rootProject::file)
if (releaseSigningConfigured && releaseSigningStoreFile?.isFile != true) {
    throw GradleException("Android release signing keystore file was not found.")
}

android {
    namespace = "com.meeevents.mee_events"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        resValues = true
    }

    defaultConfig {
        applicationId = "com.meevent.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            applicationId = "com.meevent.app.dev"
            versionNameSuffix = "-dev"
            resValue("string", "app_name", "Mee Events Dev")
        }
        create("staging") {
            dimension = "environment"
            applicationId = "com.meevent.app.staging"
            versionNameSuffix = "-staging"
            resValue("string", "app_name", "Mee Events Staging")
        }
        create("prod") {
            dimension = "environment"
            applicationId = "com.meevent.app"
            resValue("string", "app_name", "Mee Events")
        }
    }

    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = releaseSigningStoreFile
                storePassword = releaseSigningValues.getValue("storePassword")
                keyAlias = releaseSigningValues.getValue("keyAlias")
                keyPassword = releaseSigningValues.getValue("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            if (releaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
