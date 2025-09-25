import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  topics: [],
  currentTopic: null,
  presentations: [],
  currentPresentation: null,
  isLoading: false,
  error: null
};

const topicSlice = createSlice({
  name: 'topic',
  initialState,
  reducers: {
    setTopics(state, action) {
      state.topics = action.payload;
    },
    setCurrentTopic(state, action) {
      state.currentTopic = action.payload;
    },
    addTopic(state, action) {
      const newTopic = action.payload;
      
      if (newTopic.isTeamTopic && newTopic.teamId) {
        // 팀 토픽인 경우, 해당 팀의 토픽들을 찾아서 맨 앞에 추가
        const teamTopicIndex = state.topics.findIndex(topic => 
          topic.isTeamTopic && topic.teamId === newTopic.teamId
        );
        
        if (teamTopicIndex !== -1) {
          // 해당 팀의 첫 번째 토픽 앞에 삽입
          state.topics.splice(teamTopicIndex, 0, newTopic);
        } else {
          // 해당 팀의 토픽이 없으면 맨 앞에 추가
          state.topics.unshift(newTopic);
        }
      } else {
        // 개인 토픽이거나 팀 정보가 없는 경우 기존 방식대로 맨 뒤에 추가
        state.topics.push(newTopic);
      }
    },
    updateTopic(state, action) {
      const { topicId, updates } = action.payload;
      state.topics = state.topics.map(topic =>
        topic.id === topicId ? { ...topic, ...updates } : topic
      );
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic = { ...state.currentTopic, ...updates };
      }
    },
    deleteTopic(state, action) {
      const topicId = action.payload;
      state.topics = state.topics.filter(topic => topic.id !== topicId);
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic = null;
      }
      state.presentations = state.presentations.filter(p => p.topicId !== topicId);
    },
    setPresentations(state, action) {
      state.presentations = action.payload;
    },
    addPresentation(state, action) {
      const presentation = action.payload;
      state.presentations.push(presentation);
      state.topics = state.topics.map(topic =>
        topic.id === presentation.topicId
          ? { ...topic, presentationCount: (topic.presentationCount || 0) + 1 }
          : topic
      );
    },
    updatePresentation(state, action) {
      const { presentationId, updates } = action.payload;
      state.presentations = state.presentations.map(presentation =>
        presentation.id === presentationId ? { ...presentation, ...updates } : presentation
      );
      if (state.currentPresentation && state.currentPresentation.id === presentationId) {
        state.currentPresentation = { ...state.currentPresentation, ...updates };
      }
    },
    deletePresentation(state, action) {
      const presentationId = action.payload;
      const presentationToDelete = state.presentations.find(p => p.id === presentationId);
      state.presentations = state.presentations.filter(p => p.id !== presentationId);
      if (state.currentPresentation && state.currentPresentation.id === presentationId) {
        state.currentPresentation = null;
      }
      if (presentationToDelete) {
        state.topics = state.topics.map(topic =>
          topic.id === presentationToDelete.topicId
            ? { ...topic, presentationCount: Math.max((topic.presentationCount || 1) - 1, 0) }
            : topic
        );
      }
    },
    setCurrentPresentation(state, action) {
      state.currentPresentation = action.payload;
    },
    updateTopicPresentationCount(state, action) {
      const { topicId, count } = action.payload;
      state.topics = state.topics.map(topic =>
        topic.id === topicId ? { ...topic, presentationCount: count } : topic
      );
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    reset(state) {
      state.topics = [];
      state.currentTopic = null;
      state.presentations = [];
      state.currentPresentation = null;
      state.isLoading = false;
      state.error = null;
    },
    syncTopicsWithPresentations(state) {
      state.topics = state.topics.map(topic => {
        const topicPresentations = state.presentations.filter(p => p.topicId === topic.id);
        return {
          ...topic,
          presentationCount: topicPresentations.length
        };
      });
    },
    loadTopicsFromLocalStorage(state) {
      try {
        const localTopics = JSON.parse(localStorage.getItem('ddorang_topics') || '[]');
        // 기존 토픽과 로컬 토픽을 병합 (중복 제거)
        const existingIds = new Set(state.topics.map(t => t.id));
        const newLocalTopics = localTopics.filter(t => !existingIds.has(t.id));
        state.topics = [...state.topics, ...newLocalTopics];
      } catch (error) {
        console.error('로컬 스토리지에서 토픽 로드 실패:', error);
      }
    }
  }
});

export const {
  setTopics,
  setCurrentTopic,
  addTopic,
  updateTopic,
  deleteTopic,
  setPresentations,
  addPresentation,
  updatePresentation,
  deletePresentation,
  setCurrentPresentation,
  updateTopicPresentationCount,
  setLoading,
  setError,
  clearError,
  reset,
  syncTopicsWithPresentations,
  loadTopicsFromLocalStorage
} = topicSlice.actions;

export default topicSlice.reducer; 