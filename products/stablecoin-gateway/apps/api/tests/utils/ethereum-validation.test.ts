import { ethereumAddressSchema } from '../../src/utils/validation';

describe('Ethereum Address Validation', () => {
  it('should accept valid checksummed address', () => {
    const validAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
    const result = ethereumAddressSchema.parse(validAddress);
    expect(result).toBe(validAddress);
  });

  it('should accept valid lowercase address and checksum it', () => {
    const lowercaseAddress = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
    const expectedChecksum = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

    const result = ethereumAddressSchema.parse(lowercaseAddress);
    expect(result).toBe(expectedChecksum);
  });

  it('should accept valid uppercase address and checksum it', () => {
    const uppercaseAddress = '0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED';
    const expectedChecksum = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

    const result = ethereumAddressSchema.parse(uppercaseAddress);
    expect(result).toBe(expectedChecksum);
  });

  it('should reject invalid address format', () => {
    const invalidAddress = 'not-an-address';

    expect(() => ethereumAddressSchema.parse(invalidAddress)).toThrow();
  });

  it('should reject address without 0x prefix', () => {
    const addressWithoutPrefix = '5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

    expect(() => ethereumAddressSchema.parse(addressWithoutPrefix)).toThrow();
  });

  it('should reject address with invalid length', () => {
    const shortAddress = '0x5aAeb6053F3E94';

    expect(() => ethereumAddressSchema.parse(shortAddress)).toThrow();
  });

  it('should reject address with invalid characters', () => {
    const invalidChars = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeG'; // G is invalid

    expect(() => ethereumAddressSchema.parse(invalidChars)).toThrow();
  });

  it('should work with multiple addresses', () => {
    const addresses = [
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359',
      '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
    ];

    addresses.forEach((addr) => {
      const result = ethereumAddressSchema.parse(addr);
      expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  it('should reject zero address', () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Zero address is technically valid, but we should reject it
    expect(() => ethereumAddressSchema.parse(zeroAddress)).toThrow();
  });
});
