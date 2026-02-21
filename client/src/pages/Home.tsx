import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Gamepad2, 
  Coins, 
  Package, 
  Wrench, 
  MoreHorizontal,
  TrendingUp,
  Users,
  Shield,
  Zap
} from 'lucide-react'
import { productsApi } from '../utils/api'

interface Game {
  id: number
  name: string
  slug: string
  image: string
  popularity: number
}

interface Product {
  id: number
  title: string
  price: number
  game_name: string
  category_name: string
  seller_nickname: string
  seller_role: string
  seller_rating: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  accounts: <Gamepad2 className="w-6 h-6" />,
  currency: <Coins className="w-6 h-6" />,
  items: <Package className="w-6 h-6" />,
  services: <Wrench className="w-6 h-6" />,
  other: <MoreHorizontal className="w-6 h-6" />,
}

export function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{id: number, name: string, slug: string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, productsRes, categoriesRes] = await Promise.all([
          productsApi.getGames(),
          productsApi.getProducts({ limit: 8 }),
          productsApi.getCategories(),
        ])
        setGames(gamesRes.data.games)
        setProducts(productsRes.data.products)
        setCategories(categoriesRes.data.categories)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return <span className="text-yellow-400 text-xs">⭐</span>
      case 'admin':
        return <span className="text-red-400 text-xs">👑</span>
      case 'moderator':
        return <span className="text-blue-400 text-xs">🛡️</span>
      case 'verified':
        return <span className="text-green-400 text-xs">✅</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-gradient">NeoMarket</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Игровая торговая площадка нового поколения. 
              Покупай и продавай игровые ценности безопасно и быстро.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/products" className="btn-primary">
                Начать покупки
              </Link>
              <Link to="/products/new" className="btn-outline">
                Стать продавцом
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="card text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">125K+</div>
              <div className="text-gray-400 text-sm">Пользователей</div>
            </div>
            <div className="card text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-accent-green" />
              <div className="text-2xl font-bold">890K+</div>
              <div className="text-gray-400 text-sm">Сделок</div>
            </div>
            <div className="card text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-accent-cyan" />
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-gray-400 text-sm">Безопасность</div>
            </div>
            <div className="card text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-accent-orange" />
              <div className="text-2xl font-bold">&lt;2 мин</div>
              <div className="text-gray-400 text-sm">Доставка</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Категории</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category_id=${category.id}`}
                className="card-hover flex flex-col items-center gap-3 p-6"
              >
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                  {categoryIcons[category.slug] || <MoreHorizontal className="w-6 h-6" />}
                </div>
                <span className="font-medium text-center">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Games */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Популярные игры</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {games.slice(0, 8).map((game) => (
              <Link
                key={game.id}
                to={`/products?game_id=${game.id}`}
                className="card-hover group"
              >
                <div className="aspect-video bg-dark-700 rounded-lg mb-3 overflow-hidden">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent-cyan/20">
                      <Gamepad2 className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
                </div>
                <h3 className="font-medium truncate">{game.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Новые предложения</h2>
            <Link to="/products" className="text-primary hover:text-primary-light transition-colors">
              Смотреть все →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-dark-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="card-hover group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                      {product.game_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.category_name}
                    </span>
                  </div>
                  <h3 className="font-medium mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-accent-green">
                      {product.price.toLocaleString()} ₽
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-600">
                    <span className="text-sm text-gray-400">{product.seller_nickname}</span>
                    {getRoleBadge(product.seller_role)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Почему выбирают NeoMarket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">100% Гарантия</h3>
              <p className="text-gray-400 text-sm">Все сделки защищены. Гарантия возврата средств.</p>
            </div>
            <div className="card text-center">
              <div className="w-14 h-14 bg-accent-green/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-accent-green" />
              </div>
              <h3 className="font-bold mb-2">Мгновенная доставка</h3>
              <p className="text-gray-400 text-sm">Большинство товаров доставляется автоматически.</p>
            </div>
            <div className="card text-center">
              <div className="w-14 h-14 bg-accent-cyan/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-accent-cyan" />
              </div>
              <h3 className="font-bold mb-2">Проверенные продавцы</h3>
              <p className="text-gray-400 text-sm">Все продавцы проходят верификацию.</p>
            </div>
            <div className="card text-center">
              <div className="w-14 h-14 bg-accent-orange/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-accent-orange" />
              </div>
              <h3 className="font-bold mb-2">Низкие цены</h3>
              <p className="text-gray-400 text-sm">Прямые продавцы без посредников.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
