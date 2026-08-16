// dsh-convnav host —— 左侧对话节点导航条
// 静态资源:/dsh-convnav/remixicon.css | /dsh-convnav/remixicon.woff2(客户端图标字体,本地托管无 CDN)
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const inject = ['webServer']

const __dir = dirname(fileURLToPath(import.meta.url))
let cached = null
async function getAssets() {
  if (cached) return cached
  const base = join(__dir, 'remixicon')
  const [css, woff2] = await Promise.all([
    readFile(join(base, 'remixicon.css'), 'utf8'),
    readFile(join(base, 'remixicon.woff2')),
  ])
  cached = { css, woff2 }
  return cached
}

function serve(body, type) {
  return async (req, res) => {
    try {
      const a = await getAssets()
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=86400' })
      res.end(a[body])
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(String(e && e.message ? e.message : e))
    }
  }
}

export function apply(ctx) {
  try {
    const webServer = ctx.get('webServer')
    if (!webServer) return
    webServer.register({ kind: 'exact', path: '/dsh-convnav/remixicon.css', handler: serve('css', 'text/css; charset=utf-8') })
    webServer.register({ kind: 'exact', path: '/dsh-convnav/remixicon.woff2', handler: serve('woff2', 'font/woff2') })
  } catch (e) {
    console.error('dsh-convnav registration failed: ' + String(e && e.message ? e.message : e))
  }
}
