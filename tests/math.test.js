// const antinople = require("../src/math");
import {randFloatSpread, mapLinear, lerp} from '../src/math';

describe('test suite math.js', () => {
  test('test function randfloatSpread plus petit que 1', () => {
    expect(randFloatSpread(1)).toBeLessThanOrEqual(1);
  });
  test('test function randfloatSpread plus grand que -1', () => {
    expect(randFloatSpread(1)).toBeGreaterThanOrEqual(-1);
  });
  test('test function maplinear return 3', () => {
    expect(mapLinear(1, 2, 3, 4, 5)).toBe(3);
  });
  test('test function maplinear return 0.882352941176471', () => {
    expect(mapLinear(1, 20, 3, 40, 5)).toBe(0.882352941176471);
  });
  test('test function lerp return 41', () => {
    expect(lerp(1, 3, 20)).toBe(41);
  });
  test('test function lerp return -15,3', () => {
    expect(lerp(1.3, -7, 2)).toBe(-15.3);
  });
});
