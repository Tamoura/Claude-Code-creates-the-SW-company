import * as SecureStore from 'expo-secure-store';
import {
  getToken,
  setToken,
  deleteToken,
  getUserData,
  setUserData,
  deleteUserData,
  clearAll,
} from '../src/lib/secure-store';

describe('Secure Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getToken', () => {
    it('returns the stored token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        'test-jwt-token'
      );
      const token = await getToken();
      expect(token).toBe('test-jwt-token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        'pulse_auth_token'
      );
    });

    it('returns null when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const token = await getToken();
      expect(token).toBeNull();
    });

    it('returns null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );
      const token = await getToken();
      expect(token).toBeNull();
    });
  });

  describe('setToken', () => {
    it('stores the token securely', async () => {
      await setToken('new-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'pulse_auth_token',
        'new-token'
      );
    });
  });

  describe('deleteToken', () => {
    it('removes the token', async () => {
      await deleteToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'pulse_auth_token'
      );
    });
  });

  describe('getUserData', () => {
    it('returns stored user data', async () => {
      const userData = JSON.stringify({ id: '1', name: 'Test' });
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(userData);
      const result = await getUserData();
      expect(result).toBe(userData);
    });

    it('returns null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const result = await getUserData();
      expect(result).toBeNull();
    });
  });

  describe('setUserData', () => {
    it('stores user data securely', async () => {
      await setUserData('{"id":"1"}');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'pulse_user_data',
        '{"id":"1"}'
      );
    });
  });

  describe('deleteUserData', () => {
    it('removes user data', async () => {
      await deleteUserData();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'pulse_user_data'
      );
    });
  });

  describe('clearAll', () => {
    it('removes both token and user data', async () => {
      await clearAll();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'pulse_auth_token'
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'pulse_user_data'
      );
    });
  });
});
