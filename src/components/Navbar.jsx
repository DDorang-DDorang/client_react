import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import authService from '../api/authService';

const Navbar = ({ isCollapsed, onToggleSidebar, showSidebarToggle = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Redux에서 로그인 상태 가져오기
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // 현재 페이지가 설정 페이지인지 확인
  const isSettingsPage = location.pathname === '/settings';

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // 에러가 발생해도 로그아웃 처리
      dispatch(logout());
      navigate('/');
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div style={{
      width: '100%', 
      height: '70px', 
      left: 0, 
      top: 0, 
      position: 'fixed', 
      background: '#ffffff',
      overflow: 'visible',
      zIndex: 1001,
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px'
    }}>
      {/* Left Section - Logo and Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* Sidebar Toggle Button */}
        {showSidebarToggle && (
          <div 
            style={{
              width: '36px', 
              height: '36px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '10px',
              background: isCollapsed ? '#f8f9fa' : '#e9ecef',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}
            onClick={onToggleSidebar}
            onMouseEnter={(e) => {
              e.target.style.background = '#dee2e6';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = isCollapsed ? '#f8f9fa' : '#e9ecef';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <div style={{
              width: '18px', 
              height: '18px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', 
              transition: 'transform 0.3s ease'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* Logo */}
        <img
          src="/malkong_logo.png"
          alt="또랑또랑"
          style={{
            height: '40px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNavigation(isAuthenticated ? '/dashboard' : '/')}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.opacity = '1';
          }}
        />
      </div>

      {/* Right Section - Navigation Menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {isAuthenticated ? (
          // 로그인된 경우: 네비게이션 메뉴
          <>
            {/* Dashboard */}
            <div 
              style={{
                padding: '10px 16px',
                color: location.pathname === '/dashboard' ? '#1976d2' : '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: location.pathname === '/dashboard' ? '#e3f2fd' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => handleNavigation('/dashboard')}
              onMouseEnter={(e) => {
                if (location.pathname !== '/dashboard') {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#000000';
                }
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/dashboard') {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#6c757d';
                }
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span></span>
              <span>대시보드</span>
            </div>

            {/* Comparison */}
            <div 
              style={{
                padding: '10px 16px',
                color: location.pathname === '/comparison' ? '#1976d2' : '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: location.pathname === '/comparison' ? '#e3f2fd' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => handleNavigation('/comparison')}
              onMouseEnter={(e) => {
                if (location.pathname !== '/comparison') {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#000000';
                }
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/comparison') {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#6c757d';
                }
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span></span>
              <span>발표 비교</span>
            </div>

            {/* Settings */}
            <div 
              style={{
                padding: '10px 16px',
                color: location.pathname === '/settings' ? '#1976d2' : '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: location.pathname === '/settings' ? '#e3f2fd' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => handleNavigation('/settings')}
              onMouseEnter={(e) => {
                if (location.pathname !== '/settings') {
                e.target.style.background = '#f8f9fa';
                e.target.style.color = '#000000';
                }
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/settings') {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6c757d';
                }
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span></span>
              <span>설정</span>
            </div>

            {/* Teams */}
            <div 
              style={{
                padding: '10px 16px',
                color: location.pathname.startsWith('/teams') ? '#1976d2' : '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: location.pathname.startsWith('/teams') ? '#e3f2fd' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => handleNavigation('/teams')}
              onMouseEnter={(e) => {
                if (!location.pathname.startsWith('/teams')) {
                e.target.style.background = '#f8f9fa';
                e.target.style.color = '#000000';
                }
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.startsWith('/teams')) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6c757d';
                }
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span></span>
              <span>팀 관리</span>
            </div>

            {/* Logout */}
            <div 
              style={{
                padding: '10px 16px',
                color: '#ffffff', 
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                background: '#000000',
                transition: 'all 0.3s ease',
                border: 'none',
                marginLeft: '8px'
              }}
              onClick={handleLogout}
              onMouseEnter={(e) => {
                e.target.style.background = '#333333';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0px 4px 16px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#000000';
                e.target.style.transform = 'translateY(0px)';
                e.target.style.boxShadow = 'none';
              }}
            >
              로그아웃
            </div>
          </>
        ) : (
          // 로그인되지 않은 경우: 회원가입, 로그인 버튼
          <>
            <div 
              style={{
                padding: '10px 20px',
                color: '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: 'transparent'
              }}
              onClick={() => handleNavigation('/signup')}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.color = '#000000';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6c757d';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Sign Up
            </div>
            <div 
              style={{
                padding: '10px 20px',
                color: '#6c757d',
                fontSize: '16px', 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: '500', 
                cursor: 'pointer',
                borderRadius: '25px',
                transition: 'all 0.3s ease',
                background: 'transparent'
              }}
              onClick={() => handleNavigation('/login')}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.color = '#000000';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6c757d';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Login
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;