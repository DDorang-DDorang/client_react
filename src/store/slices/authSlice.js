import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../api/authService';

// Async thunks
export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const response = await authService.login(email, password);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '로그인에 실패했습니다.');
        }
    }
);

export const googleLogin = createAsyncThunk(
    'auth/googleLogin',
    async (token, { rejectWithValue }) => {
        try {
            const response = await authService.googleLogin(token);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '구글 로그인에 실패했습니다.');
        }
    }
);

export const fetchUserInfo = createAsyncThunk(
    'auth/fetchUserInfo',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authService.getCurrentUser();
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '사용자 정보를 가져오는데 실패했습니다.');
        }
    }
);

export const signup = createAsyncThunk(
    'auth/signup',
    async ({ email, password, name }, { rejectWithValue }) => {
        try {
            const response = await authService.signup({ email, password, name });
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '회원가입에 실패했습니다.');
        }
    }
);

export const sendVerificationCode = createAsyncThunk(
    'auth/sendVerificationCode',
    async (email, { rejectWithValue }) => {
        try {
            const response = await authService.sendVerificationCode(email);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '인증 코드 전송에 실패했습니다.');
        }
    }
);

export const verifyEmail = createAsyncThunk(
    'auth/verifyEmail',
    async ({ email, code }, { rejectWithValue }) => {
        try {
            const response = await authService.verifyEmail(email, code);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '이메일 인증에 실패했습니다.');
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
            return null;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || '로그아웃에 실패했습니다.');
        }
    }
);

const initialState = {
    user: null,
    token: authService.getToken(),
    isAuthenticated: authService.isAuthenticated(),
    loading: false,
    error: null,
    emailVerified: false
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setEmailVerified: (state, action) => {
            state.emailVerified = action.payload;
        },
        setUser: (state, action) => {
            state.user = action.payload;
        },
        loginSuccess: (state, action) => {
            // localStorage에 토큰 저장
            localStorage.setItem('token', action.payload.accessToken);
            
            state.isAuthenticated = true;
            state.token = action.payload.accessToken;
            state.user = action.payload.user;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                // localStorage에 토큰 저장 (authService에서 이미 저장하지만 확실히 하기 위해)
                const token = action.payload.accessToken || action.payload.access_token;
                if (token) {
                    localStorage.setItem('token', token);
                }
                
                state.loading = false;
                state.isAuthenticated = true;
                state.token = token;
                state.user = { email: action.payload.email };
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Google Login
            .addCase(googleLogin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(googleLogin.fulfilled, (state, action) => {
                // localStorage에 토큰 저장
                localStorage.setItem('token', action.payload.access_token);
                
                state.loading = false;
                state.isAuthenticated = true;
                state.token = action.payload.access_token;
                state.user = { 
                    email: action.payload.email,
                    name: action.payload.name
                };
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch User Info
            .addCase(fetchUserInfo.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserInfo.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(fetchUserInfo.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                // If we can't fetch user info, user might not be authenticated
                if (action.payload === 'Unauthorized') {
                    state.isAuthenticated = false;
                    state.user = null;
                }
            })
            // Signup
            .addCase(signup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signup.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(signup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Send Verification Code
            .addCase(sendVerificationCode.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendVerificationCode.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(sendVerificationCode.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Verify Email
            .addCase(verifyEmail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyEmail.fulfilled, (state) => {
                state.loading = false;
                state.emailVerified = true;
            })
            .addCase(verifyEmail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                // localStorage에서 토큰 제거
                localStorage.removeItem('token');
                
                // 상태 완전 초기화
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.emailVerified = false;
                state.loading = false;
                state.error = null;
            })
            .addCase(logout.rejected, (state, action) => {
                // 로그아웃 실패해도 로컬 상태는 초기화
                localStorage.removeItem('token');
                
                // 상태 완전 초기화
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.emailVerified = false;
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { clearError, setEmailVerified, setUser, loginSuccess } = authSlice.actions;
export default authSlice.reducer; 