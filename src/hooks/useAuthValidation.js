import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import authService from '../api/authService';

const useAuthValidation = (skipRouteValidation = false) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated } = useSelector(state => state.auth);
  const user = useSelector(state => state.auth.user);
  const isValidatingRef = useRef(false);
  const lastValidationRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const logoutInProgressRef = useRef(false);

  // 토큰 관리 상태 추가
  const [currentToken, setCurrentToken] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  // 로그아웃 처리 함수
  const performLogout = useCallback(() => {
    if (logoutInProgressRef.current) return;
    
    logoutInProgressRef.current = true;
    console.log('useAuthValidation: performLogout 호출, auth:unauthorized 이벤트 발생');
    
    dispatch(logout());
    localStorage.removeItem('token');
    
    // auth:unauthorized 이벤트 발생 (AuthProvider에서 처리)
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    console.log('useAuthValidation: auth:unauthorized 이벤트 발생 완료');
    
    // 잠시 후 플래그 리셋 (다른 컴포넌트에서 로그아웃이 필요할 수 있음)
    setTimeout(() => {
      logoutInProgressRef.current = false;
    }, 1000);
  }, [dispatch]);

  // 현재 토큰 로드 함수 (Dashboard에서 가져옴)
  const loadCurrentToken = useCallback(async () => {
    const token = authService.getToken();
    if (token) {
      setCurrentToken(token);
      
      // 토큰 유형 확인
      const parts = token.split('.');
      
      if (parts.length === 3) {
        // JWT 토큰인 경우
        try {
          const payload = JSON.parse(atob(parts[1]));
          const exp = payload.exp;
          const currentTime = Math.floor(Date.now() / 1000);
          const timeLeft = exp - currentTime;
          
          if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            console.log(`JWT 토큰 만료까지: ${minutes}분 ${seconds}초`);
            setRefreshMessage(`JWT 토큰 만료까지: ${minutes}분 ${seconds}초`);
          } else {
            console.log('JWT 토큰이 만료되었습니다');
            setRefreshMessage('JWT 토큰이 만료되었습니다');
          }
        } catch (e) {
          console.error('JWT 토큰 분석 실패:', e);
          setRefreshMessage('JWT 토큰 형식 오류');
        }
      } else {
        // Google OAuth 토큰인 경우
        console.log('Google OAuth 토큰 감지됨');
        setRefreshMessage('Google OAuth 토큰 (만료 시간은 Google API로 확인 필요)');
        
        // Google API로 토큰 정보 확인
        try {
          const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
          if (response.ok) {
            const tokenInfo = await response.json();
            const exp = parseInt(tokenInfo.exp);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeLeft = exp - currentTime;
            
            if (timeLeft > 0) {
              const minutes = Math.floor(timeLeft / 60);
              const seconds = timeLeft % 60;
              setRefreshMessage(`Google OAuth 토큰 만료까지: ${minutes}분 ${seconds}초`);
            } else {
              setRefreshMessage('Google OAuth 토큰이 만료되었습니다');
            }
          } else {
            setRefreshMessage('Google OAuth 토큰 검증 실패');
          }
        } catch (e) {
          console.error('Google OAuth 토큰 정보 확인 실패:', e);
          setRefreshMessage('Google OAuth 토큰 (네트워크 오류로 정보 확인 불가)');
        }
      }
    } else {
      setCurrentToken('토큰이 없습니다');
      setRefreshMessage('로그인이 필요합니다');
    }
  }, []);

  // 토큰 재발급 함수 (Dashboard에서 가져옴)
  const refreshAccessToken = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshMessage('');
    
    try {
      console.log('토큰 재발급 시도 중...');
      
      // 현재 토큰에서 이메일 추출
      const currentTokenValue = authService.getToken();
      if (!currentTokenValue) {
        setRefreshMessage('현재 토큰이 없습니다. 다시 로그인해주세요.');
        setIsRefreshing(false);
        return;
      }

      // 토큰 유형 확인
      const parts = currentTokenValue.split('.');
      
      if (parts.length === 3) {
        // JWT 토큰인 경우 - authService.refreshToken() 사용
        console.log('JWT 토큰 재발급 시도 중...');
        
        try {
          const result = await authService.refreshToken();
          if (result.success) {
            setCurrentToken(result.accessToken);
            setRefreshMessage('JWT 토큰이 성공적으로 재발급되었습니다.');
            console.log('JWT 토큰 재발급 성공');
          } else {
            setRefreshMessage('JWT 토큰 재발급에 실패했습니다.');
          }
        } catch (refreshError) {
          console.error('JWT 토큰 재발급 실패:', refreshError);
          if (refreshError.message.includes('expired')) {
            setRefreshMessage('리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.');
          } else {
            setRefreshMessage('JWT 토큰 재발급에 실패했습니다.');
          }
        }
      } else {
        // Google OAuth 토큰인 경우 - 이메일로 재발급 시도
        console.log('Google OAuth 토큰 재발급 시도 중...');
        
        // 사용자 정보에서 이메일 가져오기
        let email = null;
        if (user && user.email) {
          email = user.email;
          console.log('사용자 스토어에서 이메일 가져옴:', email);
        } else {
          // 사용자 정보가 없으면 현재 토큰으로 Google API에서 가져오기
          try {
            console.log('Google API에서 사용자 정보 조회 중...');
            const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${currentTokenValue}`);
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              email = userInfo.email;
              console.log('Google API에서 이메일 가져옴:', email);
            } else {
              console.log('Google API 사용자 정보 조회 실패:', userInfoResponse.status);
            }
          } catch (e) {
            console.error('사용자 정보 조회 실패:', e);
          }
        }

        if (!email) {
          setRefreshMessage('이메일 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
          setIsRefreshing(false);
          return;
        }

        try {
          const result = await authService.refreshGoogleToken(email);
          if (result.success) {
            setCurrentToken(result.accessToken);
            setRefreshMessage('Google OAuth 토큰이 성공적으로 재발급되었습니다.');
            console.log('Google OAuth 토큰 재발급 성공');
          } else {
            setRefreshMessage('서버에서 새 Google OAuth 토큰을 받지 못했습니다.');
          }
        } catch (refreshError) {
          console.error('Google OAuth 토큰 재발급 실패:', refreshError);
          setRefreshMessage(refreshError.message || 'Google OAuth 토큰 재발급에 실패했습니다.');
        }
      }

    } catch (error) {
      console.error('Token refresh error:', error);
      setRefreshMessage(`토큰 재발급 실패: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  // 클립보드 복사 함수 (Dashboard에서 가져옴)
  const copyTokenToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentToken);
      setRefreshMessage('토큰이 클립보드에 복사되었습니다.');
      setTimeout(() => setRefreshMessage(''), 3000);
    } catch (error) {
      setRefreshMessage('클립보드 복사에 실패했습니다.');
    }
  }, [currentToken]);

  // 토큰 유효성 검사 및 자동 갱신 함수
  const validateToken = useCallback(async () => {
    // 이미 로그아웃 중이거나 검증 중이면 중단
    if (logoutInProgressRef.current || isValidatingRef.current) {
      return false;
    }

    const token = localStorage.getItem('token');
    
    if (!token || token === 'undefined' || token === 'null') {
      if (isAuthenticated) {
        performLogout();
      }
      return false;
    }

    // 중복 검증 방지 (토큰 유형에 따라 시간 조정)
    const now = Date.now();
    const parts = token.split('.');
    const isJWT = parts.length === 3;
    const preventDuplicateTime = isJWT ? 5000 : 30000; // JWT: 5초, OAuth: 30초
    
    if ((now - lastValidationRef.current) < preventDuplicateTime) {
      return true; // 최근에 검증했으면 true 반환
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      // 토큰 유형 확인 (이미 parts 변수를 위에서 선언했으므로 재사용)
      if (parts.length === 3) {
        // JWT 토큰인 경우
        try {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          // 토큰이 만료되었는지 확인
          if (!payload.exp || payload.exp <= currentTime) {
            console.log('JWT access token expired, attempting refresh...');
            
            // 리프레시 토큰으로 새 액세스 토큰 요청
            if (isRefreshingRef.current) {
              return false;
            }
            
            isRefreshingRef.current = true;
            
            try {
              const refreshResult = await authService.refreshToken();
              
              if (refreshResult.success) {
                console.log('JWT token refreshed successfully');
                setCurrentToken(refreshResult.accessToken);
                isRefreshingRef.current = false;
                return true;
              } else {
                throw new Error('JWT token refresh failed');
              }
            } catch (refreshError) {
              console.error('JWT token refresh failed:', refreshError);
              isRefreshingRef.current = false;
              
              console.log('JWT token refresh failed, logging out...');
              performLogout();
              return false;
            }
          }
          
          // JWT 토큰이 아직 유효함
          return true;
        } catch (jwtError) {
          console.error('JWT parsing failed:', jwtError);
          throw new Error('Invalid JWT format');
        }
      } else {
        // Google OAuth 토큰인 경우
        console.log('Detected Google OAuth token, validating with Google API...');
        
        // 토큰이 유효한지 먼저 확인
        if (!token || token === 'undefined' || token === 'null') {
          console.log('Invalid token detected, logging out...');
          performLogout();
          return false;
        }
        
        try {
          // Google API로 토큰 유효성 확인
          const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
          
          if (response.ok) {
            const tokenInfo = await response.json();
            console.log('Google OAuth 토큰 정보:', tokenInfo);
            
            // 토큰 만료 시간 확인
            const currentTime = Math.floor(Date.now() / 1000);
            if (tokenInfo.exp && parseInt(tokenInfo.exp) <= currentTime) {
              console.log('Google OAuth token expired, attempting refresh...');
              
              // 리프레시 토큰으로 새 액세스 토큰 요청
              if (isRefreshingRef.current) {
                return false;
              }
              
              isRefreshingRef.current = true;
              
              try {
                // 사용자 정보에서 이메일 가져오기
                let email = null;
                if (user && user.email) {
                  email = user.email;
                  console.log('사용자 스토어에서 이메일 가져옴:', email);
                } else {
                  // 사용자 정보가 없으면 현재 토큰으로 Google API에서 가져오기
                  try {
                    console.log('Google API에서 사용자 정보 조회 중...');
                    
                    // 토큰이 유효한지 확인
                    if (!token || token === 'undefined' || token === 'null') {
                      console.log('Invalid token for user info fetch');
                      throw new Error('Invalid token');
                    }
                    
                    const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
                    if (userInfoResponse.ok) {
                      const userInfo = await userInfoResponse.json();
                      email = userInfo.email;
                      console.log('Google API에서 이메일 가져옴:', email);
                    } else {
                      console.log('Google API 사용자 정보 조회 실패:', userInfoResponse.status);
                    }
                  } catch (e) {
                    console.error('사용자 정보 조회 실패:', e);
                  }
                }

                if (!email) {
                  console.log('이메일 정보를 찾을 수 없어 로그아웃 처리');
                  isRefreshingRef.current = false;
                  performLogout();
                  return false;
                }

                const result = await authService.refreshGoogleToken(email);
                if (result.success) {
                  console.log('Google OAuth 토큰 재발급 성공');
                  setCurrentToken(result.accessToken);
                  isRefreshingRef.current = false;
                  return true;
                } else {
                  throw new Error('Token refresh returned no access token');
                }
              } catch (refreshError) {
                console.error('Google OAuth token refresh failed:', refreshError);
                isRefreshingRef.current = false;
                
                console.log('Google OAuth token refresh failed, logging out...');
                performLogout();
                return false;
              }
            }
            
            console.log('Google OAuth token is valid');
            return true;
          } else {
            console.log('Google OAuth token validation failed, attempting refresh...');
            
            // 토큰이 유효하지 않으면 재발급 시도
            if (isRefreshingRef.current) {
              return false;
            }
            
            isRefreshingRef.current = true;
            
            try {
              // Dashboard와 동일한 재발급 로직
              let email = null;
              if (user && user.email) {
                email = user.email;
                console.log('사용자 스토어에서 이메일 가져옴:', email);
              } else {
                console.log('사용자 정보 없어서 현재 토큰으로 시도할 수 없음');
                throw new Error('No user email available for refresh');
              }

              const result = await authService.refreshGoogleToken(email);
              if (result.success) {
                console.log('Google OAuth 토큰 재발급 성공 (유효성 검사 실패 후)');
                setCurrentToken(result.accessToken);
                isRefreshingRef.current = false;
                return true;
              } else {
                throw new Error('Token refresh returned no access token');
              }
            } catch (refreshError) {
              console.error('Google OAuth token refresh failed:', refreshError);
              isRefreshingRef.current = false;
              performLogout();
              return false;
            }
          }
        } catch (googleError) {
          console.error('Google token validation failed:', googleError);
          // 네트워크 에러 등의 경우 토큰이 유효하다고 가정
          console.log('Google token validation failed due to network, assuming valid');
          return true;
        }
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      
      // 토큰이 유효하지 않음
      console.log('Token invalid, logging out...');
      performLogout();
      return false;
    } finally {
      isValidatingRef.current = false;
    }
  }, [dispatch, isAuthenticated, performLogout, user]);

  // 서버에서 토큰 검증이 필요한 경우를 위한 함수 (선택적 사용)
  const validateTokenWithServer = useCallback(async () => {
    if (logoutInProgressRef.current) return false;
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      return false;
    }

    try {
      const response = await authService.validateGoogleToken();
      return response && response.valid !== false;
    } catch (error) {
      console.error('Server token validation failed:', error);
      
      // 401 또는 403 에러 시 토큰이 만료되었거나 유효하지 않음
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Server says token is invalid, attempting refresh...');
        
        try {
          const refreshResult = await authService.refreshToken();
          if (refreshResult.success) {
            console.log('Token refreshed successfully after server validation failure');
            setCurrentToken(refreshResult.accessToken);
            return true;
          }
        } catch (refreshError) {
          console.log('Token refresh failed after server validation failure:', refreshError);
          
          // 토큰 갱신 실패 시 로그아웃
          if (refreshError.message === 'Refresh token expired' || 
              refreshError.response?.status === 401 || 
              refreshError.response?.status === 403) {
            console.log('Refresh token expired, logging out...');
            performLogout();
            return false;
          }
          
          // 네트워크 오류 등 다른 오류는 재시도하지 않음
          console.error('Token refresh error:', refreshError);
          return false;
        }
      }
      return false;
    }
  }, [performLogout]);

  // 보호된 라우트 목록
  const protectedRoutes = ['/dashboard', '/video', '/video-analysis', '/settings', '/transcript-editor'];
  
  // 현재 경로가 보호된 라우트인지 확인
  const isProtectedRoute = useCallback(() => {
    return protectedRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  // 페이지 이동 시 토큰 검증 (skipRouteValidation이 false일 때만)
  useEffect(() => {
    if (skipRouteValidation) return;

    const checkAuth = async () => {
      // 보호된 라우트에서만 토큰 검증 실행하고, 토큰이 실제로 존재할 때만
      const token = localStorage.getItem('token');
      if (isProtectedRoute() && isAuthenticated && token) {
        await validateToken();
      }
    };

    checkAuth();
  }, [location.pathname, isAuthenticated, isProtectedRoute, validateToken, skipRouteValidation]);

  // 주기적 토큰 검증 (Google OAuth는 10분마다, JWT는 5분마다) - skipRouteValidation이 false일 때만
  useEffect(() => {
    if (skipRouteValidation || !isAuthenticated || logoutInProgressRef.current) return;

    // 토큰이 실제로 존재할 때만 주기적 검증 실행
    const token = localStorage.getItem('token');
    if (!token) return;

    // 토큰 유형에 따라 검증 간격 조정
    const parts = token.split('.');
    const isJWT = parts.length === 3;
    const intervalTime = isJWT ? 5 * 60 * 1000 : 10 * 60 * 1000; // JWT: 5분, OAuth: 10분

    const interval = setInterval(async () => {
      // 로그아웃 중이거나 검증 중이면 스킵
      if (logoutInProgressRef.current || isValidatingRef.current) return;
      
      const currentToken = localStorage.getItem('token');
      if (currentToken && isAuthenticated) {
        await validateToken();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateToken, skipRouteValidation]);

  return {
    validateToken,
    validateTokenWithServer,
    isProtectedRoute,
    // 토큰 관리 기능들 추가
    currentToken,
    isRefreshing,
    refreshMessage,
    loadCurrentToken,
    refreshAccessToken,
    copyTokenToClipboard,
    setRefreshMessage
  };
};

export default useAuthValidation; 