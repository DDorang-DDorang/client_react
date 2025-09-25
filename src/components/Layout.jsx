import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import CollapsibleSidebar from './CollapsibleSidebar';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useSelector(state => state.auth);

  // 대시보드 페이지에서는 사이드바를 표시하지 않음 (이미 자체적으로 관리)
  const isDashboardPage = location.pathname === '/dashboard';
  const isVideoAnalysisPage = location.pathname.startsWith('/video-analysis/');
  
  // 로그인하지 않은 상태이거나 특정 페이지에서는 사이드바를 표시하지 않음
  const shouldShowSidebar = isAuthenticated && !isDashboardPage && !isVideoAnalysisPage;

  // 대시보드나 비디오 분석 페이지는 레이아웃을 우회
  if (isDashboardPage || isVideoAnalysisPage) {
    return children;
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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
