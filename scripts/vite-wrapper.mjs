import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
const patch = pathToFileURL(path.join(__dirname, 'patch-child-process-exec.mjs')).href
const viteBin = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')

const child = spawn(process.execPath, ['--import', patch, viteBin, ...args], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
