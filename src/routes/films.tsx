import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/films')({
  component: Outlet,
})
