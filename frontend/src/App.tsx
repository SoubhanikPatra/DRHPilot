import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/**
 * App.tsx — top-level router shell.
 *
 * Pages are stubbed with placeholders so the scaffold compiles cleanly.
 * Replace each placeholder with the real page component as it is built.
 *
 * Route map:
 *   /          → ChatPage      (protected, step 12)
 *   /documents → DocumentsPage (protected, step 11)
 *   /login     → LoginPage     (public,    step 10)
 *   /signup    → SignupPage    (public,    step 10)
 */

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center text-gray-500">
      <p className="text-sm font-mono">{name} — coming soon</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="ChatPage" />} />
        <Route path="/documents" element={<Placeholder name="DocumentsPage" />} />
        <Route path="/login" element={<Placeholder name="LoginPage" />} />
        <Route path="/signup" element={<Placeholder name="SignupPage" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
