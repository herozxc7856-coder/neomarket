import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Package,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'
import { ordersApi, chatApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface Message {
  id: number
  sender_id: number
  nickname: string
  avatar: string
  role: string
  message: string
  attachments: string | null
  is_read: number
  created_at: string
}

interface Order {
  id: number
  order_number: string
  status: string
  amount: number
  created_at: string
  auto_confirm_at: string
  product_title: string
  product_description: string
  buyer_id: number
  buyer_nickname: string
  buyer_avatar: string
  seller_id: number
  seller_nickname: string
  seller_avatar: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Подключение к WebSocket
  useEffect(() => {
    if (!token) return

    const newSocket = io(API_URL, {
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      newSocket.emit('auth', token)
      if (id) {
        newSocket.emit('join_order', id)
      }
    })

    newSocket.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token, id])

  // Загрузка данных заказа
  useEffect(() => {
    fetchOrderData()
  }, [id])

  // Автопрокрутка чата
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchOrderData = async () => {
    try {
      const [{ data: orderData }, { data: messagesData }] = await Promise.all([
        ordersApi.getOrder(Number(id)),
        chatApi.getMessages(Number(id)),
      ])
      setOrder(orderData.order)
      setMessages(messagesData.messages)
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Заказ не найден')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      // Отправляем через API
      await chatApi.sendMessage(Number(id), newMessage)
      
      // Отправляем через WebSocket для мгновенной доставки
      socket?.emit('send_message', { orderId: Number(id), message: newMessage })
      
      setNewMessage('')
    } catch (error) {
      toast.error('Ошибка отправки сообщения')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await chatApi.uploadAttachment(Number(id), file)
      toast.success('Файл загружен')
      fetchOrderData()
    } catch (error) {
      toast.error('Ошибка загрузки файла')
    }
  }

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      await ordersApi.confirmOrder(Number(id))
      toast.success('Сделка подтверждена!')
      fetchOrderData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Вы уверены, что хотите отменить заказ?')) return
    
    setActionLoading(true)
    try {
      await ordersApi.cancelOrder(Number(id))
      toast.success('Заказ отменен')
      fetchOrderData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDispute = async () => {
    const reason = prompt('Укажите причину спора:')
    if (!reason) return
    
    setActionLoading(true)
    try {
      await ordersApi.disputeOrder(Number(id), reason)
      toast.success('Спор открыт')
      fetchOrderData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeliver = async () => {
    setActionLoading(true)
    try {
      await ordersApi.deliverOrder(Number(id))
      toast.success('Товар отмечен как переданный')
      fetchOrderData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка')
    } finally {
      setActionLoading(false)
    }
  }

  const isBuyer = user?.id === order?.buyer_id
  const isSeller = user?.id === order?.seller_id

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">Оплачен</span>
      case 'delivered':
        return <span className="px-3 py-1 bg-accent-cyan/20 text-accent-cyan rounded-full text-sm">Передан</span>
      case 'completed':
        return <span className="px-3 py-1 bg-accent-green/20 text-accent-green rounded-full text-sm">Завершен</span>
      case 'disputed':
        return <span className="px-3 py-1 bg-accent-orange/20 text-accent-orange rounded-full text-sm">Спор</span>
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">Отменен</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card animate-pulse h-96" />
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к заказам
        </button>
        {getStatusBadge(order.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 card flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-dark-600">
            <div>
              <h2 className="font-bold">Чат заказа #{order.order_number}</h2>
              <p className="text-sm text-gray-400">{order.product_title}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-accent-green">
                {order.amount.toLocaleString()} ₽
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={msg.avatar || '/uploads/avatars/default.png'}
                    alt={msg.nickname}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                  <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.nickname}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`inline-block px-4 py-2 rounded-lg text-left ${
                        isOwn
                          ? 'bg-primary text-white'
                          : 'bg-dark-700 text-gray-200'
                      }`}
                    >
                      {msg.message}
                      {msg.attachments && (
                        <div className="mt-2">
                          {JSON.parse(msg.attachments).map((url: string, i: number) => (
                            <a
                              key={i}
                              href={`${API_URL}${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline"
                            >
                              📎 Вложение
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <div className="pt-4 border-t border-dark-600">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Введите сообщение..."
                  className="input flex-1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Order Info */}
          <div className="card">
            <h3 className="font-bold mb-4">Информация о заказе</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Номер:</span>
                <span className="font-mono">#{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Сумма:</span>
                <span className="font-bold text-accent-green">{order.amount.toLocaleString()} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Создан:</span>
                <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              {order.auto_confirm_at && order.status === 'delivered' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Автоподтверждение:</span>
                  <span className="text-accent-orange">
                    {new Date(order.auto_confirm_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="card">
            <h3 className="font-bold mb-4">Участники</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={order.buyer_avatar || '/uploads/avatars/default.png'}
                  alt={order.buyer_nickname}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium">{order.buyer_nickname}</div>
                  <div className="text-xs text-gray-400">Покупатель</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={order.seller_avatar || '/uploads/avatars/default.png'}
                  alt={order.seller_nickname}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium">{order.seller_nickname}</div>
                  <div className="text-xs text-gray-400">Продавец</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {order.status === 'paid' && isSeller && (
            <button
              onClick={handleDeliver}
              disabled={actionLoading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              Передать товар
            </button>
          )}

          {order.status === 'delivered' && isBuyer && (
            <>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Подтвердить получение
              </button>
              <button
                onClick={handleDispute}
                disabled={actionLoading}
                className="w-full btn-outline border-accent-orange text-accent-orange hover:bg-accent-orange/10 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Открыть спор
              </button>
            </>
          )}

          {order.status === 'paid' && isBuyer && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="w-full btn-outline border-red-400 text-red-400 hover:bg-red-400/10 flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Отменить заказ
            </button>
          )}

          {order.status === 'completed' && (
            <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-accent-green mx-auto mb-2" />
              <p className="text-accent-green font-medium">Сделка завершена</p>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-medium">Заказ отменен</p>
            </div>
          )}

          {order.status === 'disputed' && (
            <div className="p-4 bg-accent-orange/10 border border-accent-orange/30 rounded-lg text-center">
              <AlertTriangle className="w-8 h-8 text-accent-orange mx-auto mb-2" />
              <p className="text-accent-orange font-medium">Открыт спор</p>
              <p className="text-sm text-gray-400 mt-1">Администрация рассматривает заявку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
