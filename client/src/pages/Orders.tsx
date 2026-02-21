import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingBag, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import { ordersApi } from '../utils/api'

interface Order {
  id: number
  order_number: string
  status: string
  amount: number
  created_at: string
  updated_at: string
  product_title: string
  buyer_nickname: string
  buyer_avatar: string
  seller_nickname: string
  seller_avatar: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Ожидание', color: 'text-gray-400', icon: <Clock className="w-4 h-4" /> },
  paid: { label: 'Оплачен', color: 'text-primary', icon: <ShoppingBag className="w-4 h-4" /> },
  delivered: { label: 'Передан', color: 'text-accent-cyan', icon: <CheckCircle className="w-4 h-4" /> },
  completed: { label: 'Завершен', color: 'text-accent-green', icon: <CheckCircle className="w-4 h-4" /> },
  disputed: { label: 'Спор', color: 'text-accent-orange', icon: <AlertTriangle className="w-4 h-4" /> },
  cancelled: { label: 'Отменен', color: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
}

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all')

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    try {
      const type = filter === 'all' ? undefined : filter
      const { data } = await ordersApi.getOrders(type)
      setOrders(data.orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Мои заказы</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('buyer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'buyer' ? 'bg-primary text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Покупки
          </button>
          <button
            onClick={() => setFilter('seller')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'seller' ? 'bg-primary text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Продажи
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold mb-2">Нет заказов</h3>
          <p className="text-gray-400 mb-4">У вас пока нет заказов</p>
          <Link to="/products" className="btn-primary inline-block">
            Перейти к товарам
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status]
            const isBuyer = order.buyer_nickname !== order.seller_nickname

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="card hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-dark-700 flex items-center justify-center ${status.color}`}>
                      {status.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-400">#{order.order_number}</span>
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {order.product_title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                        <span className="flex items-center gap-1">
                          {isBuyer ? 'Продавец:' : 'Покупатель:'}
                          <img
                            src={isBuyer ? order.seller_avatar : order.buyer_avatar}
                            alt=""
                            className="w-4 h-4 rounded-full"
                          />
                          {isBuyer ? order.seller_nickname : order.buyer_nickname}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-accent-green">
                        {order.amount.toLocaleString()} ₽
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
