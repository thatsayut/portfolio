import { hashPassword, comparePassword } from './hash.util';

describe('Hash Utility', () => {
  const plainPassword = 'mySecretPass123';

  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword(plainPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(plainPassword);
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
    });

    it('should produce different hashes for the same input (salted)', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword(plainPassword);
      const result = await comparePassword(plainPassword, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword(plainPassword);
      const result = await comparePassword('wrongPassword', hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword(plainPassword);
      const result = await comparePassword('', hash);

      expect(result).toBe(false);
    });
  });
});
