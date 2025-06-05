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
    Chip
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    PlayArrow as PlayIcon,
    Videocam as VideocamIcon,
    UploadIcon
} from '@mui/icons-material';
import topicService from '../api/topicService';
import VideoPlayer from './VideoPlayer';

const PresentationManager = ({ 
    presentation, 
    open, 
    onClose, 
    onPresentationUpdated, 
    onPresentationDeleted,
    onPlayPresentation 
}) => {
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'delete'
    const [formData, setFormData] = useState({
        title: presentation?.title || '',
        script: presentation?.script || '',
        goalTime: presentation?.goalTime || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    React.useEffect(() => {
        if (presentation) {
            setFormData({
                title: presentation.title || '',
                script: presentation.script || '',
                goalTime: presentation.goalTime || ''
            });
            setMode('view');
            setError('');
        }
    }, [presentation]);

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
        setFormData({
            title: presentation?.title || '',
            script: presentation?.script || '',
            goalTime: presentation?.goalTime || ''
        });
        setError('');
    };

    const handleInputChange = (field) => (event) => {
        setFormData({
            ...formData,
            [field]: event.target.value
        });
    };

    const handleUpdate = async () => {
        if (!formData.title.trim()) {
            setError('프레젠테이션 제목을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await topicService.updatePresentation(presentation.id, formData);
            
            if (result.success) {
                onPresentationUpdated && onPresentationUpdated(result.data);
                setMode('view');
            } else {
                setError(result.error || '프레젠테이션 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('프레젠테이션 수정 실패:', error);
            setError('프레젠테이션 수정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await topicService.deletePresentation(presentation.id);
            
            if (result.success) {
                onPresentationDeleted && onPresentationDeleted(presentation.id);
                onClose();
            } else {
                setError(result.error || '프레젠테이션 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('프레젠테이션 삭제 실패:', error);
            setError('프레젠테이션 삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = () => {
        if (presentation.videoUrl) {
            setShowVideoPlayer(true);
        } else {
            onPlayPresentation && onPlayPresentation(presentation);
            onClose();
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '날짜 없음';
        try {
            return new Date(dateString).toLocaleString('ko-KR');
        } catch {
            return '날짜 없음';
        }
    };

    if (!presentation) return null;

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    pb: 1
                }}>
                    {mode === 'edit' ? '프레젠테이션 수정' : 
                     mode === 'delete' ? '프레젠테이션 삭제' : '프레젠테이션 관리'}
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
                                프레젠테이션 정보
                            </Typography>
                            
                            <Box sx={{ 
                                p: 2, 
                                bgcolor: 'grey.50', 
                                borderRadius: 1,
                                mb: 2
                            }}>
                                <Typography variant="h6" gutterBottom>
                                    {presentation.title}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    {presentation.videoUrl && (
                                        <Chip 
                                            icon={<VideocamIcon />} 
                                            label="비디오 있음" 
                                            size="small" 
                                            color="primary"
                                        />
                                    )}
                                    {presentation.goalTime && (
                                        <Chip 
                                            label={`목표시간: ${presentation.goalTime}`} 
                                            size="small" 
                                            variant="outlined"
                                        />
                                    )}
                                </Box>

                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    생성일: {formatDate(presentation.createdAt)}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    토픽: {presentation.topicTitle}
                                </Typography>

                                {presentation.script && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            스크립트
                                        </Typography>
                                        <Typography variant="body2" sx={{ 
                                            bgcolor: 'white',
                                            p: 1,
                                            borderRadius: 1,
                                            border: '1px solid #e0e0e0',
                                            maxHeight: '100px',
                                            overflow: 'auto'
                                        }}>
                                            {presentation.script}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                작업 선택
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                {presentation.videoUrl && (
                                    <Button
                                        startIcon={<PlayIcon />}
                                        onClick={handlePlay}
                                        variant="contained"
                                        fullWidth
                                    >
                                        비디오 재생
                                    </Button>
                                )}
                                <Button
                                    startIcon={<EditIcon />}
                                    onClick={handleEdit}
                                    variant="outlined"
                                    fullWidth
                                >
                                    프레젠테이션 수정
                                </Button>
                                <Button
                                    startIcon={<DeleteIcon />}
                                    onClick={handleDeleteConfirm}
                                    variant="outlined"
                                    color="error"
                                    fullWidth
                                >
                                    프레젠테이션 삭제
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {mode === 'edit' && (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                프레젠테이션 정보 수정
                            </Typography>
                            
                            <TextField
                                autoFocus
                                fullWidth
                                label="제목"
                                value={formData.title}
                                onChange={handleInputChange('title')}
                                variant="outlined"
                                margin="normal"
                                disabled={loading}
                            />
                            
                            <TextField
                                fullWidth
                                label="목표 시간 (예: 5분, 3분 30초)"
                                value={formData.goalTime}
                                onChange={handleInputChange('goalTime')}
                                variant="outlined"
                                margin="normal"
                                disabled={loading}
                            />
                            
                            <TextField
                                fullWidth
                                label="스크립트"
                                value={formData.script}
                                onChange={handleInputChange('script')}
                                variant="outlined"
                                margin="normal"
                                multiline
                                rows={4}
                                disabled={loading}
                                helperText="프레젠테이션에서 말할 내용을 입력하세요."
                            />
                        </Box>
                    )}

                    {mode === 'delete' && (
                        <Box>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    정말로 이 프레젠테이션을 삭제하시겠습니까?
                                </Typography>
                                <Typography variant="body2">
                                    "<strong>{presentation.title}</strong>" 프레젠테이션과 관련된 모든 데이터가 삭제됩니다.
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
                                    • 프레젠테이션: {presentation.title}
                                </Typography>
                                {presentation.videoUrl && (
                                    <Typography variant="body2">
                                        • 비디오 파일
                                    </Typography>
                                )}
                                {presentation.script && (
                                    <Typography variant="body2">
                                        • 스크립트 내용
                                    </Typography>
                                )}
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
                                disabled={loading || !formData.title.trim()}
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

            {/* 비디오 플레이어 */}
            {presentation.videoUrl && (
                <VideoPlayer
                    open={showVideoPlayer}
                    onClose={() => setShowVideoPlayer(false)}
                    presentation={presentation}
                />
            )}
        </>
    );
};

export default PresentationManager; 