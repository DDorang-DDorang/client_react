import api from './axios';
import store from '../store';

// 로컬 스토리지 키
const TOPICS_STORAGE_KEY = 'ddorang_topics';
const PRESENTATIONS_STORAGE_KEY = 'ddorang_presentations';

// 로컬 스토리지 유틸리티 함수들
const getLocalTopics = () => {
    try {
        const topics = localStorage.getItem(TOPICS_STORAGE_KEY);
        return topics ? JSON.parse(topics) : [];
    } catch (error) {
        console.error('로컬 토픽 데이터 로드 실패:', error);
        return [];
    }
};

const saveLocalTopics = (topics) => {
    try {
        localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    } catch (error) {
        console.error('로컬 토픽 데이터 저장 실패:', error);
    }
};

const getLocalPresentations = () => {
    try {
        const presentations = localStorage.getItem(PRESENTATIONS_STORAGE_KEY);
        return presentations ? JSON.parse(presentations) : [];
    } catch (error) {
        console.error('로컬 프레젠테이션 데이터 로드 실패:', error);
        return [];
    }
};

const saveLocalPresentations = (presentations) => {
    try {
        localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(presentations));
    } catch (error) {
        console.error('로컬 프레젠테이션 데이터 저장 실패:', error);
    }
};

const generateId = () => {
    return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 사용자 provider 확인 함수
const getUserProvider = () => {
    try {
        const user = store.getState().auth.user;
        return user?.provider || 'LOCAL';
    } catch (error) {
        return 'LOCAL';
    }
};

// JWT 토큰 확인 함수
const hasValidJWTToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp > currentTime;
        }
    } catch (error) {
        console.error('JWT 토큰 검증 실패:', error);
    }
    return false;
};

