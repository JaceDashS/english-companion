/** Expo configuration for the English companion. One screen codebase builds the web app and the Android app. */
export default {
  expo: {
    name: "English Companion",
    slug: "english-companion",
    version: "0.1.0",
    orientation: "default",
    userInterfaceStyle: "dark",
    scheme: "jaces-english",
    icon: "./assets/icon.png",
    android: {
      package: "com.jaces.englishcompanion",
      versionCode: 1,
      adaptiveIcon: { foregroundImage: "./assets/icon.png", backgroundColor: "#0f1513" },
      permissions: [],
      allowBackup: false,
    },
    ios: { bundleIdentifier: "com.jaces.englishcompanion", supportsTablet: true },
    web: { bundler: "metro", output: "single", name: "English Companion", backgroundColor: "#0f1513", favicon: "./assets/icon.png" },
    plugins: ["expo-secure-store", "./plugins/with-short-cmake-path.cjs"],
  },
};
