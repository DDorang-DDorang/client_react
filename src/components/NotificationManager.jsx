import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setNotifications, addNotification } from '../store/slices/notificationSlice';
import notificationService from '../api/notificationService';
import ToastNotification from './ToastNotification';

const NotificationManager = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const { notifications } = useSelector(state => state.notification);
    const intervalRef = useRef(null);
    const lastNotificationIdRef = useRef(null);
    const [toastNotification, setToastNotification] = useState(null);

    // 브라우저 알림 권한 요청
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // 브라우저 알림 표시 함수 (useEffect 외부에 정의하여 클로저 문제 방지)
    const showBrowserNotification = (notification) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: '/logo512.png',
                badge: '/logo192.png',
                tag: notification.id,
                requireInteraction: false,
                renotify: true
            });

            // 클릭 시 해당 페이지로 이동
            browserNotification.onclick = () => {
                window.focus();
                browserNotification.close();
                
                if (notification.relatedId) {
                    if (notification.type === 'AI_ANALYSIS_COMPLETE') {
                        navigate(`/video-analysis/${notification.relatedId}`);
                    } else if (notification.type === 'COMMENT') {
                        navigate(`/presentation/${notification.relatedId}`);
                    }
                }
            };

            // 알림 자동 닫기 (5초 후)
            setTimeout(() => {
                browserNotification.close();
            }, 5000);
        }
    };

    // 알림 폴링
    useEffect(() => {
        if (!isAuthenticated) {
            // 인증되지 않았으면 interval 정리
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const fetchNotifications = async () => {
            try {
                const notificationsData = await notificationService.getNotifications();
                
                if (notificationsData && notificationsData.length > 0) {
                    // 최신 알림 및 첫 미확인 알림 확인
                    const latestNotification = notificationsData[0];
                    const firstUnread = notificationsData.find(n => !n.isRead);

                    // 알림 ID 추출 (notificationId 또는 id)
                    const latestId = latestNotification.notificationId || latestNotification.id;
                    const firstUnreadId = firstUnread ? (firstUnread.notificationId || firstUnread.id) : null;

                    // 상태
                    const isInitialLoad = lastNotificationIdRef.current === null;
                    const isNewNotification = lastNotificationIdRef.current !== latestId;
                    const latestIsUnread = !latestNotification.isRead;

                    if (isInitialLoad) {
                        // 초기 로드: 읽지 않은 알림이 하나라도 있으면 그 중 가장 최신 것을 표시
                        if (firstUnread) {
                            showBrowserNotification(firstUnread);
                            setToastNotification(firstUnread);
                            lastNotificationIdRef.current = firstUnreadId;
                        } else {
                            // 읽지 않은 것이 없으면 최신의 ID만 기록
                            lastNotificationIdRef.current = latestId;
                        }
                    } else if (isNewNotification) {
                        // 신규 알림 도착: 최신이 읽지 않은 경우에만 표시
                        if (latestIsUnread) {
                            showBrowserNotification(latestNotification);
                            setToastNotification(latestNotification);
                        }
                        lastNotificationIdRef.current = latestId;
                    }

                    dispatch(setNotifications(notificationsData));
                } else {
                    // 알림이 없어도 상태 업데이트
                    dispatch(setNotifications([]));
                }
            } catch (error) {
                // 모든 에러를 조용히 처리 (콘솔 로그 없음)
                if (error.response?.status === 401) {
                    // 토큰 문제로 인해 알림 조회 불가
                    return;
                }
            }
        };

        // 초기 로드
        fetchNotifications();

        // 15초마다 폴링 (분석 완료 알림을 더 빠르게 받기 위해 주기 단축)
        // 이미 interval이 있으면 정리 후 새로 설정
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(fetchNotifications, 10000); // 15초 = 15000ms

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]); // dispatch와 navigate는 안정적인 참조이므로 dependency에서 제외

    const handleCloseToast = () => {
        setToastNotification(null);
    };

    const handleToastClick = () => {
        if (toastNotification && toastNotification.relatedId) {
            if (toastNotification.type === 'AI_ANALYSIS_COMPLETE') {
                navigate(`/video-analysis/${toastNotification.relatedId}`);
                // 분석 페이지로 이동하면 토스트 닫기
                setToastNotification(null);
            } else if (toastNotification.type === 'COMMENT') {
                navigate(`/presentation/${toastNotification.relatedId}`);
                // 프레젠테이션 페이지로 이동하면 토스트 닫기
                setToastNotification(null);
            }
        }
    };

    return (
        <>
            {toastNotification && (
                <ToastNotification 
                    notification={toastNotification} 
                    onClose={handleCloseToast}
                    onClick={handleToastClick}
                />
            )}
        </>
    );
};

export default NotificationManager;

