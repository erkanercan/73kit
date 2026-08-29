function formatPercent(value: number): string {
  const boundedValue = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0

  return `${boundedValue.toFixed(2)}%`
}

export { formatPercent }
