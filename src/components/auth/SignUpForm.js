import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { signUp } from '../../api/auth';

const SignUpForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
    });
    const [error, setError] = useState('');
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

        try {
            await signUp(formData);
            navigate('/login');
        } catch (err) {
            const errorMessage = err.response?.data?.message || '회원가입에 실패했습니다.';
            setError(errorMessage);
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
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
            />
            
            <TextField
                margin="normal"
                required
                fullWidth
                name="name"
                label="이름"
                id="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
            />
            
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
            >
                회원가입
            </Button>
            
            <Typography align="center">
                이미 계정이 있으신가요?{' '}
                <Button
                    color="primary"
                    onClick={() => navigate('/login')}
                >
                    로그인
                </Button>
            </Typography>
        </Box>
    );
};

export default SignUpForm; 