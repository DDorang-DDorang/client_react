import api from './axios';
import { API_ROUTES } from './constants';

const settingsService = {
    /**
     * 프로필 이미지 수정
     * @param {string} profileImage - 이미지 URL
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateProfileImage(profileImage) {
        try {
            const response = await api.patch(API_ROUTES.SETTINGS.PROFILE_IMAGE, {
                profileImage
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Profile image update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프로필 이미지 업데이트에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 이름 수정 (LOCAL 사용자만)
     * @param {string} name - 새로운 이름
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateName(name) {
        try {
            const response = await api.patch(API_ROUTES.SETTINGS.NAME, {
                name
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Name update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '이름 변경에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 비밀번호 변경 (LOCAL 사용자만)
     * @param {string} currentPassword - 현재 비밀번호
     * @param {string} newPassword - 새 비밀번호
     * @returns {Promise<Object>} 변경 결과
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await api.patch(API_ROUTES.SETTINGS.PASSWORD, {
                currentPassword,
                newPassword
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Password change error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '비밀번호 변경에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 계정 삭제
     * @param {string} password - 비밀번호 (LOCAL 사용자만)
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteAccount(password = null) {
        try {
            const requestData = password ? { password } : {};
            const response = await api.delete(API_ROUTES.SETTINGS.ACCOUNT, {
                data: requestData
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Account deletion error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '계정 삭제에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 알림 설정 변경
     * @param {boolean} enabled - 알림 활성화 여부
     * @returns {Promise<Object>} 설정 결과
     */
    async updateNotificationSettings(enabled) {
        try {
            const response = await api.patch(API_ROUTES.SETTINGS.NOTIFICATION, {
                enabled
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Notification settings update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '알림 설정 변경에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 현재 사용자 정보 조회
     * @returns {Promise<Object>} 사용자 정보
     */
    async getCurrentUser() {
        try {
            const response = await api.get('/api/auth/me');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Get current user error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '사용자 정보를 불러올 수 없습니다.';
            throw new Error(errorMessage);
        }
    }
};

export default settingsService;
