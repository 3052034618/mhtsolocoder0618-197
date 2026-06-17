export function calculateCharge(totalCostForeign: number, exchangeRate: number, serviceFeeRate: number): number {
  return totalCostForeign * exchangeRate * (1 + serviceFeeRate)
}

export function calculateItemCost(actualPrice: number, taxAmount: number): number {
  return actualPrice + taxAmount
}

export function calculateOrderCost(items: { actualPrice?: number; taxAmount?: number; quantity: number }[]): number {
  return items.reduce((sum, item) => {
    const unitCost = (item.actualPrice ?? 0) + (item.taxAmount ?? 0)
    return sum + unitCost * item.quantity
  }, 0)
}

export function calculateProfit(totalRevenue: number, totalCostCNY: number, exchangeLoss: number): number {
  return totalRevenue - totalCostCNY - exchangeLoss
}

export function calculateExchangeLoss(costForeign: number, recordRate: number, actualRate: number): number {
  return costForeign * (actualRate - recordRate)
}
