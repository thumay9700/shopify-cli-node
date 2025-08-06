import { describe, expect, jest, test } from '@jest/globals';

describe('Basic Jest Setup', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('Mocking works', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  test('Async tests work', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
