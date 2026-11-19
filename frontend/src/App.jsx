import { useCallback, useEffect, useState } from 'react'
import { createTodo, deleteTodo, listOverdue, listTodos, updateTodo } from './api.js'
import Filters from './components/Filters.jsx'
import TodoForm from './components/TodoForm.jsx'
import TodoList from './components/TodoList.jsx'
import './App.css'

export default function App() {
  const [view, setView] = useState('all') // 'all' | 'overdue'
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [todos, setTodos] = useState([])
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let ignore = false // drop stale responses when filters change quickly
    const request =
      view === 'overdue'
        ? listOverdue({ q: query })
        : listTodos({ q: query, includeArchived: showArchived })
    request
      .then((data) => {
        if (ignore) return
        setTodos(data)
        setError('')
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
    return () => {
      ignore = true
    }
  }, [view, query, showArchived, reloadKey])

  async function handleCreate(todo) {
    await createTodo(todo)
    reload()
  }

  async function mutate(id, changes) {
    try {
      await updateTodo(id, changes)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(todo) {
    if (!window.confirm(`Permanently delete "${todo.title}"?`)) return
    try {
      await deleteTodo(todo.id)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const [theme, setTheme] = useState(() => {
    const t = document.documentElement.dataset.theme
    if (t) return t
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // storage unavailable; theme applies for this session only
    }
  }

  return (
    <main className="app">
      <div className="header">
        <h1>To-Do</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <TodoForm onCreate={handleCreate} />
      <Filters
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <TodoList
        todos={todos}
        view={view}
        searching={query.trim() !== ''}
        onToggleComplete={(t) => mutate(t.id, { completed: !t.completed })}
        onToggleArchive={(t) => mutate(t.id, { archived: !t.archived })}
        onDelete={handleDelete}
      />
    </main>
  )
}
