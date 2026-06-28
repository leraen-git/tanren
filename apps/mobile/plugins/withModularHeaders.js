const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MODULAR_HEADERS = `
pod 'GoogleUtilities', :modular_headers => true
pod 'RecaptchaInterop', :modular_headers => true
`

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile')
      let contents = fs.readFileSync(podfilePath, 'utf8')

      if (contents.includes('GoogleUtilities') && contents.includes('modular_headers')) {
        console.log('[withModularHeaders] Podfile already patched — skipping')
        return mod
      }

      const targetLine = contents.indexOf("target 'Tanren' do")
      if (targetLine === -1) {
        console.warn('[withModularHeaders] Could not find target block in Podfile — skipping')
        return mod
      }

      contents = contents.slice(0, targetLine) + MODULAR_HEADERS + '\n' + contents.slice(targetLine)
      fs.writeFileSync(podfilePath, contents, 'utf8')
      console.log('[withModularHeaders] Patched Podfile with modular headers for Google pods')

      return mod
    },
  ])
}
