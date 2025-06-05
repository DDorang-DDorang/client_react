import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    IconButton,
    Alert,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import topicService from '../api/topicService';

const TopicManager = ({ topic, open, onClose, onTopicUpdated, onTopicDeleted }) => {
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'delete'
    const [title, setTitle] = useState(topic?.title || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (topic) {
            setTitle(topic.title);
            setMode('view');
            setError('');
        }
    }, [topic]);

    const handleEdit = () => {
        setMode('edit');
        setError('');
    };

    const handleDeleteConfirm = () => {
        setMode('delete');
        setError('');
    };

    const handleCancel = () => {
        setMode('view');
        setTitle(topic?.title || '');
        setError('');
    };

    const handleUpdate = async () => {
        if (!title.trim()) {
            setError('토픽 제목을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await topicService.updateTopic(topic.id, title.trim());
            
            if (result.success) {
                onTopicUpdated && onTopicUpdated(result.data);
                setMode('view');
            } else {
                setError(result.error || '토픽 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('토픽 수정 실패:', error);
            setError('토픽 수정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await topicService.deleteTopic(topic.id);
            
            if (result.success) {
                onTopicDeleted && onTopicDeleted(topic.id);
                onClose();
            } else {
                setError(result.error || '토픽 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('토픽 삭제 실패:', error);
            setError('토픽 삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!topic) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pb: 1
            }}>
                {mode === 'edit' ? '토픽 수정' : 
                 mode === 'delete' ? '토픽 삭제' : '토픽 관리'}
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {mode === 'view' && (
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            토픽 정보
                        </Typography>
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderRadius: 1,
                            mb: 2
                        }}>
                            <Typography variant="body1" fontWeight="bold">
                                {topic.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                프레젠테이션 개수: {topic.presentationCount || 0}개
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                타입: {topic.isTeamTopic ? '팀 토픽' : '개인 토픽'}
                            </Typography>
                        </Box>
                        
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            작업 선택
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                            <Button
                                startIcon={<EditIcon />}
                                onClick={handleEdit}
                                variant="outlined"
                                fullWidth
                            >
                                토픽 이름 수정
                            </Button>
                            <Button
                                startIcon={<DeleteIcon />}
                                onClick={handleDeleteConfirm}
                                variant="outlined"
                                color="error"
                                fullWidth
                            >
                                토픽 삭제
                            </Button>
                        </Box>
                    </Box>
                )}

                {mode === 'edit' && (
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            토픽 이름 수정
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            label="토픽 이름"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            variant="outlined"
                            margin="normal"
                            disabled={loading}
                        />
                    </Box>
                )}

                {mode === 'delete' && (
                    <Box>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                정말로 이 토픽을 삭제하시겠습니까?
                            </Typography>
                            <Typography variant="body2">
                                "<strong>{topic.title}</strong>" 토픽과 관련된 모든 프레젠테이션이 함께 삭제됩니다.
                                이 작업은 되돌릴 수 없습니다.
                            </Typography>
                        </Alert>
                        
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderRadius: 1 
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                삭제될 내용:
                            </Typography>
                            <Typography variant="body2">
                                • 토픽: {topic.title}
                            </Typography>
                            <Typography variant="body2">
                                • 프레젠테이션: {topic.presentationCount || 0}개
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                {mode === 'view' && (
                    <Button onClick={onClose}>
                        닫기
                    </Button>
                )}

                {mode === 'edit' && (
                    <>
                        <Button onClick={handleCancel} disabled={loading}>
                            취소
                        </Button>
                        <Button 
                            onClick={handleUpdate} 
                            variant="contained"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? '수정 중...' : '수정'}
                        </Button>
                    </>
                )}

                {mode === 'delete' && (
                    <>
                        <Button onClick={handleCancel} disabled={loading}>
                            취소
                        </Button>
                        <Button 
                            onClick={handleDelete} 
                            variant="contained"
                            color="error"
                            disabled={loading}
                        >
                            {loading ? '삭제 중...' : '삭제'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default TopicManager; 