// src/pages/OAuth2RedirectHandler.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import authService from '../services/authService';
import { AUTH_ROUTES } from '../constants/auth';

const OAuth2RedirectHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleOAuth2Callback = async () => {
            try {
                const params = new URLSearchParams(location.search);
                const token = params.get('token');
                const email = params.get('email');
                const name = params.get('name');
                const error = params.get('error');

                if (error) {
                    console.error('OAuth2 error:', error);
                    navigate(`${AUTH_ROUTES.LOGIN}?error=${error}`);
                    return;
                }

                if (!token || !email || !name) {
                    console.error('Missing required data');
                    navigate(`${AUTH_ROUTES.LOGIN}?error=missing_data`);
                    return;
                }

                // Store the Google OAuth token and user info
                await authService.handleOAuth2Success({ token, email, name });
                navigate(AUTH_ROUTES.HOME);
            } catch (error) {
                console.error('OAuth2 callback error:', error);
                navigate(`${AUTH_ROUTES.LOGIN}?error=callback_failed`);
            }
        };

        handleOAuth2Callback();
    }, [location, navigate]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: 2
            }}
        >
            <CircularProgress />
            <Typography variant="h6">
                로그인 처리 중입니다...
            </Typography>
        </Box>
    );
};

export default OAuth2RedirectHandler;
