import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Importando as duas telas
import App from './App.jsx'        // Painel do Dono
import Cardapio from './Cardapio.jsx' // Cardápio do Cliente

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Link principal (Raiz) abre o Cardápio para o cliente */}
        <Route path="/" element={<Cardapio />} />
        
        {/* Link /admin abre o Painel para você */}
        <Route path="/admin" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)