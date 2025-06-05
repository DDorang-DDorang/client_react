import { create } from 'zustand';
import authService from '../api/authService';

export const useUserStore = create((set) => ({
    user: null,
    error: null,

    // 사용자 정보 불러오기
    fetchUserInfo: async () => {
        set({ error: null });
        try {
            const userData = await authService.getCurrentUser();
            console.log('getUserData 응답:', userData);
            
            const user = {
                id: userData.userId || userData.id || userData.email, // userId를 우선으로 사용
                userId: userData.userId || userData.id, // 백엔드 호환성을 위해 추가
                name: userData.name,
                email: userData.email,
                provider: userData.provider || 'LOCAL'
            };
            
            console.log('매핑된 사용자 정보:', user);
            set({ user });
            return user;
        } catch (error) {
            console.error('fetchUserInfo 오류:', error);
            set({ error: error.message || '사용자 정보를 불러오는데 실패했습니다.'});
            throw error;
        }
    },

    // 사용자 정보 직접 설정 (로그인 성공 시 사용)
    setUser: (userData) => {
        console.log('setUser 호출됨:', userData);
        
        const user = {
            id: userData.userId || userData.id || userData.email,
            userId: userData.userId || userData.id, // 백엔드 호환성을 위해 추가
            name: userData.name,
            email: userData.email,
            provider: userData.provider || 'LOCAL'
        };
        
        console.log('setUser 결과:', user);
        set({ user, error: null });
    },

    // 사용자 정보 초기화 (로그아웃 시 사용)
    clearUser: () => set({ user: null, error: null })
}));