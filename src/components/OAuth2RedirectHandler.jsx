import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
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

                if (token && email) {
                    await authService.handleOAuth2Success({ access_token: token, email, name });
                    navigate(AUTH_ROUTES.HOME);
                } else {
                    navigate(AUTH_ROUTES.LOGIN);
                }
            } catch (error) {
                console.error('OAuth2 callback error:', error);
                navigate(AUTH_ROUTES.LOGIN);
            }
        };

        handleOAuth2Callback();
    }, [location, navigate]);

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
            }}
        >
            <CircularProgress />
        </Box>
    );
};

export default OAuth2RedirectHandler; 