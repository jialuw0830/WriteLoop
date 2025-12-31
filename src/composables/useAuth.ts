import { ref, computed } from 'vue';
import { getApiUrl } from '../config';

interface User {
  id: number;
  username: string;
  created_at?: string | null;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const token = ref<string | null>(localStorage.getItem('token'));
const user = ref<User | null>(null);

// 从localStorage恢复用户信息
const savedUser = localStorage.getItem('user');
if (savedUser) {
  try {
    user.value = JSON.parse(savedUser);
  } catch (e) {
    console.error('Failed to parse saved user:', e);
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function login(username: string, password: string): Promise<void> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '登录失败' }));
      throw new Error(error.detail || '登录失败');
    }

    const data: LoginResponse = await response.json();
    token.value = data.access_token;
    user.value = data.user;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  async function register(username: string, password: string): Promise<void> {
    const response = await fetch(getApiUrl('/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '注册失败' }));
      throw new Error(error.detail || '注册失败');
    }

    const data: LoginResponse = await response.json();
    token.value = data.access_token;
    user.value = data.user;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  async function logout(): Promise<void> {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!token.value) return;

    const response = await fetch(getApiUrl('/me'), {
      headers: {
        'Authorization': `Bearer ${token.value}`,
      },
    });

    if (response.ok) {
      const data: User = await response.json();
      user.value = data;
      localStorage.setItem('user', JSON.stringify(data));
    } else {
      // Token无效，清除登录状态
      await logout();
    }
  }

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }
    return headers;
  }

  return {
    token: computed(() => token.value),
    user: computed(() => user.value),
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
    getAuthHeaders,
  };
}
