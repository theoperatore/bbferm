/** Temperatures are stored in Celsius; convert only for display. */
export function fahrenheitToCelsius(f: number) {
  return ((f - 32) * 5) / 9
}

export function celsiusToFahrenheit(c: number) {
  return (c * 9) / 5 + 32
}
