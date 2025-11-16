import axios from 'axios';

// 환경 변수에서 API URL 가져오기 (빌드 시점에 주입됨)
const getApiUrl = () => {
    // 환경 변수가 있으면 사용 (하지만 HTTP를 HTTPS로 변환)
    if (process.env.REACT_APP_API_URL) {
        let apiUrl = process.env.REACT_APP_API_URL;
        // 현재 페이지가 HTTPS인데 환경 변수가 HTTP로 시작하면 HTTPS로 변환
        if (window.location.protocol === 'https:' && apiUrl.startsWith('http://')) {
            apiUrl = apiUrl.replace('http://', 'https://');
            console.log('API_URL converted from HTTP to HTTPS:', apiUrl);
        } else {
            console.log('API_URL from env:', apiUrl);
        }
        return apiUrl;
    }
    
    // 로컬 개발 환경
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
        console.log('API_URL for localhost:', 'http://localhost:8080');
        return 'http://localhost:8080';
    }
    
    // 프로덕션 환경: 현재 페이지의 프로토콜을 따라감
    // HTTPS 페이지에서는 HTTPS API를 사용해야 함 (Mixed Content 방지)
    const protocol = window.location.protocol; // 'https:' or 'http:'
    const host = window.location.host; // 'malkong.site'
    
    // 현재 페이지가 HTTPS면 API도 HTTPS 사용 (강제)
    if (protocol === 'https:') {
        const apiUrl = `https://${host}`;
        console.log('API_URL for HTTPS:', apiUrl);
        return apiUrl;
    }
    
    // HTTP 페이지인 경우도 HTTPS로 강제 (프로덕션에서는 항상 HTTPS 사용)
    // malkong.site 도메인인 경우 항상 HTTPS 사용
    if (host.includes('malkong.site')) {
        const apiUrl = `https://${host}`;
        console.log('API_URL forced to HTTPS for malkong.site:', apiUrl);
        return apiUrl;
    }
    
    // 기타 HTTP 페이지인 경우
    const apiUrl = `http://${host}`;
    console.log('API_URL for HTTP:', apiUrl);
    return apiUrl;
};

const API_URL = getApiUrl();
console.log('Final API_URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    timeout: 600000, // 타임아웃을 10분으로 증가 (대용량 파일 업로드 지원)
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
            // 파일 업로드 요청의 경우 타임아웃을 더 길게 설정 (명시적으로 설정되지 않은 경우만)
            if (!config.timeout) {
                config.timeout = 600000; // 10분 (대용량 파일 업로드 지원)
            }
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
                
                // 현재 JWT 토큰에서 이메일과 provider 추출
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
                const provider = payload.provider || 'LOCAL';
                
                if (!email) {
                    throw new Error('No email found in token');
                }
                
                // Google OAuth 토큰의 경우 백엔드 refresh API 사용
                if (provider === 'GOOGLE') {
                    console.log('Google OAuth 토큰 - 백엔드 갱신 API 호출');
                    try {
                        const refreshResponse = await axios.post(`${api.defaults.baseURL}/api/oauth2/refresh`, null, {
                            params: { email },
                            timeout: 10000
                        });
                        
                        if (refreshResponse.data && refreshResponse.data.accessToken) {
                            localStorage.setItem('token', refreshResponse.data.accessToken);
                            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
                            return api(originalRequest);
                        } else {
                            throw new Error('No access token in response');
                        }
                    } catch (refreshError) {
                        console.error('Google OAuth 토큰 갱신 실패:', refreshError);
                        throw refreshError;
                    }
                }
                
                // 이메일로 토큰 갱신 요청 (LOCAL 토큰만)
                const refreshResponse = await axios.post(`${api.defaults.baseURL}/api/auth/token/refresh`, null, {
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
                
                // Google OAuth 토큰의 경우 로그아웃하지 않음
                const currentToken = localStorage.getItem('token');
                if (currentToken) {
                    try {
                        const parts = currentToken.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]));
                            const provider = payload.provider || 'LOCAL';
                            
                            if (provider === 'GOOGLE') {
                                console.log('Google OAuth 토큰 - 401 에러 발생하지만 로그아웃하지 않음');
                                return Promise.reject(error);
                            }
                        }
                    } catch (e) {
                        // 무시
                    }
                }
                
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