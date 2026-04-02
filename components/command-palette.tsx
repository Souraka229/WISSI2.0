'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuizPaletteItems } from '@/app/actions/quiz'
import { Input } from '@/components/ui/input'
import { FileText, HelpCircle, LayoutList, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuizItem = { id: string; title: string }

type ListEntry =
  | { kind: 'quiz'; id: string; title: string }
  | { kind: 'action'; href: string; label: string; hint: string }

const FIXED_ACTIONS: ListEntry[] = [
  { kind: 'action', href: '/dashboard/create', label: 'Nouveau quiz', hint: 'N' },
  { kind: 'action', href: '/dashboard/sessions', label: 'Mes sessions', hint: 'S' },
  { kind: 'action', href: '/aide', label: 'Aide', hint: 'H' },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<QuizItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(async () => {
    if (loaded || loading) return
    setLoading(true)
    try {
      const data = await getQuizPaletteItems()
      setItems(data)
      setLoaded(true)
    } catch {
      setItems([])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [loaded, loading])

  const filteredQuizzes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((x) => x.title.toLowerCase().includes(q))
  }, [items, query])

  const entries = useMemo((): ListEntry[] => {
    const quizEntries: ListEntry[] = filteredQuizzes.map((x) => ({
      kind: 'quiz',
      id: x.id,
      title: x.title,
    }))
    return [...quizEntries, ...FIXED_ACTIONS]
  }, [filteredQuizzes])

  const entriesRef = useRef<ListEntry[]>(entries)
  entriesRef.current = entries
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    setSelected((s) => (entries.length === 0 ? 0 : Math.min(s, entries.length - 1)))
  }, [entries.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        void loadItems()
        setOpen((o) => !o)
        setQuery('')
        setSelected(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadItems])

  useEffect(() => {
    if (open) {
      void loadItems()
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [open, loadItems])

  useEffect(() => {
    if (!open) return
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      const list = entriesRef.current
      if (list.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((i) => (i + 1) % list.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((i) => (i - 1 + list.length) % list.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const entry = list[selectedRef.current]
        if (!entry) return
        if (entry.kind === 'quiz') {
          router.push(`/dashboard/quiz/${entry.id}`)
        } else {
          router.push(entry.href)
        }
        setOpen(false)
        return
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const k = e.key.toLowerCase()
        if (k === 'n') {
          e.preventDefault()
          router.push('/dashboard/create')
          setOpen(false)
        } else if (k === 's') {
          e.preventDefault()
          router.push('/dashboard/sessions')
          setOpen(false)
        } else if (k === 'h') {
          e.preventDefault()
          router.push('/aide')
          setOpen(false)
        }
      }
    }
    document.addEventListener('keydown', onDocKey)
    return () => document.removeEventListener('keydown', onDocKey)
  }, [open, router])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) setOpen(false)
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            placeholder="Rechercher un quiz…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            autoComplete="off"
          />
        </div>

        <div className="max-h-[min(50vh,320px)] overflow-y-auto p-2">
          {loading && !loaded ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
          ) : (
            <ul className="space-y-0.5" role="listbox">
              {entries.map((entry, idx) => {
                const active = idx === selected
                const Icon =
                  entry.kind === 'quiz'
                    ? FileText
                    : entry.href === '/dashboard/create'
                      ? Plus
                      : entry.href === '/dashboard/sessions'
                        ? LayoutList
                        : HelpCircle
                return (
                  <li key={entry.kind === 'quiz' ? entry.id : entry.href}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/80',
                      )}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => {
                        if (entry.kind === 'quiz') {
                          go(`/dashboard/quiz/${entry.id}`)
                        } else {
                          go(entry.href)
                        }
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {entry.kind === 'quiz' ? entry.title : entry.label}
                      </span>
                      {entry.kind === 'action' && (
                        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                          {entry.hint}
                        </kbd>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">↑↓</span> naviguer ·{' '}
          <span className="font-medium text-foreground/80">Entrée</span> ouvrir ·{' '}
          <span className="font-medium text-foreground/80">Échap</span> fermer ·{' '}
          <span className="font-medium text-foreground/80">Alt+N / S / H</span> actions rapides
        </div>
      </div>
    </div>
  )
}
