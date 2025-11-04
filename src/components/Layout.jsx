import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import CollapsibleSidebar from './CollapsibleSidebar';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const location = useLocation();
  const { isAuthenticated } = useSelector(state => state.auth);

  // 대시보드 페이지에서는 사이드바를 표시하지 않음 (이미 자체적으로 관리)
  const isDashboardPage = location.pathname === '/dashboard';
  const isVideoAnalysisPage = location.pathname.startsWith('/video-analysis/');
  const isComparisonPage = location.pathname === '/comparison';
  
  // 로그인하지 않은 상태이거나 특정 페이지에서는 사이드바를 표시하지 않음
  const shouldShowSidebar = isAuthenticated && !isDashboardPage && !isVideoAnalysisPage && !isComparisonPage;

  // 페이지 이동 시 localStorage에서 사이드바 상태 동기화
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(JSON.parse(saved));
    }
  }, [location.pathname]);

  // 대시보드, 비디오 분석, 비교 페이지는 레이아웃을 우회
  if (isDashboardPage || isVideoAnalysisPage || isComparisonPage) {
    return children;
  }

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // 사이드바 상태에 따른 메인 콘텐츠 여백 계산
  const getMainContentMargin = () => {
    if (!shouldShowSidebar) return 0;
    return isSidebarCollapsed ? 0 : 427; // 사이드바가 접혀있으면 0, 펼쳐져 있으면 427px
  };

  return (
    <div style={{
      width: '100%', 
      minHeight: '100vh', 
      position: 'relative', 
      background: 'white', 
      overflowY: 'auto'
    }}>
      {/* Navbar - 모든 페이지에 표시 */}
      <Navbar 
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        showSidebarToggle={shouldShowSidebar}
      />

      {/* Collapsible Sidebar - 특정 페이지에만 표시 */}
      {shouldShowSidebar && (
        <CollapsibleSidebar 
          isCollapsed={isSidebarCollapsed}
          refreshKey={0}
        />
      )}

      {/* Main Content */}
      <div style={{
        marginLeft: getMainContentMargin(),
        marginTop: 70, // Navbar 높이만큼 여백
        transition: 'margin-left 0.3s ease-in-out',
        minHeight: 'calc(100vh - 70px)',
        padding: '20px'
      }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
