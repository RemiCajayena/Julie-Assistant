const { withAndroidManifest, withAppBuildGradle, withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGradleExclusions(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    const exclusions = `
configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'support-annotations'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'animated-vector-drawable'
    exclude group: 'com.android.support', module: 'support-vector-drawable'
    exclude group: 'com.android.support', module: 'versionedparcelable'
    exclude group: 'com.android.support', module: 'appcompat-v7'
}`;

    if (!buildGradle.includes('configurations.all')) {
      buildGradle = buildGradle + '\n\n' + exclusions + '\n';
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
}

function withSplashScreenLogo(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const androidDir = path.join(config.modRequest.projectRoot, 'android');
      const drawableDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'drawable');
      
      // Crear directorio si no existe
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }
      
      // Crear un XML simple para el logo del splash screen
      const splashScreenLogoXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#6366f1"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM13,17h-2v-6h2v6zM13,9h-2L11,7h2v2z"/>
</vector>`;
      
      const logoFilePath = path.join(drawableDir, 'splashscreen_logo.xml');
      fs.writeFileSync(logoFilePath, splashScreenLogoXml);
      
      return config;
    },
  ]);
}

module.exports = function withAndroidManifestFix(config) {
  // Fix del AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    if (!androidManifest.manifest.$) {
      androidManifest.manifest.$ = {};
    }
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    
    if (!application.$) {
      application.$ = {};
    }
    application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
    application.$['tools:replace'] = 'android:appComponentFactory';
    
    return config;
  });
  
  // Fix de dependencias duplicadas
  config = withGradleExclusions(config);

  // Agregar gradle properties
  config = withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.useAndroidX',
      value: 'true'
    });
    config.modResults.push({
      type: 'property', 
      key: 'android.enableJetifier',
      value: 'true'
    });
    return config;
  });

  // Crear el logo del splash screen que falta
  config = withSplashScreenLogo(config);
  
  return config;
};