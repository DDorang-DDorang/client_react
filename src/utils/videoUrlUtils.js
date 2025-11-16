/**
 * 비디오 URL 유틸리티 함수
 * Spring Boot API를 통해 파일 서버로 리다이렉트되는 구조를 지원
 */

/**
 * 상대 경로를 완전한 API URL로 변환
 * @param {string} url - 상대 경로 또는 완전한 URL
 * @returns {string} 완전한 URL
 */
export const getVideoUrl = (url) => {
    if (!url) return '';
    
    // 이미 완전한 URL인 경우 그대로 반환
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // 프로덕션 환경에서 외부 파일 서버 URL 직접 사용 (리디렉션 문제 방지)
    const isProduction = !window.location.origin.includes('localhost') && 
                         !window.location.origin.includes('127.0.0.1');
    
    if (isProduction && url.startsWith('/api/files/videos/')) {
        // 외부 파일 서버 URL 직접 사용
        const externalStorageUrl = 'https://malkongserver.shop';
        const videoPath = url.replace('/api/files/videos/', '');
        return `${externalStorageUrl}/api/files/videos/${videoPath}`;
    }
    
    // 상대 경로인 경우, Spring Boot API URL 사용
    // Spring Boot가 use-external-storage=true일 때 자동으로 파일 서버로 리다이렉트
    const apiUrl = getApiBaseUrl();
    return `${apiUrl}${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * 현재 환경에 맞는 API 기본 URL 반환
 * @returns {string} API 기본 URL
 */
export const getApiBaseUrl = () => {
    // 환경 변수에서 API URL 가져오기 (우선순위 1)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // 개발 환경
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
        return 'http://localhost:8080';
    }
    
    // 프로덕션 환경: Nginx를 통해 프록시되므로 현재 도메인 사용 (포트 없음)
    return window.location.origin;
};

