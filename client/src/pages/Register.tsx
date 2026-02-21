import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

export function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    agreeRules: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Валидация
    if (!formData.email || !formData.password || !formData.nickname) {
      toast.error('Заполните все поля')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    if (formData.nickname.length < 3) {
      toast.error('Никнейм должен быть не менее 3 символов')
      return
    }

    if (!formData.agreeRules) {
      toast.error('Необходимо согласиться с правилами')
      return
    }

    setLoading(true)

    try {
      const { data } = await authApi.register(
        formData.email,
        formData.password,
        formData.nickname
      )
      setAuth(data.user, data.token)
      toast.success('Регистрация успешна!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Регистрация</h1>
            <p className="text-gray-400">Создайте новый аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Никнейм</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="YourNickname"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  name="agreeRules"
                  checked={formData.agreeRules}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                  formData.agreeRules ? 'bg-primary border-primary' : 'border-gray-500'
                }`}>
                  {formData.agreeRules && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-400">
                Я согласен с{' '}
                <Link to="/rules" target="_blank" className="text-primary hover:underline">
                  правилами сайта
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-primary hover:text-primary-light transition-colors">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
