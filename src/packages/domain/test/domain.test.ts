import { describe, expect, it } from 'vitest'
import { abvFromGravity, apparentAttenuation, celsiusToFahrenheit, fahrenheitToCelsius } from '../src/index.js'

describe('units', () => {
  it('round-trips temperature', () => {
    expect(fahrenheitToCelsius(68)).toBeCloseTo(20)
    expect(celsiusToFahrenheit(20)).toBeCloseTo(68)
  })
})

describe('gravity', () => {
  it('computes ABV and attenuation', () => {
    expect(abvFromGravity(1.05, 1.01)).toBeCloseTo(5.25)
    expect(apparentAttenuation(1.05, 1.01)).toBeCloseTo(0.8)
  })
})
