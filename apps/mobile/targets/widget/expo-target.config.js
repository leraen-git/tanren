/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "TanrenWidget",
  displayName: "Tanren",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  entitlements: {
    "com.apple.security.application-groups": ["group.app.tanren.shared"],
  },
  colors: {
    $accent: { color: "#E8192C", darkColor: "#FF2D3F" },
    $widgetBackground: { color: "#FFFFFF", darkColor: "#0A0A0A" },
  },
};
