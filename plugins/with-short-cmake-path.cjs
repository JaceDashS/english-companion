const { withAppBuildGradle } = require("expo/config-plugins");
const path = require("node:path");

/** Keep generated C++ paths short on Windows while the source stays in its workspace. */
module.exports = function withShortCmakePath(config) {
  return withAppBuildGradle(config, (config) => {
    const staging = path.resolve(config.modRequest.projectRoot, ".cxx").replace(/\\/g, "/");
    config.modResults.contents +=
      '\nandroid {\n    externalNativeBuild { cmake { buildStagingDirectory file("' +
      staging +
      '") } }\n    defaultConfig { externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=250" } } }\n}\n';
    return config;
  });
};
