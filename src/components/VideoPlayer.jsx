import React, { useRef, useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    Close as CloseIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    VolumeUp as VolumeUpIcon,
    Fullscreen as FullscreenIcon
} from '@mui/icons-material';

const VideoPlayer = ({ presentation, open, onClose, onTimeUpdate }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && videoRef.current) {
            const video = videoRef.current;
            
            const handleTimeUpdate = () => {
                const time = video.currentTime;
                setCurrentTime(time);
                if (onTimeUpdate) {
                    onTimeUpdate(time);
                }
            };
            const handleDurationChange = () => setDuration(video.duration);
            const handlePlay = () => setIsPlaying(true);
            const handlePause = () => setIsPlaying(false);
            const handleError = (e) => {
                console.error('비디오 재생 오류:', e);
                setError('비디오를 재생할 수 없습니다. 파일이 손상되었거나 지원되지 않는 형식입니다.');
            };

            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('durationchange', handleDurationChange);
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('error', handleError);

            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('durationchange', handleDurationChange);
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('error', handleError);
            };
        }
    }, [open]);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const handleSeek = (event) => {
        const progress = event.target.value;
        const newTime = (progress / 100) * duration;
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };

    const handleVolumeChange = (event) => {
        const newVolume = event.target.value / 100;
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
    };

    const handleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getVideoUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (!presentation) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pb: 1
            }}>
                {presentation.title}
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {error ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="error" gutterBottom>
                            {error}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            비디오 URL: {getVideoUrl(presentation.videoUrl)}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* 비디오 */}
                        <Box sx={{ 
                            position: 'relative',
                            backgroundColor: '#000',
                            aspectRatio: '16/9'
                        }}>
                            <video
                                ref={videoRef}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                                controls={false}
                                preload="metadata"
                            >
                                <source src={getVideoUrl(presentation.videoUrl)} type="video/mp4" />
                                비디오를 지원하지 않는 브라우저입니다.
                            </video>
                        </Box>

                        {/* 컨트롤 바 */}
                        <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
                            {/* 진행률 바 */}
                            <LinearProgress
                                variant="determinate"
                                value={duration > 0 ? (currentTime / duration) * 100 : 0}
                                sx={{ mb: 2, height: 6, borderRadius: 3 }}
                            />

                            {/* 컨트롤 버튼들 */}
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton onClick={handlePlayPause} size="large">
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </IconButton>
                                    
                                    <Typography variant="body2" sx={{ minWidth: '100px' }}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VolumeUpIcon />
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume * 100}
                                        onChange={handleVolumeChange}
                                        style={{ width: 80 }}
                                    />
                                    
                                    <IconButton onClick={handleFullscreen}>
                                        <FullscreenIcon />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Box>

                        {/* 프레젠테이션 정보 */}
                        <Box sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                {presentation.goalTime && (
                                    <Chip 
                                        label={`목표시간: ${presentation.goalTime}`} 
                                        size="small" 
                                        variant="outlined"
                                    />
                                )}
                                <Chip 
                                    label={`토픽: ${presentation.topicTitle}`} 
                                    size="small" 
                                    color="primary"
                                />
                            </Box>
                            
                            {presentation.script && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        스크립트
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                        bgcolor: 'grey.50',
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
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    닫기
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default VideoPlayer; 