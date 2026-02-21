import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { rulesApi } from '../utils/api'

interface Rules {
  title: string
  content: string
  updated_at: string
}

export function Rules() {
  const [rules, setRules] = useState<Rules | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const { data } = await rulesApi.getRules()
      setRules(data.rules)
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card animate-pulse h-96" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">{rules?.title || 'Правила сайта'}</h1>
      </div>

      <div className="card">
        {rules?.updated_at && (
          <div className="text-sm text-gray-400 mb-6">
            Последнее обновление: {new Date(rules.updated_at).toLocaleDateString('ru-RU')}
          </div>
        )}
        
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: rules?.content || '<p>Правила пока не добавлены.</p>' }}
        />
      </div>
    </div>
  )
}
