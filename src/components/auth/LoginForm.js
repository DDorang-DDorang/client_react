import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, googleLogin } from '../../store/slices/authSlice';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { loading, error } = useSelector((state) => state.auth);

    useEffect(() => {
        // URL에서 토큰 파라미터 확인
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        if (token) {
            handleGoogleLogin(token);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(login({ email, password }));
        if (!result.error) {
            navigate('/');
        }
    };

    const handleGoogleLogin = async (token) => {
        const result = await dispatch(googleLogin(token));
        if (!result.error) {
            navigate('/');
        }
    };

    const handleGoogleClick = () => {
        const oauthUrl = process.env.REACT_APP_OAUTH_REDIRECT_URL || 
            (process.env.REACT_APP_API_URL || 'http://localhost:8080') + '/oauth2/authorization/google';
        window.location.href = oauthUrl;
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
                <Typography component="h1" variant="h5">
                    로그인
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="비밀번호"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : '로그인'}
                    </Button>
                    <Divider sx={{ my: 2 }}>또는</Divider>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<GoogleIcon />}
                        onClick={handleGoogleClick}
                        sx={{ mb: 2 }}
                    >
                        Google로 로그인
                    </Button>
                    <Button
                        fullWidth
                        variant="text"
                        onClick={() => navigate('/signup')}
                    >
                        계정이 없으신가요? 회원가입
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginForm; 