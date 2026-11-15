export const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other']
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other']
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other']
export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
] as const

// Brand-led palette for charts and category chips.
export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F28B45',
  Shopping: '#F4A3C7',
  Transport: '#83CFF0',
  Bills: '#C9F227',
  Entertainment: '#A78BFA',
  Healthcare: '#F87171',
  Education: '#34D399',
  Other: '#9CA3AF',
  Salary: '#C9F227',
  Freelance: '#83CFF0',
  Investments: '#34D399',
  Gift: '#F4A3C7',
}
export const colorFor = (c: string) => CATEGORY_COLORS[c] ?? '#9CA3AF'
