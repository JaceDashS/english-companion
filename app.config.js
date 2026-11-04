/** Expo configuration for the English companion. One screen codebase builds the web app and the Android app. */
export default {
  expo: {
    name: "English Companion",
    slug: "english-companion",
    version: "0.1.0",
    orientation: "default",
    userInterfaceStyle: "dark",
    scheme: "jaces-english",
    android: {
      package: "com.jaces.englishcompanion",
      versionCode: 1,
      permissions: [],
      allowBackup: false,
    },
    ios: { bundleIdentifier: "com.jaces.englishcompanion", supportsTablet: true },
    web: { bundler: "metro", output: "single", name: "English Companion", backgroundColor: "#15171c" },
    plugins: ["expo-secure-store", "./plugins/with-short-cmake-path.cjs"],
  },
};
