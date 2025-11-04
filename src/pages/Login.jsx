import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Container, InputAdornment, IconButton, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError, fetchUserInfo, setUser, logout } from '../store/slices/authSlice';
import authService from '../api/authService';
import Navbar from '../components/Navbar';
import useError from '../hooks/useError';
import useLoading from '../hooks/useLoading';
import theme from '../theme';
import useAuthCheck from '../hooks/useAuthCheck';
// Google 공식 로고 컴포넌트
const GoogleLogo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// Styled Components
const PageContainer = styled(Container)({
  height: '100vh',
  minWidth: '100vw',
  width: '100vw',
  maxWidth: '100vw',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  margin: 0,
  background: '#FFFFFF',
  overflow: 'hidden',
});

const ContentContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  width: '100%',
  height: '100vh',
  maxWidth: '1200px',
  margin: '0 auto',
  gap: '60px',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '-70px', // Navbar 높이만큼 위로 올림
});

const LeftSection = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: '#FFFFFF',
});

const RightSection = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: '#FFFFFF',
});

const LogoSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
});

const LogoImage = styled('img')({
  width: 'auto',
  height: '120px', // 텍스트 크기 72px과 비슷한 높이
  objectFit: 'contain',
});

const LoginCard = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  padding: '32px',
  borderRadius: '16px',
  background: '#FFFFFF',
  boxShadow: theme.shadows.md,
  border: '1px solid #E0E0E0',
});

const FormTitle = styled(Typography)({
  color: theme.palette.text.primary,
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
    backgroundColor: '#FFFFFF',
    '& fieldset': {
      borderColor: theme.palette.border,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
  },
});

const PrimaryButton = styled(Button)({
  width: '100%',
  height: '48px',
  borderRadius: '8px',
  background: theme.palette.primary.main,
  color: '#FFFFFF',
  fontSize: '16px',
  fontFamily: theme.typography.fontFamily.secondary,
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: theme.shadows.sm,
  '&:hover': {
    background: theme.palette.primary.dark,
    boxShadow: theme.shadows.md,
  },
});

const GoogleButton = styled(Button)({
  width: '100%',
  height: '48px',
  borderRadius: '8px',
  background: '#FFFFFF',
  color: theme.palette.text.primary,
  fontSize: '16px',
  fontFamily: theme.typography.fontFamily.secondary,
  fontWeight: 500,
  textTransform: 'none',
  border: '1px solid #E0E0E0',
  marginTop: '16px',
  '&:hover': {
    background: '#F5F5F5',
  },
});

const LinkText = styled(Typography)({
  color: theme.palette.text.primary,
  fontSize: '14px',
  fontFamily: theme.typography.fontFamily.primary,
  textDecoration: 'underline',
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.primary.main,
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
              <EmailIcon sx={{ color: theme.palette.text.secondary }} />
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
              <LockIcon sx={{ color: theme.palette.text.secondary }} />
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
        startIcon={<GoogleLogo size={20} />}
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
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);
  
  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Prevent body scroll on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  // Redirect if already authenticated
  useAuthCheck('/dashboard');

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
            dispatch(setUser(userData));
            
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
          
          dispatch(setUser(userData));
          
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
        
        dispatch(setUser(userData));
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
          <LeftSection>
            <LogoSection>
              <LogoImage src="/malkong_logo.png" alt="또랑또랑" />
            </LogoSection>
          </LeftSection>

          <RightSection>
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
          </RightSection>
        </ContentContainer>
      </PageContainer>
    </>
  );
};

export default Login;