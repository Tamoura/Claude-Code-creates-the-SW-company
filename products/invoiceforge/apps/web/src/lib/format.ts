export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTaxRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function parseDollars(dollarString: string): number {
  // Remove $ and commas, parse as float, convert to cents
  const cleaned = dollarString.replace(/[$,]/g, '');
  const dollars = parseFloat(cleaned);
  return Math.round(dollars * 100);
}

export function parsePercentage(percentString: string): number {
  // Remove % sign, parse as float, convert to basis points
  const cleaned = percentString.replace(/%/g, '');
  const percent = parseFloat(cleaned);
  return Math.round(percent * 100);
}
