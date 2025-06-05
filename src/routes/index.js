import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AUTH_ROUTES } from '../api/auth';
import Main from '../pages/Main';
import Login from '../pages/Login';
import SignUp from '../pages/SignUp';
import ForgotPassword from '../pages/ForgotPassword';
import OAuth2RedirectHandler from '../pages/OAuth2RedirectHandler';
import Dashboard from '../pages/Dashboard';
import VideoAnalysis from '../pages/VideoAnalysis';
import Settings from '../pages/Settings';
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
      <Route path="/oauth2/callback/google" element={<OAuth2RedirectHandler />} />
      
      {/* 보호된 라우트들 - 페이지 이동 시마다 토큰 유효성 검사 */}
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } 
      />

      <Route 
        path="/video-analysis" 
        element={
          <PrivateRoute skipAuthValidation={true}>
            <VideoAnalysis />
          </PrivateRoute>
        } 
      />

      <Route 
        path="/video-analysis/:presentationId" 
        element={
          <PrivateRoute skipAuthValidation={true}>
            <VideoAnalysis />
          </PrivateRoute>
        } 
      />

      <Route 
        path="/settings" 
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes; 