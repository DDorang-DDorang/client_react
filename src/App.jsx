import React, { useEffect } from 'react';
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

// 로컬 스토리지에서 토픽을 로드하는 컴포넌트
const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // 앱 시작 시 로컬 스토리지에서 토픽 로드
    dispatch(loadTopicsFromLocalStorage());
  }, [dispatch]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
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
