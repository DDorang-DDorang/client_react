import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import topicService from '../api/topicService';
import { useTopicStore } from '../store/topicStore';
import { useUserStore } from '../store/userStore';

const TopicCreator = ({ open, onClose, onTopicCreated }) => {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { setTopics } = useTopicStore();
    const { user, fetchUserInfo } = useUserStore();

    // 컴포넌트가 열릴 때 사용자 정보 확인
    useEffect(() => {
        if (open && (!user || !user.id)) {
            console.log('사용자 정보 없음, 다시 로드 시도:', user);
            fetchUserInfo().catch(error => {
                console.error('사용자 정보 로드 실패:', error);
                setError('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
            });
        }
    }, [open, user, fetchUserInfo]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError('토픽 제목을 입력해주세요.');
            return;
        }

        console.log('현재 사용자 정보:', user);

        if (!user) {
            setError('사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // LOCAL 사용자의 경우 JWT 토큰 확인
        if (user.provider === 'LOCAL') {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('로그인이 필요합니다. 다시 로그인해주세요.');
                return;
            }
            
            // JWT 토큰 유효성 확인
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (!payload.exp || payload.exp <= currentTime) {
                        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
                        return;
                    }
                }
            } catch (tokenError) {
                setError('인증 정보가 올바르지 않습니다. 다시 로그인해주세요.');
                return;
            }
        }

        // userId가 없으면 email을 사용
        const userIdentifier = user.userId || user.id || user.email;
        
        if (!userIdentifier) {
            setError('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('토픽 생성 시도:', { 
                title: title.trim(), 
                userIdentifier: userIdentifier,
                userInfo: user,
                provider: user.provider
            });
            
            const result = await topicService.createTopic(title.trim(), userIdentifier);
            
            if (result.success) {
                // 로컬 생성인 경우 사용자에게 알림
                if (result.isLocal) {
                    console.log('로컬에 토픽 생성됨:', result.data);
                    // 토픽 목록은 로컬 데이터로 업데이트하지 않음 (이미 저장됨)
                } else {
                    // 서버 생성 성공 시 토픽 목록 새로고침
                    const topicsResult = await topicService.getTopics(userIdentifier);
                    if (topicsResult.success) {
                        setTopics(topicsResult.data);
                    }
                }
                
                onTopicCreated && onTopicCreated(result.data);
                onClose();
                setTitle('');
            } else {
                // 로그인이 필요한 경우
                if (result.needLogin) {
                    setError('로그인이 필요합니다. 다시 로그인해주세요.');
                    // 토큰 제거
                    localStorage.removeItem('token');
                    // 로그인 페이지로 리다이렉트 이벤트 발생
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                } else {
                    setError(result.error || '토픽 생성에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('토픽 생성 중 오류:', error);
            setError('토픽 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setTitle('');
            setError('');
            onClose();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    padding: 1
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon color="primary" />
                <Typography variant="h6" component="span">
                    새 토픽 만들기
                </Typography>
            </DialogTitle>
            
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            프레젠테이션을 그룹화할 토픽의 제목을 입력해주세요.
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            label="토픽 제목"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 회사 발표, 학교 프로젝트, 개인 연습 등"
                            disabled={loading}
                            variant="outlined"
                            sx={{ mt: 1 }}
                            inputProps={{ maxLength: 100 }}
                        />
                    </Box>
                </DialogContent>
                
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={handleClose} 
                        disabled={loading}
                        variant="outlined"
                    >
                        취소
                    </Button>
                    <Button 
                        type="submit"
                        disabled={loading || !title.trim()}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
                        sx={{ ml: 1 }}
                    >
                        {loading ? '생성 중...' : '토픽 생성'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TopicCreator; 