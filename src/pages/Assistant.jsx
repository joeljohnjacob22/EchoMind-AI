import React, { useState, useEffect } from 'react'
import { mockAIAnswer } from '../mock/data'

export default function Assistant() {
  useEffect(() => { document.body.classList.add('bg-assistant'); return () => document.body.classList.remove('bg-assistant') }, [])
  const [messages, setMessages] = useState([
    { id: 1, from: 'ai', text: 'Hi — ask me about this memory. Try: "Who is this?"' }
  ])
  const [input, setInput] = useState('')

  function send() {
    if (!input) return
    const user = { id: Date.now(), from: 'user', text: input }
    setMessages(m => [...m, user])
    const reply = { id: Date.now()+1, from: 'ai', text: mockAIAnswer(input) }
    setTimeout(() => setMessages(m => [...m, reply]), 600)
    setInput('')
  }

  return (
    <div className="assistant">
      <h2>AI Memory Assistant</h2>
      <div className="chat">
        {messages.map(m => (
          <div key={m.id} className={"bubble "+(m.from==='ai' ? 'ai' : 'user')}>{m.text}</div>
        ))}
      </div>
      <div className="chat-controls">
        <input aria-label="assistant-input" className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about a photo or memory" />
        <button className="large-btn" onClick={send}>Ask</button>
      </div>
    </div>
  )
}
