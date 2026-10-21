// Playwright comes from the site's own dependencies at the repository root.
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../../package.json', import.meta.url))
export const { chromium } = require('playwright')
export const BASE = `http://127.0.0.1:${process.env.PORT || 5330}`
