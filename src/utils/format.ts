import { format, isToday, isThisMonth, isPast, differenceInDays } from 'date-fns'

export function formatDate(date: Date | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'yyyy-MM-dd')
}

export function formatDateTime(date: Date | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'yyyy-MM-dd HH:mm')
}

export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  if (currency === 'CNY') {
    return `¥${amount.toFixed(2)}`
  }
  return `${currency} ${amount.toFixed(2)}`
}

export function isOverdue(date: Date | undefined): boolean {
  if (!date) return false
  return isPast(new Date(date))
}

export function getDaysOverdue(deadline: Date): number {
  return Math.max(0, differenceInDays(new Date(), new Date(deadline)))
}

export { isToday, isThisMonth, format }
