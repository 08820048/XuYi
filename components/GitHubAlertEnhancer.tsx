'use client'

import { useEffect } from 'react'
import { applyGithubAlerts } from '@/lib/github-alerts'

export function GitHubAlertEnhancer({
  containerId,
  html,
}: {
  containerId: string
  html: string
}) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    applyGithubAlerts(root)
  }, [containerId, html])

  return null
}
