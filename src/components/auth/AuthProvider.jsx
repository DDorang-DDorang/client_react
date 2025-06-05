import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { useUserStore } from '../../store/userStore';

/**
 * AuthProvider handles authentication state across the application
 */
const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // Get user state and functions from Zustand
  const { user, fetchUserInfo, clearUser } = useUserStore();

  // Fetch user info if authenticated but no user data
  useEffect(() => {
    const loadUserInfo = async () => {
      // 토큰이 실제로 존재하고, 인증된 상태이며, 사용자 정보가 없을 때만 실행
      const token = localStorage.getItem('token');
      if (isAuthenticated && !user && token && token !== 'undefined' && token !== 'null') {
        try {
          // JWT 토큰인지 확인
          const parts = token.split('.');
          if (parts.length === 3) {
            // JWT 토큰인 경우 (일반 로그인) - API 호출 없이 직접 파싱
            try {
              const payload = JSON.parse(atob(parts[1]));
              const userData = {
                email: payload.sub || payload.email,
                name: payload.name || (payload.sub || payload.email)?.split('@')[0],
                provider: 'LOCAL'
              };
              
              // Set user info directly
              const { setUser } = useUserStore.getState();
              setUser(userData);
              console.log('AuthProvider: JWT 토큰에서 사용자 정보 추출 완료');
            } catch (jwtError) {
              console.error('AuthProvider: JWT 파싱 실패:', jwtError);
            }
          } else {
            // Google OAuth 토큰인 경우에만 API 호출
            await fetchUserInfo();
          }
        } catch (error) {
          console.error('Failed to load user info:', error);
          // 사용자 정보 로딩 실패 시 경고만 출력하고 로그아웃하지 않음
          // OAuth2 로그인의 경우 이미 OAuth2RedirectHandler에서 사용자 정보가 설정되어야 함
          console.warn('User info loading failed. This might be expected for OAuth2 users.');
        }
      }
    };
    
    // 약간의 지연을 두어 OAuth2RedirectHandler가 사용자 정보를 먼저 설정할 수 있도록 함
    const timeoutId = setTimeout(loadUserInfo, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, isAuthenticated, user, navigate, fetchUserInfo, clearUser]);

  // Setup interceptor for 401 errors
  useEffect(() => {
    const handleUnauthorized = async () => {
      // On 401 errors, just logout and redirect to login
      dispatch(logout());
      clearUser();
      navigate('/login', { replace: true });
    };

    // Setup event listener for 401 errors
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [dispatch, navigate, clearUser]);

  return <>{children}</>;
};

export default AuthProvider; 