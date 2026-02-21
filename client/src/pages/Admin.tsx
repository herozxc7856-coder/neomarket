import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  ShoppingBag, 
  MessageSquare, 
  Headphones,
  BarChart3,
  Shield,
  Search,
  Lock,
  Unlock,
  Crown,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface Stats {
  users: number
  orders: number
  products: number
  turnover: number
  online_users: number
  pending_orders: number
  support_tickets: number
}

interface User {
  id: number
  nickname: string
  email: string
  role: string
  balance: number
  is_blocked: number
  created_at: string
}

export function Admin() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'products' | 'orders' | 'chats' | 'tickets' | 'rules'>('stats')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchStats()
    fetchUsers()
  }, [])

  const fetchStats = async () => {
    try {
      const { data } = await adminApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await adminApi.getUsers()
      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlockUser = async (userId: number, isBlocked: boolean) => {
    try {
      await adminApi.blockUser(userId, !isBlocked)
      toast.success(isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    }
  }

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      await adminApi.changeRole(userId, newRole)
      toast.success('Роль изменена')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return <span className="text-yellow-400">⭐ Основатель</span>
      case 'admin':
        return <span className="text-red-400">👑 Админ</span>
      case 'moderator':
        return <span className="text-blue-400">🛡️ Модератор</span>
      case 'verified':
        return <span className="text-green-400">✅ Верифицирован</span>
      default:
        return <span className="text-gray-400">👤 Юзер</span>
    }
  }

  const filteredUsers = users.filter(u => 
    u.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isFounder = user?.role === 'founder'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Админ панель</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'stats', label: 'Статистика', icon: BarChart3 },
          { id: 'users', label: 'Пользователи', icon: Users },
          { id: 'products', label: 'Товары', icon: ShoppingBag },
          { id: 'orders', label: 'Заказы', icon: ShoppingBag },
          { id: 'chats', label: 'Чаты', icon: MessageSquare },
          { id: 'tickets', label: 'Поддержка', icon: Headphones },
          { id: 'rules', label: 'Правила', icon: CheckCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-3xl font-bold text-primary">{stats.users}</div>
            <div className="text-gray-400">Пользователей</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent-cyan">{stats.orders}</div>
            <div className="text-gray-400">Заказов</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent-green">{stats.products}</div>
            <div className="text-gray-400">Товаров</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent-orange">{stats.turnover.toLocaleString()} ₽</div>
            <div className="text-gray-400">Оборот</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent-green">{stats.online_users}</div>
            <div className="text-gray-400">Онлайн</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-primary">{stats.pending_orders}</div>
            <div className="text-gray-400">Активных заказов</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-accent-pink">{stats.support_tickets}</div>
            <div className="text-gray-400">Тикетов</div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск пользователей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="font-mono text-sm text-gray-500">#{u.id}</div>
                  <div>
                    <div className="font-bold">{u.nickname}</div>
                    <div className="text-sm text-gray-400">{u.email}</div>
                  </div>
                  <div>{getRoleBadge(u.role)}</div>
                  {u.is_blocked && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                      Заблокирован
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="font-mono text-accent-green">{u.balance.toLocaleString()} ₽</div>
                    <div className="text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  
                  {isFounder && u.role !== 'founder' && (
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="input py-1 text-sm"
                    >
                      <option value="user">Пользователь</option>
                      <option value="verified">Верифицирован</option>
                      <option value="moderator">Модератор</option>
                      <option value="admin">Администратор</option>
                    </select>
                  )}
                  
                  {u.role !== 'founder' && (
                    <button
                      onClick={() => handleBlockUser(u.id, !!u.is_blocked)}
                      className={`p-2 rounded-lg transition-colors ${
                        u.is_blocked
                          ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                      title={u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    >
                      {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other tabs placeholders */}
      {['products', 'orders', 'chats', 'tickets', 'rules'].includes(activeTab) && (
        <div className="card text-center py-16">
          <div className="text-gray-400">Раздел в разработке</div>
          <Link to={`/admin/${activeTab}`} className="text-primary hover:underline mt-2 inline-block">
            Перейти в полную версию
          </Link>
        </div>
      )}
    </div>
  )
}
