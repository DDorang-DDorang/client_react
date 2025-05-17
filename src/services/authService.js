import api from '../api/axios';

const API_URL = 'http://localhost:8080';

const authService = {
  // Google OAuth2 login
  googleLogin: () => {
    window.location.href = `${API_URL}/oauth2/authorization/google`;
  },

  // Handle OAuth2 login success
  handleOAuth2Success: async (response) => {
    const { token, email, name } = response;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ email, name }));
    return response;
  },

  // Regular login
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.accessToken) {
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('user', JSON.stringify({
          email: response.data.email,
          name: response.data.name
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Send verification code
  sendVerificationCode: async (email) => {
    const response = await api.post('/auth/send-code', { email });
    return response.data;
  },

  // Verify email
  verifyEmail: async (email, code) => {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  },

  // Sign up
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get stored user data
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token found');

      const response = await api.post('/api/auth/refresh', {
        refreshToken
      });
      const { accessToken } = response.data;
      localStorage.setItem('token', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Access token refresh failed:', error);
      authService.logout();
      return null;
    }
  },
};

// Add axios interceptor for adding token to requests
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add axios interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await authService.refreshToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        authService.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default authService; 