import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Orders } from './lib/db'
import { seedDemoOrders } from './lib/seedOrders'

async function bootstrap() {
  const root = createRoot(document.getElementById('root'))
  try {
    const existing = await Orders.list()
    if (existing.length === 0) {
      await seedDemoOrders()
    }
  } catch (err) {
    console.error('Demo data seeding failed:', err)
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
