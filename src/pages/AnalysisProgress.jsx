import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, LinearProgress, Card, CardContent, Button, Alert } from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';
import videoAnalysisService from '../api/videoAnalysisService';

const AnalysisProgress = () => {
    const { presentationId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    
    const [presentationData, setPresentationData] = useState(location.state?.presentationData);
    const [topicData, setTopicData] = useState(location.state?.topicData);

    useEffect(() => {
        if (!presentationId) {
            setError('프레젠테이션 ID가 없습니다.');
            return;
        }

        // presentationData나 topicData가 없으면 로드 시도
        loadMissingData();
        checkAnalysisStatus();
        
        // 10초마다 상태 확인 (주기 증가로 서버 부하 감소)
        const interval = setInterval(checkAnalysisStatus, 10000);
        
        return () => clearInterval(interval);
    }, [presentationId]);

    const loadMissingData = async () => {
        try {
            // presentationData가 없으면 기본값 설정
            setPresentationData(prev => prev || {
                id: presentationId,
                title: '분석 중인 발표',
                videoUrl: null
            });
            
            // topicData가 없으면 기본값 설정
            setTopicData(prev => prev || {
                id: 'unknown',
                name: '알 수 없는 토픽'
            });
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        }
    };

    const checkAnalysisStatus = async () => {
        try {
            const response = await fetch(`/api/video-analysis/${presentationId}/status`);
            if (response.ok) {
                const data = await response.json();
                setAnalysisStatus(data);
                setProgress(data.progress || 0);
                
                // 분석이 완료되면 분석 결과 페이지로 이동
                if (data.status === 'completed') {
                    // DB에서 최신 분석 결과를 로드한 후 이동
                    await loadLatestAnalysisResults();
                }
                
                // 분석이 실패하면 에러 표시
                if (data.status === 'failed') {
                    setError(data.message || '분석에 실패했습니다.');
                }
            } else if (response.status === 404 || response.status === 400) {
                // 프레젠테이션이 삭제되었거나 존재하지 않는 경우 대시보드로 이동
                // 응답 본문 확인하여 프레젠테이션 관련 오류인지 확인
                try {
                    const errorData = await response.json();
                    if (errorData.message?.includes('존재하지 않') || 
                        errorData.message?.includes('찾을 수 없') ||
                        errorData.error?.includes('NOT_FOUND')) {
                        navigate('/dashboard', { replace: true });
                        return;
                    }
                } catch (e) {
                    // JSON 파싱 실패 시에도 404/400이면 삭제된 것으로 간주
                    navigate('/dashboard', { replace: true });
                    return;
                }
                setError('분석 상태를 확인할 수 없습니다.');
            } else {
                setError('분석 상태를 확인할 수 없습니다.');
            }
        } catch (err) {
            // 네트워크 오류나 다른 오류도 프레젠테이션 삭제 가능성 고려
            // 404나 프레젠테이션 관련 오류인 경우 대시보드로 이동
            if (err.message?.includes('404') || 
                err.message?.includes('Not Found') ||
                err.message?.includes('400') ||
                err.response?.status === 404 ||
                err.response?.status === 400) {
                navigate('/dashboard', { replace: true });
                return;
            }
            setError('분석 상태를 확인하는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        checkAnalysisStatus();
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    // DB에서 최신 분석 결과를 로드하고 분석 페이지로 이동
    const loadLatestAnalysisResults = async () => {
        // 현재 상태의 presentationData와 topicData 사용 (함수 시작 부분에서 정의)
        const finalPresentationData = presentationData || {
            id: presentationId,
            title: '분석 중인 발표',
            videoUrl: null
        };
        
        const finalTopicData = topicData || {
            id: 'unknown',
            name: '알 수 없는 토픽'
        };
        
        try {
            // 잠시 대기 후 DB에서 최신 분석 결과 조회 (DB 업데이트 시간 고려)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // DB에서 최신 분석 결과 조회
            const result = await videoAnalysisService.getAllAnalysisResults(presentationId);
            
            if (result.success && result.data) {
                // 분석 페이지로 이동하면서 최신 데이터 전달
                navigate(`/video-analysis/${presentationId}`, {
                    state: {
                        presentationData: finalPresentationData,
                        topicData: finalTopicData,
                        analysisData: result.data,
                        forceRefresh: true, // 강제 새로고침 플래그
                        timestamp: Date.now()
                    }
                });
            } else {
                console.error('분석 결과 로드 실패:', result.error);
                // 분석 결과가 없어도 페이지로 이동 (에러 처리)
                navigate(`/video-analysis/${presentationId}`, {
                    state: {
                        presentationData: finalPresentationData,
                        topicData: finalTopicData,
                        forceRefresh: true
                    }
                });
            }
        } catch (error) {
            console.error('최신 분석 결과 로드 중 오류:', error);
            // 에러가 발생해도 페이지로 이동
            navigate(`/video-analysis/${presentationId}`, {
                state: {
                    presentationData: finalPresentationData,
                    topicData: finalTopicData,
                    forceRefresh: true
                }
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'processing': return 'info';
            case 'completed': return 'success';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '분석 대기 중';
            case 'processing': return '분석 진행 중';
            case 'completed': return '분석 완료';
            case 'failed': return '분석 실패';
            case 'not_started': return '분석 미시작';
            default: return '알 수 없음';
        }
    };

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button 
                    variant="outlined" 
                    startIcon={<ArrowBack />}
                    onClick={handleBack}
                >
                    대시보드로 돌아가기
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button 
                    variant="outlined" 
                    startIcon={<ArrowBack />}
                    onClick={handleBack}
                >
                    뒤로
                </Button>
                <Typography variant="h5" component="h1">
                    분석 진행 상태
                </Typography>
            </Box>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {presentationData?.title || '프레젠테이션'}
                    </Typography>
                    
                    {analysisStatus && (
                        <>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    상태: 
                                    <Typography 
                                        component="span" 
                                        color={`${getStatusColor(analysisStatus.status)}.main`}
                                        sx={{ ml: 1, fontWeight: 'bold' }}
                                    >
                                        {getStatusText(analysisStatus.status)}
                                    </Typography>
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <LinearProgress 
                                    variant="indeterminate" 
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>

                            {analysisStatus.message && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {analysisStatus.message}
                                </Typography>
                            )}

                            {analysisStatus.createdAt && (
                                <Typography variant="caption" color="text.secondary">
                                    시작 시간: {new Date(analysisStatus.createdAt).toLocaleString()}
                                </Typography>
                            )}
                        </>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            startIcon={<Refresh />}
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            새로고침
                        </Button>
                        
                        {analysisStatus?.status === 'failed' && (
                            <Button 
                                variant="outlined"
                                onClick={() => navigate('/dashboard', {
                                    state: {
                                        selectedPresentation: presentationData,
                                        action: 'analyze'
                                    }
                                })}
                            >
                                다시 분석하기
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 분석이 완료되면 자동으로 결과 페이지로 이동합니다.
                </Typography>
            </Box>
        </Box>
    );
};

export default AnalysisProgress;
