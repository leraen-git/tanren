#!/usr/bin/env node
/**
 * Patches two React Native build scripts that don't quote shell paths,
 * causing builds to fail when the project directory contains spaces.
 *
 * Affected files (both in node_modules/react-native):
 *   scripts/xcode/with-environment.sh       — line: $1  → "$@"
 *   scripts/react_native_pods_utils/script_phases.rb — unquoted shell invocation
 *
 * These patches are safe to apply repeatedly (idempotent).
 */

const fs = require('fs')
const path = require('path')

const rnRoots = [
  // workspace-local copy (apps/mobile/node_modules/react-native)
  path.resolve(__dirname, '../apps/mobile/node_modules/react-native'),
  // root-level copy (node_modules/react-native) — patched for safety
  path.resolve(__dirname, '../node_modules/react-native'),
]

let patched = 0

for (const rnRoot of rnRoots) {
  if (!fs.existsSync(rnRoot)) continue

  // ── with-environment.sh ──────────────────────────────────────────────────
  const envSh = path.join(rnRoot, 'scripts/xcode/with-environment.sh')
  if (fs.existsSync(envSh)) {
    let src = fs.readFileSync(envSh, 'utf8')
    if (src.includes('\n  $1\n')) {
      src = src.replace('\n  $1\n', '\n  "$@"\n')
      fs.writeFileSync(envSh, src)
      console.log(`✔ Patched ${envSh}`)
      patched++
    }
  }

  // ── script_phases.rb ─────────────────────────────────────────────────────
  const rb = path.join(rnRoot, 'scripts/react_native_pods_utils/script_phases.rb')
  if (fs.existsSync(rb)) {
    let src = fs.readFileSync(rb, 'utf8')
    const bad = '/bin/sh -c "$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT"'
    const good = '/bin/sh "$WITH_ENVIRONMENT" "$SCRIPT_PHASES_SCRIPT"'
    if (src.includes(bad)) {
      src = src.replace(bad, good)
      fs.writeFileSync(rb, src)
      console.log(`✔ Patched ${rb}`)
      patched++
    }
  }
}

// ── expo-constants get-app-config-ios.sh ────────────────────────────────────
// The script does `basename $PROJECT_DIR` without quotes. When PROJECT_DIR
// contains spaces ("App Claude"), word-splitting gives basename the wrong
// token and the whole script exits 0 (no-op), so EXConstants.bundle never
// gets the app.config file, causing Constants.expoConfig to be null at runtime.
const expoConstantsDirs = [
  path.resolve(__dirname, '../node_modules/expo-constants'),
  path.resolve(__dirname, '../apps/mobile/node_modules/expo-constants'),
]
for (const dir of expoConstantsDirs) {
  const script = path.join(dir, 'scripts/get-app-config-ios.sh')
  if (!fs.existsSync(script)) continue
  let src = fs.readFileSync(script, 'utf8')
  if (src.includes('$(basename $PROJECT_DIR)')) {
    src = src.replace('$(basename $PROJECT_DIR)', '$(basename "$PROJECT_DIR")')
    fs.writeFileSync(script, src)
    console.log(`✔ Patched ${script}`)
    patched++
  }
}

// ── @react-native/virtualized-lists symlink ──────────────────────────────────
// npm hoists virtualized-lists to apps/mobile/node_modules/@react-native/
// but Metro's upward traversal from inside react-native/Libraries/ looks for
// it at react-native/node_modules/@react-native/virtualized-lists first.
// Create a symlink so both paths resolve to the same package.
const rnMobile = path.resolve(__dirname, '../apps/mobile/node_modules/react-native')
if (fs.existsSync(rnMobile)) {
  const target = path.resolve(__dirname, '../apps/mobile/node_modules/@react-native/virtualized-lists')
  const linkDir = path.join(rnMobile, 'node_modules/@react-native')
  const link = path.join(linkDir, 'virtualized-lists')
  if (fs.existsSync(target) && !fs.existsSync(link)) {
    fs.mkdirSync(linkDir, { recursive: true })
    fs.symlinkSync(target, link)
    console.log(`✔ Created symlink ${link} → ${target}`)
    patched++
  }
}

if (patched === 0) {
  console.log('patch-rn-space-paths: nothing to patch (already applied or files not found)')
} else {
  console.log(`patch-rn-space-paths: applied ${patched} patch(es)`)
}
