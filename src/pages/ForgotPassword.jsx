import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Container, InputAdornment, IconButton, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import NumbersIcon from '@mui/icons-material/Numbers';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import authService from '../api/authService';
import Navbar from '../components/Navbar';
import { validateEmail, validatePassword } from '../api/utils/validation';
import useError from '../hooks/useError';
import useLoading from '../hooks/useLoading';
import theme from '../theme';
import useAuthCheck from '../hooks/useAuthCheck';

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
  padding: '40px',
  background: '#FFFFFF',
});

const RightSection = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
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

const ResetCard = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  padding: '32px',
  borderRadius: '16px',
  background: '#FFFFFF',
  boxShadow: theme.shadows.md,
  border: `1px solid ${theme.palette.border}`,
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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: New Password, 4: Success
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { error, setError, resetError } = useError('');
  const { loading, setLoading } = useLoading(false);

  useAuthCheck('/dashboard');

  // Prevent body scroll on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    resetError();

    if (!validateEmail(email)) {
      setError('유효한 이메일 주소를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.forgotPassword(email);
      // authService에서 이미 개선된 응답을 반환하므로 다음 단계로 진행
      setStep(2);
    } catch (err) {
      console.log('Password reset error details:', err);
      // authService에서 대부분의 경우를 성공으로 처리하므로 실제 에러만 표시
      const errorMessage = err.message || '비밀번호 재설정 요청에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    resetError();

    if (!verificationCode) {
      setError('인증 코드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await authService.verifyResetCode(email, verificationCode);
      setStep(3);
    } catch (err) {
      setError(err.message || '인증 코드 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    resetError();

    if (!validatePassword(newPassword)) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(email, newPassword);
      setStep(4);
    } catch (err) {
      setError(err.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleRequestReset}>
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
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? '처리 중...' : '인증 코드 받기'}
            </PrimaryButton>
          </form>
        );
      case 2:
        return (
          <form onSubmit={handleVerifyCode}>
            <Typography 
              sx={{ 
                marginBottom: '16px', 
                color: theme.palette.text.secondary,
                fontSize: '14px'
              }}
            >
              {email}로 전송된 6자리 인증 코드를 입력해주세요.
            </Typography>
            <StyledTextField
              label="인증 코드"
              variant="outlined"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <NumbersIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              }}
            />
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? '확인 중...' : '인증 코드 확인'}
            </PrimaryButton>
            <Box sx={{ textAlign: 'center', marginTop: '16px' }}>
              <LinkText onClick={() => handleRequestReset({ preventDefault: () => {} })}>
                인증 코드 다시 받기
              </LinkText>
            </Box>
          </form>
        );
      case 3:
        return (
          <form onSubmit={handleResetPassword}>
            <StyledTextField
              label="새 비밀번호"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            <StyledTextField
              label="새 비밀번호 확인"
              type={showConfirmPassword ? 'text' : 'password'}
              variant="outlined"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? '처리 중...' : '비밀번호 변경'}
            </PrimaryButton>
          </form>
        );
      case 4:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ marginBottom: '24px' }}>
              비밀번호가 성공적으로 변경되었습니다.
            </Typography>
            <PrimaryButton onClick={() => navigate('/login')}>
              로그인 페이지로 이동
            </PrimaryButton>
          </Box>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return '비밀번호 찾기';
      case 2:
        return '인증 코드 확인';
      case 3:
        return '새 비밀번호 설정';
      case 4:
        return '비밀번호 변경 완료';
      default:
        return '비밀번호 찾기';
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
            <ResetCard>
              <FormTitle>
                {getStepTitle()}
              </FormTitle>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {renderStepContent()}
              {step < 4 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  marginTop: '24px',
                }}>
                  <LinkText onClick={() => navigate('/login')}>
                    로그인 페이지로 돌아가기
                  </LinkText>
                </Box>
              )}
            </ResetCard>
          </RightSection>
        </ContentContainer>
      </PageContainer>
    </>
  );
};

export default ForgotPassword;