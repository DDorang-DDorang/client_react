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
            // 캐시 무시하고 최신 데이터 가져오기
            const response = await api.get(`/api/video-analysis/results/${presentationId}`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                params: {
                    _t: Date.now() // 타임스탬프 추가로 캐시 무시
                }
            });
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
    },

    // 비동기 영상 분석 시작
    startAsyncVideoAnalysis: async (presentationId, videoFile) => {
        try {
            const formData = new FormData();
            formData.append('videoFile', videoFile);

            const response = await api.post(`/api/presentations/${presentationId}/video/async`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30초 타임아웃 (분석 시작만)
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('비동기 영상 분석 시작 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '영상 분석을 시작할 수 없습니다.'
            };
        }
    },

    // 분석 진행 상태 조회
    getAnalysisProgress: async (jobId) => {
        try {
            const response = await api.get(`/api/video-analysis/${jobId}/progress`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('분석 진행 상태 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '분석 진행 상태를 확인할 수 없습니다.'
            };
        }
    },

    // 분석 결과 폴링 (자동 재시도)
    pollAnalysisResult: async (jobId, onProgress = null, maxAttempts = 240) => {
        let attempts = 0;
        
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const result = await videoAnalysisService.getAnalysisProgress(jobId);
                    
                    if (!result.success) {
                        reject(new Error(result.error));
                        return;
                    }

                    const { status, progress, message, analysisResult } = result.data;
                    
                    // 진행 상태 콜백 호출
                    if (onProgress) {
                        onProgress({ status, progress, message, analysisResult });
                    }

                    if (status === 'completed') {
                        resolve({
                            success: true,
                            data: analysisResult
                        });
                        return;
                    }

                    if (status === 'failed' || status === 'error') {
                        reject(new Error(message || '분석이 실패했습니다.'));
                        return;
                    }

                    // 10초 후 다시 시도 (주기 증가로 서버 부하 감소)
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error('분석 시간이 초과되었습니다.'));
                        return;
                    }

                    setTimeout(poll, 10000); // 5초 -> 10초로 증가
                } catch (error) {
                    reject(error);
                }
            };

            poll();
        });
    },

    // 청크 업로드 진행률 업데이트 (시뮬레이션)
    updateChunkProgress: (current, total) => {
        // 실제로는 WebSocket이나 Server-Sent Events를 사용하는 것이 좋지만,
        // 현재는 시뮬레이션으로 구현
        return {
            current,
            total,
            percentage: Math.round((current / total) * 100)
        };
    }
};

export default videoAnalysisService; 