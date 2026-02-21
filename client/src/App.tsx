import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Products } from './pages/Products'
import { ProductDetail } from './pages/ProductDetail'
import { Orders } from './pages/Orders'
import { OrderDetail } from './pages/OrderDetail'
import { Profile } from './pages/Profile'
import { Balance } from './pages/Balance'
import { Support } from './pages/Support'
import { Rules } from './pages/Rules'
import { Admin } from './pages/Admin'
import { useAuthStore } from './store/authStore'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// Admin Route component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.role === 'founder' || user?.role === 'admin' || user?.role === 'moderator'
  
  if (!isAuthenticated) return <Navigate to="/login" />
  if (!isAdmin) return <Navigate to="/" />
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/rules" element={<Rules />} />
        
        {/* Protected routes */}
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/profile/:identifier" element={<Profile />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/admin/:section" element={<AdminRoute><Admin /></AdminRoute>} />
        
        {/* 404 */}
        <Route path="*" element={<div className="text-center py-20">Страница не найдена</div>} />
      </Route>
    </Routes>
  )
}

export default App
