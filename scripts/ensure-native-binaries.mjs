import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const platform = `${process.platform}-${process.arch}`
const workerdBin = join(root, 'node_modules', '@cloudflare', `workerd-${platform}`, 'bin', 'workerd')

if (existsSync(workerdBin)) {
  process.exit(0)
}

const installer = join(root, 'node_modules', 'workerd', 'install.js')
if (!existsSync(installer)) {
  console.warn('[postinstall] workerd installer missing; run npm install again.')
  process.exit(0)
}

console.log('[postinstall] Installing workerd native binary…')
execSync(`node "${installer}"`, { stdio: 'inherit' })
