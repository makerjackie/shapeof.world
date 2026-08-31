import { createFileRoute, redirect } from '@tanstack/react-router'

// /worlds 已并入首页目录区（#home-worlds），旧链接统一跳转
export const Route = createFileRoute('/worlds')({
  beforeLoad: () => {
    throw redirect({ to: '/', hash: 'home-worlds' })
  },
})
