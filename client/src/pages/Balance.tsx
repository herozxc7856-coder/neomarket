import { useEffect, useState } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '../utils/api'
import { useAuthStore } from '../store/authStore'

interface Transaction {
  id: number
  type: string
  amount: number
  description: string
  created_at: string
}

export function Balance() {
  const { user, updateBalance } = useAuthStore()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      const { data } = await usersApi.getBalance()
      setBalance(data.balance)
      setTransactions(data.transactions)
      updateBalance(data.balance)
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) {
      toast.error('Введите корректную сумму')
      return
    }

    setDepositing(true)
    try {
      const { data } = await usersApi.deposit(amount)
      toast.success(`Баланс пополнен на ${amount.toLocaleString()} ₽`)
      setDepositAmount('')
      fetchBalance()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка пополнения')
    } finally {
      setDepositing(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-accent-green" />
      case 'withdraw':
        return <ArrowUpCircle className="w-5 h-5 text-red-400" />
      case 'payment':
      case 'freeze':
        return <ArrowUpCircle className="w-5 h-5 text-accent-orange" />
      case 'refund':
      case 'unfreeze':
        return <ArrowDownCircle className="w-5 h-5 text-accent-cyan" />
      case 'earning':
        return <ArrowDownCircle className="w-5 h-5 text-primary" />
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />
    }
  }

  const getTransactionType = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Пополнение'
      case 'withdraw':
        return 'Вывод'
      case 'payment':
        return 'Оплата'
      case 'freeze':
        return 'Заморозка'
      case 'refund':
        return 'Возврат'
      case 'unfreeze':
        return 'Разморозка'
      case 'earning':
        return 'Зачисление'
      default:
        return type
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Баланс</h1>

      {/* Balance Card */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 mb-1">Текущий баланс</p>
            <div className="text-4xl font-bold text-accent-green">
              {loading ? '...' : balance.toLocaleString()} ₽
            </div>
          </div>
          <div className="w-16 h-16 bg-accent-green/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-8 h-8 text-accent-green" />
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold mb-4">Пополнение баланса</h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Сумма"
            min="1"
            max="100000"
            className="input flex-1"
          />
          <button
            onClick={handleDeposit}
            disabled={depositing}
            className="btn-primary disabled:opacity-50"
          >
            {depositing ? '...' : 'Пополнить'}
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Демо-режим: деньги начисляются мгновенно без реальной оплаты
        </p>
      </div>

      {/* Withdraw Section (Blocked) */}
      <div className="card mb-8 opacity-50">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Вывод средств
        </h2>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Сумма"
            disabled
            className="input flex-1"
          />
          <button disabled className="btn-secondary">
            Вывести
          </button>
        </div>
        <p className="text-sm text-accent-orange mt-2">
          Вывод временно недоступен
        </p>
      </div>

      {/* Transactions */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">История операций</h2>
        
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-dark-700 rounded animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Нет операций</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-dark-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(tx.type)}
                  <div>
                    <div className="font-medium">{getTransactionType(tx.type)}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    tx.amount > 0 ? 'text-accent-green' : 
                    tx.amount < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ₽
                  </div>
                  {tx.description && (
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                      {tx.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
