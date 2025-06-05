import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Container, InputAdornment, IconButton, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/slices/authSlice';
import { useUserStore } from '../store/userStore';
import authService from '../api/authService';
import Navbar from '../components/Navbar';

// Theme constants
const theme = {
  colors: {
    primary: {
      main: '#2C2C2C',
      hover: '#1C1C1C',
      light: '#3C3C3C',
    },
    text: {
      primary: '#1E1E1E',
      secondary: '#666666',
      white: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#F8F8F8',
      hover: '#F5F5F5',
    },
    border: '#E0E0E0',
    error: '#FF4D4F',
  },
  shadows: {
    sm: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0px 8px 16px rgba(0, 0, 0, 0.15)',
  },
  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      secondary: 'Roboto, sans-serif',
    },
  },
};

// Styled Components
const PageContainer = styled(Container)({
  minHeight: '100vh',
  minWidth: '100vw',
  width: '100vw',
  maxWidth: '100vw',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  margin: 0,
  background: theme.colors.background.default,
  paddingTop: '80px', // Navbar 높이만큼 패딩 추가
});

const ContentContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '80px',
  padding: '40px',
});

const LogoSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
});

const LogoText = styled(Typography)({
  color: theme.colors.text.primary,
  fontSize: '56px',
  fontFamily: theme.typography.fontFamily.primary,
  fontWeight: 600,
  letterSpacing: '-0.5px',
});

const LoginCard = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  padding: '32px',
  borderRadius: '16px',
  background: theme.colors.background.default,
  boxShadow: theme.shadows.md,
  border: `1px solid ${theme.colors.border}`,
});

const FormTitle = styled(Typography)({
  color: theme.colors.text.primary,
  fontSize: '24px',
  fontFamily: theme.typography.fontFamily.primary,
  fontWeight: 600,
  marginBottom: '24px',
  textAlign: 'center',
});

const StyledTextField = styled(TextField)({
  width: '100%',
  marginBottom: '16px',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: theme.colors.background.default,
    '& fieldset': {
      borderColor: theme.colors.border,
    },
    '&:hover fieldset': {
      borderColor: theme.colors.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.colors.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.colors.text.secondary,
  },
});

const PrimaryButton = styled(Button)({
  width: '100%',
  height: '48px',
  borderRadius: '8px',
  background: theme.colors.primary.main,
  color: theme.colors.text.white,
  fontSize: '16px',
  fontFamily: theme.typography.fontFamily.secondary,
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: theme.shadows.sm,
  '&:hover': {
    background: theme.colors.primary.hover,
    boxShadow: theme.shadows.md,
  },
});

const GoogleButton = styled(Button)({
  width: '100%',
  height: '48px',
  borderRadius: '8px',
  background: theme.colors.background.default,
  color: theme.colors.text.primary,
  fontSize: '16px',
  fontFamily: theme.typography.fontFamily.secondary,
  fontWeight: 500,
  textTransform: 'none',
  border: `1px solid ${theme.colors.border}`,
  marginTop: '16px',
  '&:hover': {
    background: theme.colors.background.hover,
  },
});

const LinkText = styled(Typography)({
  color: theme.colors.text.primary,
  fontSize: '14px',
  fontFamily: theme.typography.fontFamily.primary,
  textDecoration: 'underline',
  cursor: 'pointer',
  '&:hover': {
    color: theme.colors.primary.main,
  },
});

const LoginForm = ({ email, setEmail, password, setPassword, onSubmit, navigate, error, loading }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <StyledTextField
        label="이메일"
        variant="outlined"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: theme.colors.text.secondary }} />
            </InputAdornment>
          ),
        }}
      />

      <StyledTextField
        label="비밀번호"
        type={showPassword ? 'text' : 'password'}
        variant="outlined"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon sx={{ color: theme.colors.text.secondary }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <PrimaryButton 
        type="submit"
        disabled={loading}
      >
        {loading ? '로그인 중...' : '로그인'}
      </PrimaryButton>

      <GoogleButton
        startIcon={<GoogleIcon />}
        onClick={() => authService.googleLogin()}
        disabled={loading}
      >
        Google로 계속하기
      </GoogleButton>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: '24px',
      }}>
        <LinkText onClick={() => navigate('/forgot-password')}>
          비밀번호 찾기
        </LinkText>
        <LinkText onClick={() => navigate('/signup')}>
          회원가입
        </LinkText>
      </Box>
    </form>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get auth state from Redux
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  
  // Get user state from Zustand
  const fetchUserInfo = useUserStore(state => state.fetchUserInfo);

  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // 토큰이 있고 인증된 상태라면 대시보드로 리다이렉트
    if (token && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // 토큰은 있지만 Redux 상태가 인증되지 않은 경우, 토큰 유효성 확인
    if (token && !isAuthenticated) {
      try {
        // JWT 토큰의 만료 시간을 클라이언트에서 직접 확인
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          // 토큰이 유효하다면 대시보드로 리다이렉트
          if (payload.exp && payload.exp > currentTime) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // 토큰이 유효하지 않으면 제거
        localStorage.removeItem('token');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field validation
    if (!email || !password) {
      return;
    }

    try {
      // Login with Redux (handles authentication)
      const result = await dispatch(login({ email, password })).unwrap();
      
      // Get token from Redux result instead of localStorage immediately
      const token = result.accessToken || result.access_token;
      
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // JWT 토큰인 경우 (일반 로그인)
            const payload = JSON.parse(atob(parts[1]));
            const userData = {
              email: payload.sub || payload.email || email,
              name: payload.name || email.split('@')[0],
              provider: 'LOCAL'
            };
            
            // Set user info directly without API call
            const { setUser } = useUserStore.getState();
            setUser(userData);
            
            console.log('일반 로그인 성공, 사용자 정보 설정 완료:', userData);
          } else {
            // Google OAuth 토큰인 경우에만 fetchUserInfo 호출 (하지만 일반 로그인에서는 발생하지 않음)
            console.log('Unexpected: Google OAuth token in regular login');
          }
        } catch (tokenError) {
          console.error('Token parsing error:', tokenError);
          // 토큰 파싱 실패 시 기본 사용자 정보 설정
          const userData = {
            email: email,
            name: email.split('@')[0],
            provider: 'LOCAL'
          };
          
          const { setUser } = useUserStore.getState();
          setUser(userData);
          
          console.log('토큰 파싱 실패, 기본 사용자 정보 설정:', userData);
        }
      } else {
        console.error('No token received from login');
        // 토큰이 없어도 기본 사용자 정보는 설정
        const userData = {
          email: email,
          name: email.split('@')[0],
          provider: 'LOCAL'
        };
        
        const { setUser } = useUserStore.getState();
        setUser(userData);
      }
      
      // Navigation happens in the useEffect that watches isAuthenticated
    } catch (err) {
      // Error is already handled in the reducer
      console.error('Login error:', err);
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer>
        <ContentContainer>
          <LogoSection>
            <LogoText>
              또랑또랑
            </LogoText>
          </LogoSection>

          <LoginCard>
            <FormTitle>
              로그인
            </FormTitle>
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={handleSubmit}
              navigate={navigate}
              error={error}
              loading={loading}
            />
          </LoginCard>
        </ContentContainer>
      </PageContainer>
    </>
  );
};

export default Login; 