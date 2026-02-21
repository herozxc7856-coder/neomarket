import { useState } from 'react'
import { Headphones, Send, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '../utils/api'

export function Support() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !message.trim()) {
      toast.error('Заполните все поля')
      return
    }

    setLoading(true)
    try {
      await supportApi.createTicket({ subject, message }, files)
      toast.success('Обращение отправлено!')
      setSubmitted(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка отправки')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="card text-center">
          <div className="w-16 h-16 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-accent-green" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Обращение отправлено!</h2>
          <p className="text-gray-400 mb-6">
            Мы рассмотрим вашу заявку и ответим вам как можно скорее.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setSubject('')
              setMessage('')
              setFiles([])
            }}
            className="btn-primary"
          >
            Отправить еще одно
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <Headphones className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold">Поддержка</h1>
        <p className="text-gray-400 mt-2">
          Опишите вашу проблему и мы поможем её решить
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Тема обращения</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Проблема с заказом"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Описание проблемы</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Подробно опишите вашу проблему..."
              rows={6}
              className="input resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Прикрепить файлы</label>
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-3 bg-dark-700 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
              >
                <Paperclip className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">
                  {files.length > 0 ? `${files.length} файл(ов)` : 'Выберите файлы'}
                </span>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, i) => (
                  <div key={i} className="text-sm text-gray-400">
                    📎 {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'Отправка...' : 'Отправить обращение'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400">
        <p>Также вы можете связаться с нами через:</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="mailto:support@neomarket.ru" className="text-primary hover:underline">
            support@neomarket.ru
          </a>
        </div>
      </div>
    </div>
  )
}
