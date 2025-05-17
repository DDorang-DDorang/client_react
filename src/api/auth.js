import api from './axios';

export const signUp = async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
};

export const login = async (credentials) => {
    try {
        const response = await api.post('/auth/login', {
            email: credentials.email,
            password: credentials.password
        });
        
        if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
            localStorage.setItem('user', JSON.stringify({
                email: response.data.email,
                name: response.data.name
            }));
        }
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logout = async () => {
    await api.post('/api/oauth2/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const validateToken = async () => {
    const response = await api.get('/api/oauth2/validate');
    return response.data;
}; 