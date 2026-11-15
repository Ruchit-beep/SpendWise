export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD' | 'CAD' | 'SGD' | 'JPY'
export type Theme = 'light' | 'dark' | 'system'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  occupation: string
  bio: string
  currency: Currency
  theme: Theme
  monthlyBudgetPref: number
  createdAt: string
}

export interface Transaction {
  _id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  paymentMethod: string
  description: string
  notes: string
  isDemo?: boolean
}

export interface Budget {
  _id: string
  month: string
  category: string
  limit: number
  spent: number
  remaining: number
  pct: number
  isDemo?: boolean
}

export interface Goal {
  _id: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string | null
  description: string
  isDemo?: boolean
}

export interface Card { value: number; previous: number; change: number | null }
export interface MonthRow { month: string; income: number; expense: number; savings: number }
export interface CategoryRow { category: string; total: number }

export type Insight =
  | { kind: 'category_up'; category: string; amount: number; pct: number | null }
  | { kind: 'category_down'; category: string; amount: number; pct: number | null }
  | { kind: 'budget_remaining'; amount: number }
  | { kind: 'budget_exceeded'; amount: number }
  | { kind: 'top_category'; category: string; amount: number }
  | { kind: 'savings_rate'; pct: number }

export interface Dashboard {
  month: string
  hasData: boolean
  hasDemo: boolean
  cards: { balance: Card; income: Card; expense: Card; savings: Card }
  series: MonthRow[]
  categories: CategoryRow[]
  recent: Transaction[]
  budget: { limit: number; spent: number; remaining: number; pct: number; source: 'budget' | 'preference' } | null
  goals: Goal[]
  insights: Insight[]
}

export interface Report {
  range: { from: string; to: string; days: number }
  summary: { income: number; expense: number; net: number; savingsRate: number | null; avgDailySpend: number; topCategory: CategoryRow | null; transactions: number }
  months: MonthRow[]
  categories: CategoryRow[]
  daily?: { date: string; expense: number }[]
}
