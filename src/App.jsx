import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store';
import { theme } from './styles/theme';
import AppRoutes from './routes';
import AuthProvider from './components/auth/AuthProvider';
import Layout from './components/Layout';
import { loadTopicsFromLocalStorage } from './store/slices/topicSlice';
import authService from './api/authService';
import NotificationManager from './components/NotificationManager';

// 로컬 스토리지에서 토픽을 로드하는 컴포넌트
const AppContent = () => {
  const dispatch = useDispatch();
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    // 앱 시작 시 로컬 스토리지에서 토픽 로드
    dispatch(loadTopicsFromLocalStorage());

    // 토큰 자동 갱신 타이머 설정
    const setupTokenRefresh = async () => {
      try {
        const provider = authService.getTokenProvider();
        
        // provider가 없으면 토큰 갱신 시도하지 않음 (기존 토큰)
        if (!provider) {
          console.log('provider 정보가 없어 토큰 갱신 건너뜀');
          return;
        }
        
        if (provider === 'LOCAL') {
          // 일반 로그인 토큰 갱신
          await authService.refreshToken();
          console.log('LOCAL 토큰 갱신 성공');
        } else if (provider === 'GOOGLE') {
          // Google OAuth는 토큰 갱신 시도하지 않음
          // Google OAuth 토큰은 백엔드에서 자동으로 갱신됨
          console.log('Google OAuth 토큰 - 서버에서 자동 갱신됨');
        }
      } catch (error) {
        console.error('토큰 갱신 실패:', error);
        // 갱신 실패해도 자동 로그아웃하지 않음
      }
    };

    // 5분마다 토큰 갱신 시도
    refreshIntervalRef.current = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && authService.isAuthenticated()) {
        setupTokenRefresh();
      }
    }, 5 * 60 * 1000); // 5분

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [dispatch]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <NotificationManager />
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </Router>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App; 
