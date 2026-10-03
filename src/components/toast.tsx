import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { cx } from './ui'

type Tone = 'good' | 'bad'
type ShowToast = (message: string, tone?: Tone) => void

const ToastContext = createContext<ShowToast>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: Tone } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback<ShowToast>((message, tone = 'good') => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, tone })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2400)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4">
            <div
              key={toast.id}
              role="status"
              className="flex animate-rise items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-xl"
            >
              {toast.tone === 'good' ? (
                <CircleCheck className="size-4.5 text-lime" aria-hidden />
              ) : (
                <CircleAlert className={cx('size-4.5 text-[#ff8a8e]')} aria-hidden />
              )}
              {toast.message}
            </div>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
