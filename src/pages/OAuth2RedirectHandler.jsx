// src/pages/OAuth2RedirectHandler.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';
import { loginSuccess } from '../store/slices/authSlice';
import { useUserStore } from '../store/userStore';

const OAuth2RedirectHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { setUser } = useUserStore();

    useEffect(() => {
        const handleOAuth2Callback = async () => {
            try {
                const params = new URLSearchParams(location.search);
                // 서버에서 'token' 파라미터로 보내므로 이를 확인
                const accessToken = params.get('token');
                const error = params.get('error');
                const email = params.get('email');
                const name = params.get('name');

                if (error) {
                    console.error('OAuth2 error:', error);
                    navigate(`/login?error=${encodeURIComponent(error)}`);
                    return;
                }

                if (!accessToken) {
                    console.error('Missing access token');
                    navigate(`/login?error=${encodeURIComponent('인증 토큰을 받지 못했습니다.')}`);
                    return;
                }

                // 액세스 토큰을 localStorage에 저장
                localStorage.setItem('token', accessToken);

                // 사용자 정보 구성 (서버에서 전달받은 정보 사용)
                const userInfo = {
                    email: email || 'unknown@example.com',
                    name: name || 'Unknown User',
                    provider: 'GOOGLE'
                };

                // Redux 상태 업데이트
                dispatch(loginSuccess({
                    accessToken,
                    user: userInfo
                }));

                // Zustand 스토어도 업데이트
                setUser(userInfo);

                // 메인 페이지로 리다이렉트
                navigate('/dashboard');
            } catch (error) {
                console.error('OAuth2 callback error:', error);
                navigate(`/login?error=${encodeURIComponent('OAuth2 로그인 처리 중 오류가 발생했습니다.')}`);
            }
        };

        handleOAuth2Callback();
    }, [location, navigate, dispatch, setUser]);

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
