import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Filter, ChevronDown, Gamepad2 } from 'lucide-react'
import { productsApi } from '../utils/api'

interface Product {
  id: number
  title: string
  description: string
  price: number
  server_name: string
  views_count: number
  game_name: string
  category_name: string
  seller_nickname: string
  seller_avatar: string
  seller_role: string
  seller_rating: number
  created_at: string
}

interface Game {
  id: number
  name: string
}

interface Category {
  id: number
  name: string
}

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  // Фильтры
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedGame, setSelectedGame] = useState(searchParams.get('game_id') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || '')
  const [sort, setSort] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, categoriesRes] = await Promise.all([
          productsApi.getGames(),
          productsApi.getCategories(),
        ])
        setGames(gamesRes.data.games)
        setCategories(categoriesRes.data.categories)
      } catch (error) {
        console.error('Error fetching filters:', error)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [searchParams, sort])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: 20,
        sort,
      }

      const gameId = searchParams.get('game_id')
      const categoryId = searchParams.get('category_id')
      const searchQuery = searchParams.get('search')

      if (gameId) params.game_id = gameId
      if (categoryId) params.category_id = categoryId
      if (searchQuery) params.search = searchQuery

      const { data } = await productsApi.getProducts(params)
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (selectedGame) params.game_id = selectedGame
    if (selectedCategory) params.category_id = selectedCategory
    setSearchParams(params)
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedGame('')
    setSelectedCategory('')
    setSearchParams({})
  }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Товары</h1>
        
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
              className="input pl-10 py-2 text-sm w-full"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary py-2 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Фильтры</span>
          </button>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input py-2 pr-10 appearance-none cursor-pointer"
            >
              <option value="newest">Новые</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
              <option value="popular">Популярные</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Игра</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="input w-full"
              >
                <option value="">Все игры</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Категория</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-full"
              >
                <option value="">Все категории</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={applyFilters} className="btn-primary flex-1">
                Применить
              </button>
              <button onClick={clearFilters} className="btn-secondary">
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-dark-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold mb-2">Товары не найдены</h3>
          <p className="text-gray-400">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                
                <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
                
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                  {product.description}
                </p>

                {product.server_name && (
                  <div className="text-xs text-gray-500 mb-3">
                    Сервер: {product.server_name}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="text-xl font-bold text-accent-green">
                    {product.price.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-gray-500">
                    👁 {product.views_count}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-dark-600">
                  <img
                    src={product.seller_avatar || '/uploads/avatars/default.png'}
                    alt={product.seller_nickname}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-gray-400">{product.seller_nickname}</span>
                  {getRoleBadge(product.seller_role)}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const params = Object.fromEntries(searchParams)
                    params.page = (i + 1).toString()
                    setSearchParams(params)
                  }}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    pagination.page === i + 1
                      ? 'bg-primary text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
