import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = '搜尋餐廳...' }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-2.5 transition ${
        focused ? 'border-green-500 shadow-sm ring-1 ring-green-100' : 'border-gray-200'
      }`}
    >
      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
