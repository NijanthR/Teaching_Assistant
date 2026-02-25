import { useEffect, useRef, useState } from 'react'
import { FiCopy, FiRefreshCw, FiThumbsDown, FiThumbsUp } from 'react-icons/fi'
import { RiSparklingFill } from 'react-icons/ri'

import ChatBody from '../components/ChatBody.jsx'
import ChatInput from '../components/ChatInput.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function DashboardPage({ size }) {
  const isMobile = size === 'mobile'
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
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

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim()
    if (!trimmedValue && !audioFile && attachedFiles.length === 0) return
    const timestamp = Date.now()
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
      { id: `${timestamp}-assistant`, role: 'assistant', text: "Thanks! I can help with that. What should we tackle first?" },
    ])
    setInputValue('')
    setAudioFile(null)
    setAttachedFiles([])
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
          <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
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
                      <div className={`max-w-[72%] rounded-2xl px-5 py-3 text-sm leading-6 ${t.userMsgBg} ${t.userMsgText}`}>
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
                            <audio src={message.audio.url} controls className="h-7 max-w-40" style={{ accentColor: '#14b8a6' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-teal-500">
                        <RiSparklingFill className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm leading-7 ${t.assistantText}`}>{message.text}</p>
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
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput
            placeholder="Ask anything"
            showAddButton={!isMobile}
            containerClassName={`${t.inputContainer} shadow-md`}
            inputClassName={`text-base ${t.inputText}`}
            buttonClassName={t.inputBtn}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onSubmit={handleSubmit}
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
