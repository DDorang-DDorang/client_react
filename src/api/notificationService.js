import api from './axios';

const notificationService = {
    // 알림 목록 조회
    async getNotifications() {
        try {
            const response = await api.get('/api/notifications', {
                params: { page: 0, size: 100 } // 모든 알림 조회
            });
            // 백엔드가 Page 객체를 반환하므로 content를 추출
            return response.data.content || response.data || [];
        } catch (error) {
            console.error('알림 조회 실패:', error);
            throw error;
        }
    },

    // 알림 읽음 처리
    async markAsRead(notificationId) {
        try {
            await api.patch(`/api/notifications/${notificationId}/read`);
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
            throw error;
        }
    },

    // 모든 알림 읽음 처리
    async markAllAsRead() {
        try {
            await api.patch('/api/notifications/read-all');
        } catch (error) {
            console.error('모든 알림 읽음 처리 실패:', error);
            throw error;
        }
    }
};

export default notificationService;

