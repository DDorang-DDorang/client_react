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

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setIsSendingCode(true);
    setError('');

    try {
      await authService.sendVerificationCode(formData.email);
      alert('인증 코드가 이메일로 전송되었습니다.');
    } catch (error) {
      setError(error.response?.data?.message || '인증 코드 전송에 실패했습니다.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode) {
      setError('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyEmail(formData.email, verificationCode);
      setIsEmailVerified(true);
      alert('이메일 인증이 완료되었습니다.');
    } catch (error) {
      setError(error.response?.data?.message || '이메일 인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEmailVerified) {
      setError('이메일 인증이 필요합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      await authService.signup({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate(AUTH_ROUTES.LOGIN);
    } catch (error) {
      setError(error.response?.data?.message || '회원가입에 실패했습니다.');
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
            회원가입
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="이메일"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={isEmailVerified}
            />
            {!isEmailVerified && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  fullWidth
                  label="인증 코드"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isSendingCode}
                />
                <Button
                  variant="outlined"
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? <CircularProgress size={24} /> : '인증 코드 전송'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleVerifyEmail}
                  disabled={!verificationCode || loading}
                >
                  {loading ? <CircularProgress size={24} /> : '인증'}
                </Button>
              </Box>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              name="name"
              label="이름"
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="비밀번호 확인"
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !isEmailVerified}
            >
              {loading ? '처리 중...' : '회원가입'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link href="#" variant="body2" onClick={() => navigate(AUTH_ROUTES.LOGIN)}>
                이미 계정이 있으신가요? 로그인
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SignUp; 