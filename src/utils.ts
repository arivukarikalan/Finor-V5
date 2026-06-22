// Strict Categorical Colors (avoiding red/green to prevent semantic confusion with profits/losses)
export const catColors = ['bg-indigo-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-fuchsia-500'];

/**
 * Assigns a consistent background color to a stock ticker based on its hash.
 */
export const getColorForTicker = (ticker: string): string => {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return catColors[Math.abs(hash) % catColors.length];
};

/**
 * Formats a numeric value into Indian Rupee (INR) currency format.
 */
export const formatINR = (value: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(value);
};
