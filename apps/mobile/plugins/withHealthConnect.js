const { withMainActivity, withAndroidManifest } = require('expo/config-plugins')

function withHealthConnectDelegate(config) {
  return withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents

    const importLine = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate'
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        'import com.facebook.react.ReactActivity',
        `${importLine}\nimport com.facebook.react.ReactActivity`
      )
    }

    const delegateCall = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)'
    if (!contents.includes(delegateCall)) {
      contents = contents.replace(
        'super.onCreate(null)',
        `${delegateCall}\n    super.onCreate(null)`
      )
    }

    cfg.modResults.contents = contents
    return cfg
  })
}

function withHealthConnectRationale(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest
    const app = manifest.application?.[0]
    if (!app) return cfg

    const mainActivity = app.activity?.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    )
    if (!mainActivity) return cfg

    const filters = mainActivity['intent-filter'] || []

    // Remove any existing rationale intent-filters added by the library plugin
    // (they lack the DEFAULT category which HC's queryIntentActivities requires)
    const cleaned = filters.filter((f) => {
      const actions = f.action || []
      return !actions.some((a) => {
        const name = a.$?.['android:name'] || ''
        return name.includes('SHOW_PERMISSIONS_RATIONALE')
      })
    })

    // Add both rationale actions (old androidx + new API 34) with DEFAULT category
    cleaned.push({
      action: [
        { $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } },
      ],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
      ],
    })

    cleaned.push({
      action: [
        { $: { 'android:name': 'android.health.connect.action.SHOW_PERMISSIONS_RATIONALE' } },
      ],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
      ],
    })

    mainActivity['intent-filter'] = cleaned
    return cfg
  })
}

module.exports = function withHealthConnect(config) {
  config = withHealthConnectDelegate(config)
  config = withHealthConnectRationale(config)
  return config
}
