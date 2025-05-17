import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import authService from '../services/authService';
import { AUTH_ROUTES } from '../constants/auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [step, setStep] = useState(1); // 1: 이메일 입력, 2: 인증 코드 확인, 3: 새 비밀번호 입력

  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setIsSendingCode(true);
    setError('');

    try {
      await authService.requestPasswordReset(email);
      alert('인증 코드가 이메일로 전송되었습니다.');
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.message || '인증 코드 전송에 실패했습니다.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyResetCode(email, verificationCode);
      setIsVerified(true);
      setStep(3);
    } catch (error) {
      setError(error.response?.data?.message || '인증 코드 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      await authService.confirmNewPassword(email, newPassword);
      alert('비밀번호가 재설정되었습니다. 새로운 비밀번호로 로그인해주세요.');
      navigate(AUTH_ROUTES.LOGIN);
    } catch (error) {
      setError(error.response?.data?.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            비밀번호 찾기
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Box component="form" sx={{ mt: 1, width: '100%' }}>
            {step === 1 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="이메일"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? <CircularProgress size={24} /> : '인증 코드 전송'}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="인증 코드"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : '인증 코드 확인'}
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="newPassword"
                  label="새 비밀번호"
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="새 비밀번호 확인"
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : '비밀번호 재설정'}
                </Button>
              </>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <Link href="#" variant="body2" onClick={() => navigate(AUTH_ROUTES.LOGIN)}>
                로그인으로 돌아가기
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword; 