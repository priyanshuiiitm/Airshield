/**
 * Formatting utilities for AirShield metrics and currency.
 */

export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount)}`;
}

export function formatMinutes(minutes: number, showSign: boolean = true): string {
  const rounded = Math.round(minutes * 10) / 10;
  const sign = showSign && rounded > 0 ? "+" : "";
  return `${sign}${rounded} min`;
}

export function formatPercentage(percent: number, showArrow: boolean = true): string {
  const rounded = Math.round(percent);
  const arrow = showArrow ? "↓" : "";
  return `${arrow}${rounded}%`;
}

export function formatDistance(km: number): string {
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`;
}
