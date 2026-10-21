import { resolve } from 'node:path'
import { generateRouteReservations } from './lib/route-reservations.mjs'
generateRouteReservations(resolve(import.meta.dirname, '..'), process.argv.includes('--check'))