const topicService = {
    // 토픽 관련 API
    
    // 사용자의 모든 토픽 조회
    getTopics: async (userId) => {
        try {
            const userProvider = getUserProvider();
            
            // LOCAL 사용자인데 JWT 토큰이 없으면 로그인 요구
            if (userProvider === 'LOCAL' && !hasValidJWTToken()) {
                return {
                    success: false,
                    error: '로그인이 필요합니다. 다시 로그인해주세요.',
                    needLogin: true
                };
            }
            
            const response = await api.get(`/api/topics?userId=${userId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('토픽 목록 조회 실패:', error);
            
            const userProvider = getUserProvider();
            
            // LOCAL 사용자의 경우
            if (userProvider === 'LOCAL') {
                if (error.response?.status === 401) {
                    return {
                        success: false,
                        error: '인증이 만료되었습니다. 다시 로그인해주세요.',
                        needLogin: true
                    };
                }
            }
            
            // 서버 연결 실패 시 로컬 스토리지 사용 (GOOGLE 사용자도 포함)
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬 데이터 사용');
                const localTopics = getLocalTopics().filter(topic => topic.userId === userId);
                return {
                    success: true,
                    data: localTopics,
                    isLocal: true
                };
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '토픽 목록을 불러올 수 없습니다.'
            };
        }
    },

    // 특정 토픽 조회
    getTopic: async (topicId) => {
        try {
            const response = await api.get(`/api/topics/${topicId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('토픽 조회 실패:', error);
            
            // 로컬 데이터에서 찾기
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                const localTopics = getLocalTopics();
                const topic = localTopics.find(t => t.id === topicId);
                if (topic) {
                    return {
                        success: true,
                        data: topic,
                        isLocal: true
                    };
                }
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '토픽을 불러올 수 없습니다.'
            };
        }
    },

    // 새 토픽 생성
    createTopic: async (title, userId, isTeamTopic = false, teamId = null) => {
        try {
            const userProvider = getUserProvider();
            
            // LOCAL 사용자인데 JWT 토큰이 없으면 로그인 요구
            if (userProvider === 'LOCAL' && !hasValidJWTToken()) {
                return {
                    success: false,
                    error: '로그인이 필요합니다. 다시 로그인해주세요.',
                    needLogin: true
                };
            }
            
            const requestData = {
                title,
                userId
            };
            
            // 팀 토픽인 경우 추가 정보 포함
            if (isTeamTopic && teamId) {
                requestData.isTeamTopic = true;
                requestData.teamId = teamId;
            }
            
            const response = await api.post('/api/topics', requestData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('토픽 생성 실패:', error);
            
            const userProvider = getUserProvider();
            
            // LOCAL 사용자의 경우
            if (userProvider === 'LOCAL') {
                if (error.response?.status === 401) {
                    return {
                        success: false,
                        error: '인증이 만료되었습니다. 다시 로그인해주세요.',
                        needLogin: true
                    };
                }
            }
            
            // 서버 연결 실패 시 로컬 생성
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬에 토픽 생성');
                
                const newTopic = {
                    id: generateId(),
                    title: title,
                    userId: userId,
                    isTeamTopic: isTeamTopic || false,
                    teamId: teamId || null,
                    presentationCount: 0,
                    createdAt: new Date().toISOString(),
                    isLocal: true
                };
                
                const localTopics = getLocalTopics();
                localTopics.push(newTopic);
                saveLocalTopics(localTopics);
                
                return {
                    success: true,
                    data: newTopic,
                    isLocal: true
                };
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '토픽을 생성할 수 없습니다.'
            };
        }
    },

    // 토픽 수정
    updateTopic: async (topicId, title) => {
        try {
            const response = await api.put(`/api/topics/${topicId}`, {
                title
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('토픽 수정 실패:', error);
            
            // 서버 연결 실패 시 로컬 데이터 업데이트
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬에서 토픽 수정');
                
                const localTopics = getLocalTopics();
                const updatedTopics = localTopics.map(topic => 
                    topic.id === topicId ? { ...topic, title } : topic
                );
                saveLocalTopics(updatedTopics);
                
                const updatedTopic = updatedTopics.find(t => t.id === topicId);
                if (updatedTopic) {
                    return {
                        success: true,
                        data: updatedTopic,
                        isLocal: true
                    };
                }
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '토픽을 수정할 수 없습니다.'
            };
        }
    },

    // 토픽 삭제
    deleteTopic: async (topicId) => {
        try {
            await api.delete(`/api/topics/${topicId}`);
            return {
                success: true
            };
        } catch (error) {
            console.error('토픽 삭제 실패:', error);
            
            // 서버 연결 실패 시 로컬 데이터에서 삭제
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬에서 토픽 삭제');
                
                const localTopics = getLocalTopics();
                const filteredTopics = localTopics.filter(topic => topic.id !== topicId);
                saveLocalTopics(filteredTopics);
                
                // 관련 프레젠테이션도 삭제
                const localPresentations = getLocalPresentations();
                const filteredPresentations = localPresentations.filter(p => p.topicId !== topicId);
                saveLocalPresentations(filteredPresentations);
                
                return {
                    success: true,
                    isLocal: true
                };
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '토픽을 삭제할 수 없습니다.'
            };
        }
    },

    // 프레젠테이션 관련 API
    
    // 특정 토픽의 프레젠테이션 목록 조회
    getPresentations: async (topicId) => {
        try {
            const response = await api.get(`/api/topics/${topicId}/presentations`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('프레젠테이션 목록 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션 목록을 불러올 수 없습니다.'
            };
        }
    },

    // 특정 프레젠테이션 조회
    getPresentation: async (presentationId) => {
        try {
            const response = await api.get(`/api/presentations/${presentationId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('프레젠테이션 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션을 불러올 수 없습니다.'
            };
        }
    },

    // 새 프레젠테이션 생성 (비디오 파일과 함께)
    createPresentation: async (topicId, presentationData, videoFile) => {
        try {
            const formData = new FormData();
            
            // 프레젠테이션 메타데이터 추가
            const metadata = {
                title: presentationData.title || '새 프레젠테이션',
                script: presentationData.script || '',
                goalTime: presentationData.goalTime || '',
                type: presentationData.type || 'recording',
                originalFileName: videoFile ? videoFile.name : '',
                duration: presentationData.duration || 0
            };
            
            formData.append('presentationData', JSON.stringify(metadata));
            
            // 비디오 파일 추가
            if (videoFile) {
                formData.append('videoFile', videoFile);
            }

            const response = await api.post(`/api/topics/${topicId}/presentations`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('프레젠테이션 생성 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션을 생성할 수 없습니다.'
            };
        }
    },

    // 프레젠테이션 수정
    updatePresentation: async (presentationId, presentationData) => {
        try {
            const requestData = {
                title: presentationData.title,
                script: presentationData.script,
                goalTime: presentationData.goalTime
            };

            const response = await api.put(`/api/presentations/${presentationId}`, requestData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('프레젠테이션 수정 실패:', error);
            
            // 서버 연결 실패 시 로컬 데이터 업데이트
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬에서 프레젠테이션 수정');
                
                const localPresentations = getLocalPresentations();
                const updatedPresentations = localPresentations.map(presentation => 
                    presentation.id === presentationId 
                        ? { ...presentation, ...presentationData }
                        : presentation
                );
                saveLocalPresentations(updatedPresentations);
                
                const updatedPresentation = updatedPresentations.find(p => p.id === presentationId);
                if (updatedPresentation) {
                    return {
                        success: true,
                        data: updatedPresentation,
                        isLocal: true
                    };
                }
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션을 수정할 수 없습니다.'
            };
        }
    },

    // 프레젠테이션 삭제
    deletePresentation: async (presentationId) => {
        try {
            await api.delete(`/api/presentations/${presentationId}`);
            return {
                success: true
            };
        } catch (error) {
            console.error('프레젠테이션 삭제 실패:', error);
            
            // 서버 연결 실패 시 로컬 데이터에서 삭제
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                console.log('서버 연결 실패, 로컬에서 프레젠테이션 삭제');
                
                const localPresentations = getLocalPresentations();
                const filteredPresentations = localPresentations.filter(p => p.id !== presentationId);
                saveLocalPresentations(filteredPresentations);
                
                return {
                    success: true,
                    isLocal: true
                };
            }
            
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션을 삭제할 수 없습니다.'
            };
        }
    },

    // 비디오 업로드 (Blob 데이터용)
    uploadVideoBlob: async (presentationId, videoBlob, fileName) => {
        try {
            const formData = new FormData();
            formData.append('videoFile', videoBlob, fileName);

            const response = await api.post(`/api/presentations/${presentationId}/video`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('비디오 업로드 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '비디오를 업로드할 수 없습니다.'
            };
        }
    },

    // 프레젠테이션 검색
    searchPresentations: async (topicId, keyword) => {
        try {
            const response = await api.get(`/api/topics/${topicId}/presentations/search?keyword=${encodeURIComponent(keyword)}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('프레젠테이션 검색 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '검색에 실패했습니다.'
            };
        }
    },

    // 사용자의 모든 프레젠테이션 조회
    getUserPresentations: async (userId) => {
        try {
            const response = await api.get(`/api/users/${userId}/presentations`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('사용자 프레젠테이션 조회 실패:', error);
            return {
                success: false,
                error: error.response?.data?.message || '프레젠테이션을 불러올 수 없습니다.'
            };
        }
    }
};

export default topicService; 