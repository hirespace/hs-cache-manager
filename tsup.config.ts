import { defineConfig } from 'tsup'

export default defineConfig([
  // Main build (server + browser compatible, with externalized deps)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.mjs' : '.cjs'
      }
    },
    target: 'node16',
    minify: false,
    treeshake: true,
    external: [
      'redis',
      '@upstash/redis', 
      '@vercel/kv',
      'crypto-js',
      'cookie',
      'cookies-next',
      'fs',
      'node:fs'
    ]
  },
  // Browser-specific build (no Node.js dependencies)
  {
    entry: ['src/browser.ts'],
    format: ['esm'],
    outDir: 'dist',
    dts: true,
    sourcemap: true,
    splitting: false,
    outExtension({ format }) {
      return {
        js: '.browser.mjs'
      }
    },
    target: 'es2020',
    minify: false,
    treeshake: true,
    external: [
      'cookies-next'
    ]
  }
]) 