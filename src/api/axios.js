import axios from 'axios';

const API_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 타임아웃을 10초로 증가
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // multipart/form-data 요청의 경우 Content-Type을 자동으로 설정하도록 함
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']; // 브라우저가 자동으로 설정하도록
        }
        
        config.withCredentials = true;
        
        console.log('Request config:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            hasToken: !!token
        });
        
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor with token refresh logic
api.interceptors.response.use(
    (response) => {
        console.log('Response success:', {
            url: response.config.url,
            status: response.status,
            data: response.data
        });
        return response;
    },
    async (error) => {
        console.error('Response error:', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });
        
        const originalRequest = error.config;
        
        // 401 에러이고 아직 재시도하지 않은 요청인 경우 토큰 갱신 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    console.log('401 error detected, attempting token refresh...');
                    
                    // 토큰 갱신 요청
                    const refreshResponse = await axios.post(`${API_URL}/api/auth/token/refresh`, null, {
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    
                    if (refreshResponse.data && refreshResponse.data.access_token) {
                        // 새로운 액세스 토큰 저장
                        localStorage.setItem('token', refreshResponse.data.access_token);
                        
                        // 원래 요청에 새로운 토큰 적용하여 재시도
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    
                    // 토큰 갱신 실패 시 모든 토큰 제거
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    
                    // 로그인 페이지로 리다이렉트를 위한 이벤트 발생
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
            } else {
                // 리프레시 토큰이 없으면 로그아웃 처리
                localStorage.removeItem('token');
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
        }
        
        // 다른 에러들은 그대로 전달
        return Promise.reject(error);
    }
);

export default api; 