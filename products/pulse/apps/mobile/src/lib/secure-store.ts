import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pulse_auth_token';
const USER_KEY = 'pulse_user_data';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getUserData(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_KEY);
  } catch {
    return null;
  }
}

export async function setUserData(data: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, data);
}

export async function deleteUserData(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearAll(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
