import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 自定义域名挂在站点根路径，因此默认 '/'；若改部署到项目子路径，用 VITE_BASE=/repo/ 覆盖。
  const base = env.VITE_BASE || '/'
  const withBase = (file: string) => `${base.replace(/\/$/, '')}/${file.replace(/^\//, '')}`

  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [
      react(),
      // 只做静态资源预缓存与离线导航回退：不写自定义 sw.ts，不监听 push/notificationclick。
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // 由 usePwa 里的 useRegisterSW 单点注册，避免重复注入
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'timepin.png', 'splash.png'],
        manifest: {
          name: '时光扣 · TimePin',
          short_name: '时光扣',
          description: '用紧急度重新排列你的每一天。本地优先，离线完全可用，数据只存在这台设备上。',
          lang: 'zh-CN',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'any',
          theme_color: '#E5484D',
          background_color: '#F9FAFB',
          icons: [
            { src: withBase('icon-192.png'), sizes: '192x192', type: 'image/png' },
            { src: withBase('icon-512.png'), sizes: '512x512', type: 'image/png' },
            { src: withBase('icon-1024.png'), sizes: '1024x1024', type: 'image/png' },
            {
              src: withBase('icon-maskable-192.png'),
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: withBase('icon-maskable-512.png'),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            { src: withBase('monochrome.png'), sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,webmanifest}'],
          // 不要排除 workbox-window 开头的 chunk：它是 useRegisterSW 动态导入的运行时，
          // 缺了它会在离线重新注册时抛 ERR_INTERNET_DISCONNECTED。
          globIgnores: ['**/404.html', '**/CNAME', '**/.nojekyll', '**/sw.js'],
          // 离线上 /calendar 等深链直接由缓存的 index.html 响应，URL 保持原样，
          // 与 404.html 的在线回退形成双通道，两者都不触碰 IndexedDB。
          navigateFallback: withBase('index.html'),
          navigateFallbackDenylist: [/^\/404\.html$/, /^\/CNAME$/, /^\/\.nojekyll$/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        // dev 下提供可注册的 module SW（不缓存导航），避免 useRegisterSW 报 404。
        devOptions: { enabled: true, type: 'module' },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
