const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withFirebase = (config) => {
  // Agregar classpath de google-services al proyecto build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('google-services')) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s?{/,
      `dependencies {
        classpath 'com.google.gms:google-services:4.4.0'`
    );

    return config;
  });

  // Aplicar plugin de google-services al app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('com.google.gms.google-services')) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /apply plugin: "com.facebook.react"/,
      `apply plugin: "com.facebook.react"
apply plugin: 'com.google.gms.google-services'`
    );

    return config;
  });

  return config;
};

module.exports = withFirebase;
