const { withAndroidManifest } = require('@expo/config-plugins')

module.exports = function withSingleTaskLaunchMode(config) {
  return withAndroidManifest(config, (mod) => {
    const mainApp = mod.modResults.manifest.application?.[0]
    if (mainApp?.activity) {
      for (const activity of mainApp.activity) {
        if (activity.$?.['android:name'] === '.MainActivity') {
          activity.$['android:launchMode'] = 'singleTask'
        }
      }
    }
    return mod
  })
}
