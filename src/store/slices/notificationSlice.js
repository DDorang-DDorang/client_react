import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action) => {
            const notification = action.payload;
            // 중복 방지
            const exists = state.notifications.find(n => n.id === notification.id);
            if (!exists) {
                state.notifications.unshift(notification); // 최신 알림을 맨 위에 추가
                if (!notification.isRead) {
                    state.unreadCount += 1;
                }
            }
        },
        setNotifications: (state, action) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter(n => !n.isRead).length;
        },
        markAsRead: (state, action) => {
            const notificationId = action.payload;
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(notification => {
                notification.isRead = true;
            });
            state.unreadCount = 0;
        },
        removeNotification: (state, action) => {
            const notificationId = action.payload;
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.notifications = state.notifications.filter(n => n.id !== notificationId);
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        }
    }
});

export const { 
    addNotification, 
    setNotifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearNotifications,
    setLoading,
    setError
} = notificationSlice.actions;

export default notificationSlice.reducer;

