import { useEffect, useRef, useState } from 'react'
import { FiCopy, FiPlay, FiRefreshCw, FiThumbsDown, FiThumbsUp } from 'react-icons/fi'
import { RiSparklingFill } from 'react-icons/ri'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import ChatBody from '../components/ChatBody.jsx'
import ChatInput from '../components/ChatInput.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio.'))
    reader.readAsDataURL(blob)
  })
}

function normalizeAssistantText(text = '') {
  let cleaned = String(text).trim()
  if (cleaned.length >= 2 && cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  cleaned = cleaned.replace(/\r\n/g, '\n')
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')
  return cleaned
}

function renderAssistantMessage(text) {
  const cleaned = normalizeAssistantText(text)
  if (!cleaned) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
        ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-600">{children}</blockquote>
        ),
        h1: ({ children }) => <h1 className="text-base font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
        code: ({ inline, className, children }) => {
          if (inline) {
            return <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-700">{children}</code>
          }
          const lang = (className || '').replace('language-', '').trim() || 'Code'
          const codeText = String(children || '')
          const handleCopy = () => {
            if (!codeText.trim()) return
            navigator.clipboard?.writeText(codeText)
          }
          return (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">&lt;/&gt;</span>
                  <span className="font-semibold text-slate-100">{lang}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                  >
                    <FiCopy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                  >
                    <FiPlay className="h-3.5 w-3.5" />
                    Run
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto p-4 text-[0.85em] leading-relaxed text-slate-100">
                <code>{codeText}</code>
              </pre>
            </div>
          )
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ children, href }) => (
          <a className="text-teal-600 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {cleaned}
    </ReactMarkdown>
  )
}

