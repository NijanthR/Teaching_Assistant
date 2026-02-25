import { useCallback, useEffect, useRef, useState } from 'react'
import { FiArrowUp, FiChevronDown, FiFile, FiImage, FiMic, FiMicOff, FiPaperclip, FiX } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext.jsx'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const MODELS = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', badge: 'Google' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'Google' },
  { id: 'gpt-5', label: 'GPT-5', badge: 'OpenAI' },
  { id: 'gpt-4o', label: 'GPT-4o', badge: 'OpenAI' },
  { id: 'claude-4', label: 'Claude 4 Sonnet', badge: 'Anthropic' },
  { id: 'claude-3.5', label: 'Claude 3.5 Haiku', badge: 'Anthropic' },
]

function ChatInput({
  placeholder,
  showAddButton = false,
  containerClassName = '',
  inputClassName = '',
  buttonClassName = '',
  value = '',
  onChange,
  onSubmit,
  audioFile,
  onAudioRecorded,
  onRemoveAudio,
  attachedFiles = [],
  onFilesAttached,
  onRemoveFile,
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) onFilesAttached?.(files)
    e.target.value = ''
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <FiImage className="h-4 w-4" />
    return <FiFile className="h-4 w-4" />
  }
  const { t } = useTheme()
  const buttonClass = buttonClassName || t.inputBtn
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recordingSecondsRef = useRef(0)

  useEffect(() => { recordingSecondsRef.current = recordingSeconds }, [recordingSeconds])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    clearInterval(timerRef.current)
  }, [])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      setRecordingSeconds(0)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        onAudioRecorded?.({ blob, url, duration: recordingSecondsRef.current })
        setIsRecording(false)
        clearInterval(timerRef.current)
      }

      mediaRecorderRef.current = recorder
      recorder.start(100)
      setIsRecording(true)

      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('Microphone access was denied. Please allow microphone access and try again.')
    }
  }, [isRecording, stopRecording, onAudioRecorded])

  // Cleanup on unmount
  useEffect(() => () => {
    mediaRecorderRef.current?.stop()
    clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (value.trim() || audioFile || attachedFiles.length) onSubmit?.()
  }

  const canSend = !!(value.trim() || audioFile || attachedFiles.length)

  return (
    <div
      className={`relative flex w-full flex-col gap-2 rounded-2xl border px-4 pb-3 pt-4 shadow-sm overflow-visible ${containerClassName}`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* File attachment chips */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-2 pr-1 py-1">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-6 w-6 rounded object-cover shrink-0"
                />
              ) : (
                <span className="text-slate-500">{getFileIcon(file)}</span>
              )}
              <span className="max-w-30 truncate text-xs text-slate-700">{file.name}</span>
              <button
                onClick={() => onRemoveFile?.(i)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                title="Remove file"
              >
                <FiX className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio attachment chip */}
      {audioFile && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-600">
              <FiMic className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">Voice recording</p>
              <p className="text-[11px] text-slate-400">{formatDuration(audioFile.duration ?? 0)}</p>
            </div>
            <audio
              src={audioFile.url}
              controls
              className="h-7 max-w-40 shrink-0"
              style={{ accentColor: '#14b8a6' }}
            />
          </div>
          <button
            onClick={onRemoveAudio}
            className="ml-1 shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            title="Remove recording"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Text input or recording indicator */}
      {isRecording ? (
        <div className="flex items-center gap-2 py-1">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-500">Recording… {formatDuration(recordingSeconds)}</span>
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          className={`w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 truncate ${inputClassName}`}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showAddButton ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className={`grid h-8 w-8 place-items-center rounded-full transition ${t.inputBtnBg} ${buttonClass}`}
            >
              <FiPaperclip className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${t.inputBtnBg} ${buttonClass}`}
            >
              {selectedModel.label}
              <FiChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className={`absolute bottom-full right-0 mb-2 w-52 rounded-xl border py-1.5 shadow-lg z-50 ${t.inputDropdownBg}`}>
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model); setOpen(false) }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs transition ${
                      selectedModel.id === model.id ? t.inputDropdownActive : t.inputDropdownItem
                    }`}
                  >
                    <span>{model.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${t.inputDropdownBadge}`}>{model.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mic button */}
          <button
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording' : 'Record audio'}
            className={`relative grid h-8 w-8 place-items-center rounded-full transition ${
              isRecording
                ? 'bg-red-500 text-white shadow-md'
                : `${t.inputBtnBg} ${buttonClass}`
            }`}
          >
            {isRecording ? (
              <>
                <FiMicOff className="h-4 w-4" />
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-60" />
              </>
            ) : (
              <FiMic className="h-4 w-4" />
            )}
          </button>

          {/* Send button */}
          <button
            onClick={onSubmit}
            disabled={!canSend}
            className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-200 ${
              canSend
                ? 'bg-slate-900 text-white shadow-md hover:bg-slate-700 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send"
          >
            <FiArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
