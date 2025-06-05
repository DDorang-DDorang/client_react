import api from './axios';
import { API_ROUTES } from './constants';

const presentationService = {
    // TODO: 서버에 프레젠테이션 관련 컨트롤러 구현 후 연동 필요

    // 프레젠테이션 생성
    async createPresentation(presentationData) {
        try {
            const response = await api.post(API_ROUTES.PRESENTATION.CREATE, presentationData);
            return response.data;
        } catch (error) {
            console.error('Presentation creation error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프레젠테이션 생성에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 프레젠테이션 목록 조회
    async getPresentations() {
        try {
            const response = await api.get(API_ROUTES.PRESENTATION.LIST);
            return response.data;
        } catch (error) {
            console.error('Get presentations error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프레젠테이션 목록 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 특정 프레젠테이션 조회
    async getPresentation(presentationId) {
        try {
            const response = await api.get(API_ROUTES.PRESENTATION.GET.replace(':id', presentationId));
            return response.data;
        } catch (error) {
            console.error('Get presentation error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프레젠테이션 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 프레젠테이션 수정
    async updatePresentation(presentationId, presentationData) {
        try {
            const response = await api.put(
                API_ROUTES.PRESENTATION.UPDATE.replace(':id', presentationId), 
                presentationData
            );
            return response.data;
        } catch (error) {
            console.error('Presentation update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프레젠테이션 수정에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 프레젠테이션 삭제
    async deletePresentation(presentationId) {
        try {
            const response = await api.delete(API_ROUTES.PRESENTATION.DELETE.replace(':id', presentationId));
            return response.data;
        } catch (error) {
            console.error('Presentation deletion error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '프레젠테이션 삭제에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 비디오 업로드
    async uploadVideo(presentationId, videoFile) {
        try {
            const formData = new FormData();
            formData.append('video', videoFile);

            const response = await api.post(
                API_ROUTES.PRESENTATION.UPLOAD_VIDEO.replace(':id', presentationId),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Video upload error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '비디오 업로드에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 프레젠테이션 분석 결과 조회
    async getAnalysis(presentationId) {
        try {
            const response = await api.get(API_ROUTES.PRESENTATION.GET_ANALYSIS.replace(':id', presentationId));
            return response.data;
        } catch (error) {
            console.error('Get analysis error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '분석 결과 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },
};

export default presentationService; 