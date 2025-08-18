import axios from 'axios';

const API_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    timeout: 300000, // 타임아웃을 5분으로 증가
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
            // 파일 업로드 요청의 경우 타임아웃을 더 길게 설정
            config.timeout = 300000; // 5분
        }
        
        config.withCredentials = true;
        
        console.log('Request config:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            hasToken: !!token,
            timeout: config.timeout
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
            
            try {
                console.log('401 error detected, attempting token refresh...');
                
                // 현재 JWT 토큰에서 이메일 추출
                const currentToken = localStorage.getItem('token');
                if (!currentToken) {
                    throw new Error('No access token found');
                }
                
                const parts = currentToken.split('.');
                if (parts.length !== 3) {
                    throw new Error('Invalid JWT token format');
                }
                
                const payload = JSON.parse(atob(parts[1]));
                const email = payload.sub || payload.email;
                
                if (!email) {
                    throw new Error('No email found in token');
                }
                
                // 이메일로 토큰 갱신 요청
                const refreshResponse = await axios.post(`${API_URL}/api/auth/token/refresh`, null, {
                    params: { email },
                    timeout: 10000
                });
                
                if (refreshResponse.data && refreshResponse.data.accessToken) {
                    // 새로운 액세스 토큰 저장
                    localStorage.setItem('token', refreshResponse.data.accessToken);
                    
                    // 원래 요청에 새로운 토큰 적용하여 재시도
                    originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
                    return api(originalRequest);
                } else {
                    throw new Error('No access token in response');
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                
                // 토큰 갱신 실패 시 액세스 토큰 제거
                localStorage.removeItem('token');
                
                // 로그인 페이지로 리다이렉트를 위한 이벤트 발생
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
        }
        
        // 다른 에러들은 그대로 전달
        return Promise.reject(error);
    }
);

export default api; 