function DashboardPage({ size }) {
  const isMobile = size === 'mobile'
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('gemini-2.5-flash')
  const [audioFile, setAudioFile] = useState(null)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isFollowing, setIsFollowing] = useState(true)
  const listRef = useRef(null)
  const latestUserRef = useRef(null)

  // Index of the last user message
  const lastUserIdx = messages.reduce((acc, m, i) => (m.role === 'user' ? i : acc), -1)

  // Scroll latest user message to top of container with a viewport-relative offset
  const scrollToUser = () => {
    const el = listRef.current
    const target = latestUserRef.current
    if (!el || !target) return
    const offset = Math.min(25, Math.max(70, window.innerHeight * 0.25))
    el.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!isFollowing) return
    scrollToUser()
  }, [messages])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsFollowing(distanceFromBottom <= 48)
  }

  const scrollToLatest = () => {
    scrollToUser()
    setIsFollowing(true)
  }

  const handleSubmit = async () => {
    const trimmedValue = inputValue.trim()
    const imageFiles = attachedFiles.filter((file) => file.type.startsWith('image/'))
    let images = []
    let audioPayload = null
    try {
      images = imageFiles.length
        ? await Promise.all(
            imageFiles.map(async (file) => ({
              name: file.name,
              type: file.type,
              dataUrl: await readFileAsDataUrl(file),
            }))
          )
        : []
      audioPayload = audioFile
        ? {
            name: 'recording',
            type: audioFile.mimeType || 'audio/webm',
            duration: audioFile.duration ?? 0,
            dataUrl: await readBlobAsDataUrl(audioFile.blob),
          }
        : null
    } catch (err) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: `Error: ${err.message}` },
      ])
      return
    }

    if (!trimmedValue && images.length === 0 && !audioPayload) return
    const timestamp = Date.now()
    const assistantId = `${timestamp}-assistant`
    setIsFollowing(true)
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `${timestamp}-user`,
        role: 'user',
        text: trimmedValue,
        audio: audioFile ?? null,
        files: attachedFiles.map((f) => ({
          name: f.name,
          type: f.type,
          url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        })),
      },
    ])
    setInputValue('')
    setAudioFile(null)
    setAttachedFiles([])

    try {
      const response = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedValue, model: selectedModelId, images, audio: audioPayload }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : null

      if (!response.ok) {
        const fallback = data?.error || 'Request failed.'
        const details = data ? fallback : `Request failed. Status ${response.status}.`
        throw new Error(details)
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { id: assistantId, role: 'assistant', text: data.reply || '' },
      ])
    } catch (err) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: assistantId, role: 'assistant', text: `Error: ${err.message}` },
      ])
    }
  }

  const { t } = useTheme()

  return (
    <div className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden ${t.pageBg}`}>
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center px-4">
            <ChatBody variant="landing" size={size} />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
            {messages.map((message, index) => {
              const isLastUser = message.role === 'user' && index === lastUserIdx
              const isLastMsg = index === messages.length - 1
              return (
                <div
                  key={message.id}
                  ref={isLastUser ? latestUserRef : null}
                  style={isLastMsg && message.role === 'assistant' ? { minHeight: 'calc(100svh - 200px)' } : {}}
                >
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className={`max-w-[96%] -mr-5 rounded-2xl px-5 py-3 text-sm leading-6 ${t.userMsgBg} ${t.userMsgText}`}>
                        {message.text && <p>{message.text}</p>}
                        {message.files?.length > 0 && (
                          <div className={`${message.text ? 'mt-2' : ''} flex flex-wrap gap-2`}>
                            {message.files.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 overflow-hidden">
                                {f.url ? (
                                  <img src={f.url} alt={f.name} className="max-h-60 w-full rounded-xl object-cover" />
                                ) : (
                                  <div className="flex items-center gap-1.5 px-3 py-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span className="max-w-35 truncate text-xs text-slate-700">{f.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {message.audio && (
                          <div className={`${message.text ? 'mt-2' : ''} flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 px-3 py-2`}>
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 11V7a3 3 0 016 0v4" /></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-700">Voice recording</p>
                              <p className="text-[11px] text-slate-400">{formatDuration(message.audio.duration ?? 0)}</p>
                            </div>
                            <audio controls className="h-7 max-w-40" style={{ accentColor: '#14b8a6' }}>
                              <source src={message.audio.url} type={message.audio.mimeType} />
                            </audio>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-teal-500">
                        <RiSparklingFill className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`w-full max-w-[96%] -ml-[37px] rounded-2xl border px-5 py-3 shadow-sm ${t.inputContainer}`}>
                          <div className={`space-y-3 text-sm leading-7 ${t.assistantText}`}>
                            {renderAssistantMessage(message.text)}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button className={`rounded p-1 ${t.actionBtn}`}><FiThumbsUp className="h-4 w-4" /></button>
                          <button className={`rounded p-1 ${t.actionBtn}`}><FiThumbsDown className="h-4 w-4" /></button>
                          <button className={`rounded p-1 ${t.actionBtn}`}><FiRefreshCw className="h-4 w-4" /></button>
                          <button className={`rounded p-1 ${t.actionBtn}`}><FiCopy className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {messages.length > 0 && !isFollowing ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center">
          <button
            type="button"
            onClick={scrollToLatest}
            className={`pointer-events-auto rounded-full border px-4 py-1.5 text-xs font-medium shadow-sm ${t.scrollBtnBg}`}
          >
            ↓ Latest
          </button>
        </div>
      ) : null}

      <div className="shrink-0 px-6 pb-4 pt-3">
        <div className="mx-auto w-full max-w-4xl">
          <ChatInput
            placeholder="Ask anything"
            showAddButton={!isMobile}
            containerClassName={`${t.inputContainer} border-t-transparent shadow-md`}
            inputClassName={`text-base ${t.inputText}`}
            buttonClassName={t.inputBtn}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onSubmit={handleSubmit}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            audioFile={audioFile}
            onAudioRecorded={(file) => setAudioFile(file)}
            onRemoveAudio={() => setAudioFile(null)}
            attachedFiles={attachedFiles}
            onFilesAttached={(files) => setAttachedFiles((prev) => [...prev, ...files])}
            onRemoveFile={(i) => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
          />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
