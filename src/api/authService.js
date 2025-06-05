import api from './axios';
import { useUserStore } from '../store/userStore';
import { API_ROUTES } from './constants';

const API_URL = 'http://localhost:8080';

const authService = {
    // Regular login
    async login(email, password) {
        try {
            const response = await api.post(API_ROUTES.AUTH.LOGIN, {
                email,
                password
            }, {
                timeout: 15000
            });

            if (response.data.accessToken) {
                // Store access token in localStorage
                localStorage.setItem('token', response.data.accessToken);
                
                // refreshToken은 서버 Redis에만 저장하므로 로컬스토리지에 저장하지 않음
                
                return {
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken, // 로그인 결과에는 포함하지만 저장하지 않음
                    email: email
                };
            }
            return null;
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new Error('서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
            }
            
            if (error.response?.status >= 500) {
                throw new Error('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
            
            if (error.response?.status >= 400 && error.response?.status < 500) {
                const errorMessage = error.response?.data?.message || 
                                   error.response?.data || 
                                   '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
                throw new Error(errorMessage);
            }
            
            throw error;
        }
    },

    // Google OAuth2 login
    googleLogin: () => {
        window.location.href = `${API_URL}${API_ROUTES.OAUTH.GOOGLE_LOGIN}`;
    },

    // Handle OAuth2 login success
    handleOAuth2Success: async (response) => {
        const { token, email, name } = response;
        localStorage.setItem('token', token);
        
        // Set user in Zustand store
        const userStore = useUserStore.getState();
        userStore.setUser({
            email,
            name,
            provider: 'GOOGLE'
        });
        
        return {
            access_token: token,
            email,
            name
        };
    },

    // Get current user info
    async getCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('No authentication token found');
            }

            // 먼저 JWT 토큰에서 사용자 정보 추출 시도
            let userInfo = null;
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    // JWT 토큰인 경우
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const email = payload.sub || payload.email;
                    
                    if (email) {
                        userInfo = {
                            userId: payload.userId || null,
                            email: email,
                            name: payload.name || email.split('@')[0],
                            provider: 'LOCAL' // JWT 토큰이면 일반 로그인
                        };
                        
                        console.log('JWT 토큰에서 사용자 정보 추출:', userInfo);
                    }
                }
            } catch (jwtError) {
                console.log('JWT 파싱 실패, Google OAuth 토큰으로 추정');
                // JWT가 아니면 Google OAuth 토큰으로 간주
            }

            // JWT에서 정보를 얻었고 LOCAL provider면 백엔드 API 호출하지 않음
            if (userInfo && userInfo.provider === 'LOCAL') {
                // Update Zustand store with user data
                if (useUserStore) {
                    const userStore = useUserStore.getState();
                    userStore.setUser(userInfo);
                }
                return userInfo;
            }

            // Google OAuth 토큰이거나 JWT에서 정보를 얻지 못한 경우 백엔드 API 호출
            try {
                const response = await api.get('/auth/me');
                
                if (response.data) {
                    const userData = {
                        userId: response.data.userId,
                        email: response.data.email,
                        name: response.data.name,
                        provider: response.data.provider || 'GOOGLE'
                    };

                    console.log('백엔드에서 사용자 정보 조회 성공:', userData);

                    // Update Zustand store with user data
                    if (useUserStore) {
                        const userStore = useUserStore.getState();
                        userStore.setUser(userData);
                    }
                    
                    return userData;
                }
            } catch (apiError) {
                console.log('백엔드 API 호출 실패:', apiError.message);
                
                // API 호출도 실패하고 JWT 정보도 없으면 에러
                if (!userInfo) {
                    throw new Error('Unable to get user information');
                }
            }
            
            // 마지막으로 JWT에서 얻은 정보라도 반환
            if (userInfo) {
                if (useUserStore) {
                    const userStore = useUserStore.getState();
                    userStore.setUser(userInfo);
                }
                return userInfo;
            }
            
            throw new Error('No user information available');
            
        } catch (error) {
            console.error('getCurrentUser error:', error);
            throw error;
        }
    },

    // Google OAuth token validation
    validateGoogleToken: async () => {
        const response = await api.get(API_ROUTES.OAUTH.VALIDATE);
        return response.data;
    },

    // Send verification code for signup
    sendVerificationCode: async (email) => {
        try {
            const response = await api.post(API_ROUTES.AUTH.SEND_SIGNUP_CODE, { email }, {
                timeout: 10000
            });
            return { success: true, message: '인증 코드가 전송되었습니다.' };
        } catch (error) {
            console.error('Send verification code error:', error);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return { 
                    success: true, 
                    message: '인증 코드 전송 중입니다. 잠시 후 이메일을 확인해주세요.' 
                };
            }
            
            if (error.response?.status === 200) {
                return { success: true, message: '인증 코드가 전송되었습니다.' };
            }
            
            if (error.response?.status >= 500 || !error.response) {
                return { 
                    success: true, 
                    message: '인증 코드를 전송했습니다. 이메일을 확인해주세요.' 
                };
            }
            
            if (error.response?.status >= 400 && error.response?.status < 500) {
                const errorMessage = error.response?.data?.message || 
                                   error.response?.data || 
                                   '인증 코드 전송에 실패했습니다.';
                throw new Error(errorMessage);
            }
            
            return { 
                success: true, 
                message: '인증 코드를 전송했습니다. 이메일을 확인해주세요.' 
            };
        }
    },

    // Verify email code for signup
    verifyEmail: async (email, code) => {
        const response = await api.post(API_ROUTES.AUTH.VERIFY_SIGNUP_CODE, { email, code });
        return response.data;
    },

    // Sign up
    signup: async (userData) => {
        try {
            const response = await api.post(API_ROUTES.AUTH.SIGNUP, userData);
            return response.data;
        } catch (error) {
            console.error('Signup error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '회원가입에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Logout
    logout: async () => {
        try {
            // 서버에 로그아웃 요청은 현재 JWT 토큰으로 처리
            const token = localStorage.getItem('token');
            
            if (token) {
                // JWT 토큰에서 이메일 추출
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        const email = payload.sub || payload.email;
                        
                        if (email) {
                            // 서버에 로그아웃 요청 (리프레시 토큰 삭제)
                            await api.post(API_ROUTES.AUTH.TOKEN_LOGOUT, null, {
                                params: { email }
                            });
                        }
                    }
                } catch (e) {
                    console.error('Token parsing error during logout:', e);
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear tokens from localStorage
            localStorage.removeItem('token');
            
            // Clear user from Zustand store
            if (useUserStore) {
                const userStore = useUserStore.getState();
                userStore.clearUser();
            }
        }
    },

    // Get token
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        try {
            const parts = token.split('.');
            
            // JWT 토큰인 경우 만료 시간 확인
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                
                return payload.exp && payload.exp > currentTime;
            } else {
                // Google OAuth 토큰인 경우 토큰 존재 여부만 확인
                // 실제 유효성은 API 호출 시 확인됨
                return true;
            }
        } catch (e) {
            // 토큰 파싱 실패 시에도 Google OAuth 토큰일 가능성 고려
            return token.length > 0;
        }
    },

    // Request password reset (sends verification code to email)
    forgotPassword: async (email) => {
        try {
            const response = await api.post(API_ROUTES.AUTH.SEND_RESET_CODE, { email }, {
                timeout: 10000
            });
            return { success: true, message: '비밀번호 재설정 코드가 전송되었습니다.' };
        } catch (error) {
            console.error('Password reset request error:', error);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return { 
                    success: true, 
                    message: '비밀번호 재설정 코드 전송 중입니다. 잠시 후 이메일을 확인해주세요.' 
                };
            }
            
            if (error.response?.status === 200) {
                return { success: true, message: '비밀번호 재설정 코드가 전송되었습니다.' };
            }
            
            if (error.response?.status >= 500 || !error.response) {
                return { 
                    success: true, 
                    message: '비밀번호 재설정 코드를 전송했습니다. 이메일을 확인해주세요.' 
                };
            }
            
            if (error.response?.status >= 400 && error.response?.status < 500) {
                const errorMessage = error.response?.data?.message || 
                                   error.response?.data || 
                                   '비밀번호 재설정 코드 전송에 실패했습니다.';
                throw new Error(errorMessage);
            }
            
            return { 
                success: true, 
                message: '비밀번호 재설정 코드를 전송했습니다. 이메일을 확인해주세요.' 
            };
        }
    },

    // Verify reset password code
    verifyResetCode: async (email, code) => {
        try {
            const response = await api.post(API_ROUTES.AUTH.VERIFY_RESET_CODE, { email, code });
            return response.data;
        } catch (error) {
            console.error('Reset code verification error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '인증 코드 확인에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Reset password with new password
    resetPassword: async (email, newPassword) => {
        try {
            const response = await api.patch(API_ROUTES.AUTH.RESET_PASSWORD, { 
                email, 
                newPassword 
            });
            return response.data;
        } catch (error) {
            console.error('Password reset error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '비밀번호 재설정에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Update user profile (not implemented in server yet)
    updateProfile: async (profileData) => {
        try {
            // This endpoint doesn't exist in current server implementation
            // You may need to implement this in the server
            const response = await api.put('/api/user/profile', profileData);
            
            if (useUserStore) {
                const userStore = useUserStore.getState();
                userStore.setUser(response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('Profile update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프로필 업데이트에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Delete user account
    deleteAccount: async (email) => {
        try {
            const response = await api.delete(API_ROUTES.AUTH.WITHDRAW, {
                params: { email }
            });
            
            // Clear all local data after successful deletion
            localStorage.removeItem('token');
            
            // Clear user from Zustand store
            if (useUserStore) {
                const userStore = useUserStore.getState();
                userStore.clearUser();
            }
            
            return response.data;
        } catch (error) {
            console.error('Account deletion error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '계정 삭제에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Change password (not implemented in server yet)
    changePassword: async (currentPassword, newPassword) => {
        try {
            // This endpoint doesn't exist in current server implementation
            const response = await api.post('/api/user/change-password', {
                currentPassword,
                newPassword
            });
            return response.data;
        } catch (error) {
            console.error('Password change error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '비밀번호 변경에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // Refresh access token using email (refresh token stored in Redis)
    refreshToken: async () => {
        try {
            // 현재 액세스 토큰에서 이메일 추출
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No access token found');
            }

            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const payload = JSON.parse(atob(parts[1]));
            const email = payload.sub || payload.email;
            
            if (!email) {
                throw new Error('No email found in token');
            }

            // 이메일로 서버에 토큰 재발급 요청
            const response = await api.post(API_ROUTES.AUTH.TOKEN_REFRESH, null, {
                params: { email },
                timeout: 10000
            });

            if (response.data && response.data.accessToken) {
                // Store new access token
                localStorage.setItem('token', response.data.accessToken);
                return {
                    success: true,
                    accessToken: response.data.accessToken
                };
            } else {
                throw new Error('No access token in response');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            
            if (error.code === 'ERR_NETWORK' || 
                error.message === 'Network Error' ||
                error.response?.status === 401 || 
                error.response?.status === 403) {
                
                console.log('Refresh token appears to be expired or invalid');
                // Clear access token
                localStorage.removeItem('token');
                throw new Error('Refresh token expired');
            }
            
            throw error;
        }
    },

    // Refresh Google OAuth access token using email
    refreshGoogleToken: async (email) => {
        try {
            if (!email) {
                throw new Error('Email is required for Google OAuth token refresh');
            }

            console.log('Google OAuth 토큰 재발급 시도 중... 이메일:', email);

            const response = await fetch(`http://localhost:8080/api/oauth2/refresh?email=${encodeURIComponent(email)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Google OAuth 토큰 재발급 응답 상태:', response.status);

            if (response.status === 200) {
                const data = await response.json();
                console.log('서버 응답 데이터:', data);
                
                if (data.accessToken) {
                    localStorage.setItem('token', data.accessToken);
                    console.log('Google OAuth 토큰 재발급 성공');
                    return {
                        success: true,
                        accessToken: data.accessToken
                    };
                } else {
                    throw new Error('No access token in response');
                }
            } else if (response.status === 404) {
                const errorData = await response.json();
                if (errorData.error === 'refresh_token_not_found') {
                    throw new Error('저장된 리프레시 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
                } else {
                    throw new Error('Google OAuth 리프레시 토큰을 찾을 수 없습니다.');
                }
            } else if (response.status === 401) {
                const errorData = await response.json();
                if (errorData.error === 'refresh_token_expired') {
                    throw new Error('Google OAuth 리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.');
                } else {
                    throw new Error('Google OAuth 토큰 재발급에 실패했습니다.');
                }
            } else {
                const errorData = await response.json();
                throw new Error(`Google OAuth 토큰 재발급 실패 (${response.status}): ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Google OAuth token refresh failed:', error);
            throw error;
        }
    }
};

export default authService;