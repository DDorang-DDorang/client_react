import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuthValidation from '../hooks/useAuthValidation';

const PrivateRoute = ({ children, skipAuthValidation = false }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // skipAuthValidation이 false일 때만 토큰 유효성 검사 훅 사용
  useAuthValidation(skipAuthValidation);

  // 토큰 존재 여부와 인증 상태 모두 확인
  const token = localStorage.getItem('token');
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute; 