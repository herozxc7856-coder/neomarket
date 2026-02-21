import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, ShoppingBag, Star, User, Edit } from 'lucide-react'
import { usersApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface UserProfile {
  id: number
  nickname: string
  avatar: string
  role: string
  rating: number
  deals_count: number
  is_online: number
  created_at: string
  last_seen: string
  show_reviews: boolean
  show_rating: boolean
}

interface Product {
  id: number
  title: string
  price: number
  game_name: string
  category_name: string
}

export function Profile() {
  const { identifier } = useParams<{ identifier: string }>()
  const { user: currentUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [identifier])

  const fetchProfile = async () => {
    try {
      const { data } = await usersApi.getProfile(identifier!)
      setProfile(data.user)
      setProducts(data.products)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return <span className="text-yellow-400">⭐ Основатель</span>
      case 'admin':
        return <span className="text-red-400">👑 Администратор</span>
      case 'moderator':
        return <span className="text-blue-400">🛡️ Модератор</span>
      case 'verified':
        return <span className="text-green-400">✅ Верифицирован</span>
      default:
        return <span className="text-gray-400">👤 Пользователь</span>
    }
  }

  const isOwnProfile = currentUser?.id === profile?.id

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card animate-pulse h-64" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center py-16">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold">Пользователь не найден</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <img
              src={profile.avatar || '/uploads/avatars/default.png'}
              alt={profile.nickname}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-dark-800 ${
              profile.is_online ? 'bg-accent-green' : 'bg-gray-500'
            }`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{profile.nickname}</h1>
              {getRoleBadge(profile.role)}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                На сайте с {new Date(profile.created_at).toLocaleDateString('ru-RU')}
              </span>
              {!profile.is_online && (
                <span>
                  Был(а) {new Date(profile.last_seen).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span className="font-bold">{profile.deals_count}</span>
                <span className="text-gray-400">сделок</span>
              </div>
              
              {profile.show_rating && profile.rating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent-orange" />
                  <span className="font-bold">{profile.rating.toFixed(1)}</span>
                  <span className="text-gray-400">рейтинг</span>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <Link to="/settings" className="btn-secondary flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Редактировать
            </Link>
          )}
        </div>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-xl font-bold mb-4">Товары продавца</h2>
        
        {products.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">У пользователя нет активных товаров</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="card-hover"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    {product.game_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {product.category_name}
                  </span>
                </div>
                <h3 className="font-medium mb-2 line-clamp-2">{product.title}</h3>
                <div className="text-xl font-bold text-accent-green">
                  {product.price.toLocaleString()} ₽
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews (Hidden until first review) */}
      {!profile.show_reviews && (
        <div className="mt-8 card opacity-50">
          <h2 className="text-xl font-bold mb-4">Отзывы</h2>
          <p className="text-gray-400 text-center py-8">
            Отзывы скрыты до появления первого отзыва
          </p>
        </div>
      )}
    </div>
  )
}
