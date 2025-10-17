import api from './axios';
import { API_ROUTES } from './constants';

const comparisonService = {
    /**
     * 두 발표를 비교
     * @param {string} presentationId - 첫 번째 발표 ID
     * @param {string} otherPresentationId - 두 번째 발표 ID
     * @returns {Promise<Object>} 비교 결과
     */
    async comparePresentations(presentationId, otherPresentationId) {
        try {
            const response = await api.post(
                API_ROUTES.COMPARISON.COMPARE
                    .replace(':presentationId', presentationId)
                    .replace(':otherPresentationId', otherPresentationId)
            );
            return response.data;
        } catch (error) {
            console.error('Compare presentations error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '발표 비교에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 사용자의 모든 비교 기록 조회
     * @returns {Promise<Array>} 비교 기록 목록
     */
    async getUserComparisons() {
        try {
            const response = await api.get(API_ROUTES.COMPARISON.GET_USER_COMPARISONS);
            return response.data;
        } catch (error) {
            console.error('Get user comparisons error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '비교 기록 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    /**
     * 특정 발표와 관련된 모든 비교 기록 조회
     * @param {string} presentationId - 발표 ID
     * @returns {Promise<Array>} 비교 기록 목록
     */
    async getComparisonsInvolving(presentationId) {
        try {
            const response = await api.get(
                API_ROUTES.COMPARISON.GET_PRESENTATION_COMPARISONS.replace(':presentationId', presentationId)
            );
            return response.data;
        } catch (error) {
            console.error('Get comparisons involving error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '발표 관련 비교 기록 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },
};

export default comparisonService;
