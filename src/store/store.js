import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import topicReducer from './slices/topicSlice';
import commentReducer from './slices/commentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    topic: topicReducer,
    comment: commentReducer,
  },
}); 