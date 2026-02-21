import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  MessageSquare, 
  User, 
  LogOut, 
  Menu,
  X,
  Wallet,
  Shield,
  Headphones
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { chatApi } from '../utils/api'

export function Navigation() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Получаем количество непрочитанных сообщений
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const { data } = await chatApi.getUnreadCount()
          setUnreadCount(data.count)
        } catch (error) {
          console.error('Error fetching unread count:', error)
        }
      }
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return <span className="text-yellow-400 text-xs">⭐ Основатель</span>
      case 'admin':
        return <span className="text-red-400 text-xs">👑 Админ</span>
      case 'moderator':
        return <span className="text-blue-400 text-xs">🛡️ Модератор</span>
      case 'verified':
        return <span className="text-green-400 text-xs">✅ Верифицирован</span>
      default:
        return null
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur border-b border-dark-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent-cyan rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NM</span>
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">NeoMarket</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 py-2 text-sm"
              />
            </div>
          </form>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Balance */}
                <Link to="/balance" className="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                  <Wallet className="w-4 h-4 text-accent-green" />
                  <span className="font-mono text-sm">{user?.balance.toLocaleString()} ₽</span>
                </Link>

                {/* Messages */}
                <Link to="/orders" className="relative p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Support */}
                <Link to="/support" className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <Headphones className="w-5 h-5" />
                </Link>

                {/* Admin Panel */}
                {['founder', 'admin', 'moderator'].includes(user?.role || '') && (
                  <Link to="/admin" className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-primary">
                    <Shield className="w-5 h-5" />
                  </Link>
                )}

                {/* Profile */}
                <div className="relative group">
                  <button className="flex items-center gap-2 p-1 hover:bg-dark-700 rounded-lg transition-colors">
                    <img
                      src={user?.avatar || '/uploads/avatars/default.png'}
                      alt={user?.nickname}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium">{user?.nickname}</div>
                      {getRoleBadge(user?.role || '')}
                    </div>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link to={`/profile/${user?.nickname}`} className="flex items-center gap-2 px-4 py-3 hover:bg-dark-700 rounded-t-lg">
                      <User className="w-4 h-4" />
                      <span>Профиль</span>
                    </Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-3 hover:bg-dark-700">
                      <MessageSquare className="w-4 h-4" />
                      <span>Мои заказы</span>
                    </Link>
                    <Link to="/products/new" className="flex items-center gap-2 px-4 py-3 hover:bg-dark-700">
                      <span className="text-lg">+</span>
                      <span>Создать товар</span>
                    </Link>
                    <hr className="border-dark-600" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-dark-700 text-red-400 rounded-b-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-secondary py-2">
                  Войти
                </Link>
                <Link to="/register" className="btn-primary py-2">
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-dark-700 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-600">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск товаров..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 py-2 text-sm w-full"
                />
              </div>
            </form>

            {isAuthenticated ? (
              <div className="space-y-2">
                <Link to="/balance" className="flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg">
                  <Wallet className="w-5 h-5 text-accent-green" />
                  <span>Баланс: {user?.balance.toLocaleString()} ₽</span>
                </Link>
                <Link to={`/profile/${user?.nickname}`} className="flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg">
                  <User className="w-5 h-5" />
                  <span>Профиль</span>
                </Link>
                <Link to="/orders" className="flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                  <span>Мои заказы</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-primary text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/support" className="flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg">
                  <Headphones className="w-5 h-5" />
                  <span>Поддержка</span>
                </Link>
                {['founder', 'admin', 'moderator'].includes(user?.role || '') && (
                  <Link to="/admin" className="flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg text-primary">
                    <Shield className="w-5 h-5" />
                    <span>Админ панель</span>
                  </Link>
                )}
                <hr className="border-dark-600" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 hover:bg-dark-700 text-red-400 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/login" className="block w-full btn-secondary text-center">
                  Войти
                </Link>
                <Link to="/register" className="block w-full btn-primary text-center">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
