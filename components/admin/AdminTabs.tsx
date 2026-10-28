'use client'

import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

interface AdminTab {
  id: string
  label: string
  content: ReactNode
}

/** 设置页的分栏：沿用旧 Tabs 的 tabs / defaultTab 写法，底层换成 coss 的 Tabs（下划线样式，窄屏可横向滚动）。 */
export function AdminTabs({ tabs, defaultTab }: { tabs: AdminTab[]; defaultTab?: string }) {
  return (
    <Tabs defaultValue={defaultTab || tabs[0]?.id} className="gap-5">
      <div className="-mx-1 overflow-x-auto border-b px-1">
        <TabsList variant="underline" className="w-max">
          {tabs.map((tab) => (
            <TabsTab key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsPanel key={tab.id} value={tab.id}>
          {tab.content}
        </TabsPanel>
      ))}
    </Tabs>
  )
}
