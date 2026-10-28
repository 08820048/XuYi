import type { ReactNode } from 'react'
import '@/app/inner-v2.css'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { ShellRoot } from './ShellRoot'
import type { Theme } from '@/lib/appearance'
import type { SiteNavLink } from '@/lib/site'

interface SiteShellProps {
  children: ReactNode
  navLinks?: SiteNavLink[]
  initialTheme?: Theme
  mainClassName?: string
  mainId?: string
  mainAriaLabel?: string
}

export function SiteShell({
  children,
  navLinks,
  mainClassName = 'kami-page-main',
  mainId,
  mainAriaLabel,
}: SiteShellProps) {
  return (
    <ShellRoot>
      <SiteHeader navLinks={navLinks} />
      <div className="site-shell-body">
        <main id={mainId} className={mainClassName} aria-label={mainAriaLabel}>
          {children}
        </main>
        <SiteFooter navLinks={navLinks} />
      </div>
    </ShellRoot>
  )
}
