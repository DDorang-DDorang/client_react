import api from './axios';

const videoAnalysisService = {
    // 비디오 분석 요청
    analyzeVideo: async (presentationId, videoFile) => {
        try {
            const formData = new FormData();
            formData.append('videoFile', videoFile);

            const response = await api.post(`/api/video-analysis/analyze/${presentationId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 120000, // 2분 타임아웃 (음성 분석은 시간이 오래 걸릴 수 있음)
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('비디오 분석 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '비디오 분석 중 오류가 발생했습니다.'
            };
        }
    },

    // 음성 분석 결과 조회
    getVoiceAnalysis: async (presentationId) => {
        try {
            const response = await api.get(`/api/video-analysis/voice-analysis/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: null
                };
            }
            console.error('음성 분석 결과 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '음성 분석 결과를 불러올 수 없습니다.'
            };
        }
    },

    // STT 결과 조회
    getSttResult: async (presentationId) => {
        try {
            const response = await api.get(`/api/video-analysis/stt-result/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: null
                };
            }
            console.error('STT 결과 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'STT 결과를 불러올 수 없습니다.'
            };
        }
    },

    // 피드백 결과 조회
    getPresentationFeedback: async (presentationId) => {
        try {
            const response = await api.get(`/api/video-analysis/feedback/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: null
                };
            }
            console.error('피드백 결과 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '피드백 결과를 불러올 수 없습니다.'
            };
        }
    },

    // 모든 분석 결과 조회
    getAllAnalysisResults: async (presentationId) => {
        try {
            const response = await api.get(`/api/video-analysis/results/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: null
                };
            }
            console.error('분석 결과 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '분석 결과를 불러올 수 없습니다.'
            };
        }
    },

    // 분석 결과 존재 여부 확인
    hasAnalysisResults: async (presentationId) => {
        try {
            const response = await api.get(`/api/video-analysis/has-results/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('분석 결과 존재 여부 확인 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '분석 결과 존재 여부를 확인할 수 없습니다.'
            };
        }
    }
};

export default videoAnalysisService; 