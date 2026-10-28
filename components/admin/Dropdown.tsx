'use client'

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DropdownOption {
  value: string
  label: string
  title?: string
  searchText?: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  menuPlacement?: 'top' | 'bottom'
}

/** 后台下拉选择：调用方式沿用旧的 Dropdown，样式换成 coss 的 Select。 */
export function Dropdown({ options, value, onChange, placeholder = '请选择', className, disabled }: DropdownProps) {
  const items = options.map(({ value: v, label }) => ({ value: v, label }))
  return (
    <Select
      value={value}
      items={items}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next)
      }}
    >
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} title={option.title}>
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
