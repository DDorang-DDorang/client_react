import React, { useState, useEffect } from 'react';
import './ToastNotification.css';

const ToastNotification = ({ notification, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 애니메이션을 위한 딜레이
        setTimeout(() => setIsVisible(true), 10);

        // 자동으로 닫힘 (5초)
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose && onClose(), 300); // 애니메이션 완료 후 닫기
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose && onClose(), 300);
    };

    if (!notification) return null;

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'AI_ANALYSIS_COMPLETE':
                return '🎬';
            case 'COMMENT':
                return '💬';
            default:
                return '🔔';
        }
    };

    return (
        <div 
            className={`toast-notification ${isVisible ? 'visible' : ''}`}
            onClick={handleClose}
        >
            <div className="toast-icon">
                {getNotificationIcon(notification.type)}
            </div>
            <div className="toast-content">
                <div className="toast-title">{notification.title}</div>
                <div className="toast-message">{notification.message}</div>
            </div>
            <button className="toast-close" onClick={handleClose}>×</button>
        </div>
    );
};

export default ToastNotification;

