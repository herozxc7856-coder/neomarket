import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, nickname: string) =>
    api.post('/auth/register', { email, password, nickname }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
}

// Users API
export const usersApi = {
  getProfile: (identifier: string) => api.get(`/users/profile/${identifier}`),
  updateProfile: (data: { nickname?: string }) => api.put('/users/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getBalance: () => api.get('/users/balance'),
  deposit: (amount: number) => api.post('/users/deposit', { amount }),
  withdraw: (amount: number) => api.post('/users/withdraw', { amount }),
}

// Products API
export const productsApi = {
  getCategories: () => api.get('/products/categories'),
  getGames: () => api.get('/products/games'),
  getProducts: (params?: Record<string, string | number>) =>
    api.get('/products', { params }),
  getProduct: (id: number) => api.get(`/products/${id}`),
  createProduct: (data: {
    game_id?: number
    category_id?: number
    title: string
    description: string
    price: number
    server_name?: string
  }) => api.post('/products', data),
  updateProduct: (id: number, data: Partial<{
    title: string
    description: string
    price: number
    server_name: string
    is_hidden: boolean
  }>) => api.put(`/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/products/${id}`),
}

// Orders API
export const ordersApi = {
  getOrders: (type?: 'buyer' | 'seller') =>
    api.get('/orders', { params: { type } }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  createOrder: (product_id: number) => api.post('/orders', { product_id }),
  confirmOrder: (id: number) => api.post(`/orders/${id}/confirm`),
  cancelOrder: (id: number) => api.post(`/orders/${id}/cancel`),
  disputeOrder: (id: number, reason?: string) =>
    api.post(`/orders/${id}/dispute`, { reason }),
  deliverOrder: (id: number) => api.post(`/orders/${id}/deliver`),
}

// Chat API
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (orderId: number) => api.get(`/chat/${orderId}`),
  sendMessage: (orderId: number, message: string) =>
    api.post(`/chat/${orderId}`, { message }),
  uploadAttachment: (orderId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/chat/${orderId}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getUnreadCount: () => api.get('/chat/unread/count'),
}

// Support API
export const supportApi = {
  getTickets: () => api.get('/support/tickets'),
  getTicket: (id: number) => api.get(`/support/tickets/${id}`),
  createTicket: (data: { subject: string; message: string }, files?: File[]) => {
    const formData = new FormData()
    formData.append('subject', data.subject)
    formData.append('message', data.message)
    files?.forEach((file) => formData.append('attachments', file))
    return api.post('/support/tickets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Rules API
export const rulesApi = {
  getRules: () => api.get('/rules'),
  updateRules: (data: { title: string; content: string }) =>
    api.put('/rules', data),
}

// Admin API
export const adminApi = {
  // Users
  getUsers: (params?: Record<string, string>) =>
    api.get('/users/admin/users', { params }),
  blockUser: (id: number, is_blocked: boolean, reason?: string) =>
    api.post(`/users/admin/users/${id}/block`, { is_blocked, reason }),
  changeRole: (id: number, role: string) =>
    api.post(`/users/admin/users/${id}/role`, { role }),
  getStats: () => api.get('/users/admin/stats'),

  // Products
  getAllProducts: (params?: Record<string, string>) =>
    api.get('/products/admin/all', { params }),
  hideProduct: (id: number, is_hidden: boolean) =>
    api.post(`/products/admin/${id}/hide`, { is_hidden }),

  // Orders
  getAllOrders: (params?: Record<string, string>) =>
    api.get('/orders/admin/all', { params }),
  resolveDispute: (id: number, decision: 'buyer' | 'seller', comment?: string) =>
    api.post(`/orders/admin/${id}/resolve`, { decision, comment }),

  // Chat
  getAllChats: (params?: Record<string, string>) =>
    api.get('/chat/admin/all', { params }),
  getChatMessages: (orderId: number) =>
    api.get(`/chat/admin/${orderId}`),

  // Support
  getAllTickets: (params?: Record<string, string>) =>
    api.get('/support/admin/tickets', { params }),
  respondTicket: (id: number, response: string, status?: string) =>
    api.post(`/support/admin/tickets/${id}/respond`, { response, status }),
}
