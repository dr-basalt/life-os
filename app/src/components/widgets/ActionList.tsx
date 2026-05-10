'use client'

import { useTransition, type FC } from 'react'

type Task = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'waiting'
  priority?: number
  energy_level?: string
  estimated_minutes?: number
}

type Props = {
  tasks: Task[]
  onStatusChange?: (id: string, status: Task['status']) => Promise<void>
}

const energyIcon: Record<string, string> = { low: '🔋', medium: '⚡', high: '🔥' }
const statusNext: Record<Task['status'], Task['status']> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'done',
  cancelled: 'cancelled',
  waiting: 'todo',
}

export const ActionList: FC<Props> = ({ tasks, onStatusChange }) => {
  const [isPending, startTransition] = useTransition()

  const handle = (id: string, current: Task['status']) => {
    const next = statusNext[current]
    if (next === current || !onStatusChange) return
    startTransition(() => {
      onStatusChange(id, next)
    })
  }

  return (
    <div className="action-list">
      <h2 className="widget-title">Actions</h2>
      {tasks.length === 0 ? (
        <p className="muted">Aucune action</p>
      ) : (
        <ul className="task-list">
          {tasks.map(t => (
            <li key={t.id} className={`task-item status-${t.status}`}>
              <button
                className="task-check"
                onClick={() => handle(t.id, t.status)}
                disabled={isPending || t.status === 'done'}
                aria-label="Changer statut"
              >
                {t.status === 'done' ? '✓' : t.status === 'in_progress' ? '◎' : '○'}
              </button>
              <div className="task-content">
                <p className="task-title">{t.title}</p>
                <div className="task-meta">
                  {t.priority && (
                    <span className="task-priority">P{t.priority}</span>
                  )}
                  {t.energy_level && (
                    <span title={t.energy_level}>
                      {energyIcon[t.energy_level]}
                    </span>
                  )}
                  {t.estimated_minutes && (
                    <span className="task-time">{t.estimated_minutes}m</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
