import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Eye, 
  Server, 
  Tag,
  ShoppingCart,
  MessageSquare,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi, ordersApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface Product {
  id: number
  title: string
  description: string
  price: number
  server_name: string
  views_count: number
  created_at: string
  game_name: string
  category_name: string
  seller_id: number
  seller_nickname: string
  seller_avatar: string
  seller_role: string
  seller_rating: number
  seller_deals: number
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const { data } = await productsApi.getProduct(Number(id))
      setProduct(data.product)
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Товар не найден')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    if (!isAuthenticated) {
      toast.error('Необходимо авторизоваться')
      navigate('/login')
      return
    }

    if (user?.id === product?.seller_id) {
      toast.error('Нельзя купить свой товар')
      return
    }

    setBuying(true)
    try {
      const { data } = await ordersApi.createOrder(Number(id))
      toast.success('Заказ создан! Переходим в чат...')
      navigate(`/orders/${data.order.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка создания заказа')
    } finally {
      setBuying(false)
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card animate-pulse">
          <div className="h-8 bg-dark-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-dark-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!product) return null

  const isOwnProduct = user?.id === product.seller_id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                    {product.game_name}
                  </span>
                  <span className="text-sm text-gray-400">
                    {product.category_name}
                  </span>
                </div>
                <h1 className="text-2xl font-bold">{product.title}</h1>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-accent-green">
                  {product.price.toLocaleString()} ₽
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {product.views_count} просмотров
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(product.created_at).toLocaleDateString('ru-RU')}
              </span>
              {product.server_name && (
                <span className="flex items-center gap-1">
                  <Server className="w-4 h-4" />
                  {product.server_name}
                </span>
              )}
            </div>

            <hr className="border-dark-600 mb-6" />

            <div className="prose prose-invert max-w-none">
              <h3 className="text-lg font-bold mb-3">Описание</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>

          {/* Seller Info */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Продавец</h3>
            <div className="flex items-start gap-4">
              <Link to={`/profile/${product.seller_nickname}`}>
                <img
                  src={product.seller_avatar || '/uploads/avatars/default.png'}
                  alt={product.seller_nickname}
                  className="w-16 h-16 rounded-full object-cover"
                />
              </Link>
              <div className="flex-1">
                <Link 
                  to={`/profile/${product.seller_nickname}`}
                  className="text-xl font-bold hover:text-primary transition-colors"
                >
                  {product.seller_nickname}
                </Link>
                <div className="mt-1">{getRoleBadge(product.seller_role)}</div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    {product.seller_deals} сделок
                  </span>
                  {product.seller_rating > 0 && (
                    <span>⭐ {product.seller_rating.toFixed(1)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Buy Card */}
          <div className="card sticky top-24">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-accent-green mb-2">
                {product.price.toLocaleString()} ₽
              </div>
              <div className="text-gray-400">Цена за товар</div>
            </div>

            {isOwnProduct ? (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Это ваш товар</span>
                  </div>
                </div>
                <Link to={`/products/${product.id}/edit`} className="btn-secondary w-full block text-center">
                  Редактировать
                </Link>
              </div>
            ) : (
              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                {buying ? 'Создание заказа...' : 'Купить'}
              </button>
            )}

            {!isAuthenticated && (
              <p className="text-center text-sm text-gray-400 mt-4">
                <Link to="/login" className="text-primary hover:underline">Войдите</Link>, чтобы купить
              </p>
            )}
          </div>

          {/* Safety Info */}
          <div className="card">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Безопасная сделка
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-accent-green">✓</span>
                Деньги замораживаются до подтверждения получения
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-green">✓</span>
                Чат для передачи товара
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-green">✓</span>
                Поддержка 24/7
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-green">✓</span>
                Гарантия возврата
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
