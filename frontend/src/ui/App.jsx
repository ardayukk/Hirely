import React, { useEffect, useState } from 'react'
import { api } from '../utils/api.js'

function App() {
  const [status, setStatus] = useState('checking...')
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    api.get('/api/health').then(r => setStatus(r.status)).catch(() => setStatus('error'))
    api.get('/api/jobs/').then(setJobs).catch(() => setJobs([]))
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, Arial', margin: '2rem' }}>
      <h1>Hirely</h1>
      <p>API status: <strong>{status}</strong></p>

      <h2>Jobs</h2>
      <ul>
        {jobs.map(j => (
          <li key={j.id}>
            <strong>{j.title}</strong> — {j.company} ({j.location})
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
