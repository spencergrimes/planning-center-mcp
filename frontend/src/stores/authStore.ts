import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    subdomain: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, organizationId: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string, organizationId: string) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email,
            password,
            organizationId,
          }, {
            withCredentials: true
          });

          const { user } = response.data;
          set({ 
            user, 
            token: 'cookie-based', // Token is in HTTP-only cookie
            isLoading: false 
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error?.message || 'Login failed');
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, data, {
            withCredentials: true
          });

          const { user } = response.data;
          set({ 
            user, 
            token: 'cookie-based',
            isLoading: false 
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error?.message || 'Registration failed');
        }
      },

      logout: async () => {
        try {
          await axios.post(`${API_BASE_URL}/api/v1/auth/logout`, {}, {
            withCredentials: true
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, token: null });
        }
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
            withCredentials: true
          });
          
          set({ user: response.data.user });
        } catch (error) {
          set({ user: null, token: null });
        }
      },
    }));