import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTopicStore = create(
    persist(
        (set, get) => ({
            // 토픽 관련 상태
            topics: [],
            currentTopic: null,
            
            // 프레젠테이션 관련 상태
            presentations: [],
            currentPresentation: null,
            
            // 로딩 상태
            isLoading: false,
            error: null,

            // 토픽 액션들
            setTopics: (topics) => set({ topics }),
            
            setCurrentTopic: (topic) => set({ currentTopic: topic }),

            addTopic: (topic) => set((state) => ({
                topics: [...state.topics, topic]
            })),

            updateTopic: (topicId, updates) => set((state) => ({
                topics: state.topics.map(topic => 
                    topic.id === topicId ? { ...topic, ...updates } : topic
                ),
                currentTopic: state.currentTopic?.id === topicId 
                    ? { ...state.currentTopic, ...updates } 
                    : state.currentTopic
            })),

            deleteTopic: (topicId) => set((state) => ({
                topics: state.topics.filter(topic => topic.id !== topicId),
                currentTopic: state.currentTopic?.id === topicId ? null : state.currentTopic,
                // 토픽 삭제 시 해당 토픽의 프레젠테이션들도 제거
                presentations: state.presentations.filter(presentation => presentation.topicId !== topicId)
            })),

            // 프레젠테이션 액션들
            setPresentations: (presentations) => set({ presentations }),
            
            addPresentation: (presentation) => set((state) => ({
                presentations: [...state.presentations, presentation],
                // 토픽의 프레젠테이션 카운트 업데이트
                topics: state.topics.map(topic => 
                    topic.id === presentation.topicId 
                        ? { ...topic, presentationCount: (topic.presentationCount || 0) + 1 }
                        : topic
                )
            })),
            
            updatePresentation: (presentationId, updates) => set((state) => ({
                presentations: state.presentations.map(presentation => 
                    presentation.id === presentationId ? { ...presentation, ...updates } : presentation
                ),
                currentPresentation: state.currentPresentation?.id === presentationId
                    ? { ...state.currentPresentation, ...updates }
                    : state.currentPresentation
            })),
            
            deletePresentation: (presentationId) => set((state) => {
                const presentationToDelete = state.presentations.find(p => p.id === presentationId);
                return {
                    presentations: state.presentations.filter(presentation => presentation.id !== presentationId),
                    currentPresentation: state.currentPresentation?.id === presentationId ? null : state.currentPresentation,
                    // 토픽의 프레젠테이션 카운트 업데이트
                    topics: presentationToDelete 
                        ? state.topics.map(topic => 
                            topic.id === presentationToDelete.topicId 
                                ? { ...topic, presentationCount: Math.max((topic.presentationCount || 1) - 1, 0) }
                                : topic
                        )
                        : state.topics
                };
            }),
            
            setCurrentPresentation: (presentation) => set({ currentPresentation: presentation }),

            // 특정 토픽의 프레젠테이션들 가져오기
            getPresentationsByTopic: (topicId) => {
                const { presentations } = get();
                return presentations.filter(presentation => presentation.topicId === topicId);
            },

            // 토픽의 프레젠테이션 카운트 업데이트
            updateTopicPresentationCount: (topicId, count) => set((state) => ({
                topics: state.topics.map(topic => 
                    topic.id === topicId 
                        ? { ...topic, presentationCount: count }
                        : topic
                )
            })),

            // 유틸리티 액션들
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            // 전체 상태 초기화
            reset: () => set({
                topics: [],
                currentTopic: null,
                presentations: [],
                currentPresentation: null,
                isLoading: false,
                error: null
            }),

            // 데이터 동기화 (서버에서 최신 데이터 로드 후 호출)
            syncTopicsWithPresentations: () => set((state) => {
                const updatedTopics = state.topics.map(topic => {
                    const topicPresentations = state.presentations.filter(p => p.topicId === topic.id);
                    return {
                        ...topic,
                        presentationCount: topicPresentations.length
                    };
                });
                return { topics: updatedTopics };
            })
        }),
        {
            name: 'topic-storage',
            partialize: (state) => ({
                topics: state.topics,
                presentations: state.presentations,
                currentTopic: state.currentTopic,
                currentPresentation: state.currentPresentation
            })
        }
    )
); 