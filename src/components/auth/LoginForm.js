import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { login } from '../../api/auth';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        dispatch(loginStart());

        try {
            const response = await login(formData);
            dispatch(loginSuccess(response));
            navigate('/');
        } catch (err) {
            const errorMessage = err.response?.data?.message || '로그인에 실패했습니다.';
            setError(errorMessage);
            dispatch(loginFailure(errorMessage));
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
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
                value={formData.password}
                onChange={handleChange}
            />
            
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
            >
                로그인
            </Button>
            
            <Typography align="center">
                계정이 없으신가요?{' '}
                <Button
                    color="primary"
                    onClick={() => navigate('/signup')}
                >
                    회원가입
                </Button>
            </Typography>
        </Box>
    );
};

export default LoginForm; 