import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import App from './App'
import { requestPersistence } from './media/storage'

// Best effort: ask the browser not to evict our data (granted automatically once installed on most browsers).
void requestPersistence()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
