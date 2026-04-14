/**
 * Expo config plugin — fixes iOS build failures when the project path contains spaces.
 *
 * The "Bundle React Native code and images" script phase uses backtick execution
 * without quoting the result, so a path like "/App Claude/..." gets word-split
 * by the shell and the build fails with "No such file or directory".
 *
 * This plugin runs after every `expo prebuild` and patches project.pbxproj
 * to wrap the backtick in "$(...)" so spaces in the path are handled correctly.
 */

const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

module.exports = function withFixSpacesInPath(config) {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const pbxprojPath = path.join(
        mod.modRequest.platformProjectRoot,
        `${mod.modRequest.projectName}.xcodeproj`,
        'project.pbxproj'
      )

      let contents = fs.readFileSync(pbxprojPath, 'utf8')

      // Fix: unquoted backtick exec of react-native-xcode.sh
      // Before: `"$NODE_BINARY" --print "...react-native-xcode.sh"`
      // After:  "$("$NODE_BINARY" --print "...react-native-xcode.sh")"
      const broken = '`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`'
      const fixed  = '\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"'

      if (contents.includes(broken)) {
        contents = contents.replace(broken, fixed)
        fs.writeFileSync(pbxprojPath, contents, 'utf8')
        console.log('[withFixSpacesInPath] ✓ Patched Bundle React Native script phase in project.pbxproj')
      } else if (contents.includes('react-native-xcode.sh')) {
        console.log('[withFixSpacesInPath] Script phase already patched or has unexpected format — skipping')
      }

      return mod
    },
  ])
}
