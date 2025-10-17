import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import ComparisonChart from '../components/ComparisonChart';
import PresentationSelector from '../components/PresentationSelector';
import comparisonService from '../api/comparisonService';
import topicService from '../api/topicService';
import useAuthValidation from '../hooks/useAuthValidation';
import useError from '../hooks/useError';
import useLoading from '../hooks/useLoading';
import { Box, Typography, Button, Alert, CircularProgress, Paper } from '@mui/material';
import { Compare as CompareIcon } from '@mui/icons-material';

const Comparison = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedPresentation1, setSelectedPresentation1] = useState(null);
    const [selectedPresentation2, setSelectedPresentation2] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [comparisonHistory, setComparisonHistory] = useState([]);
    const [topicPresentations, setTopicPresentations] = useState([]);
    const { error, setError, resetError } = useError('');
    const { loading } = useLoading(false);
    const [isComparing, setIsComparing] = useState(false);
    const [success, setSuccess] = useState('');

    // Redux에서 topics와 teams 가져오기
    const topics = useSelector(state => state.topic.topics) || [];
    const { teams = [] } = useSelector(state => state.team);

    // 인증 검증 활성화
    useAuthValidation();

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    // 발표 목록 로드
    useEffect(() => {
        loadComparisonHistory();
    }, []);

    // 사이드바에서 전달받은 토픽 자동 선택
    useEffect(() => {
        if (location.state?.selectedTopic) {
            const topic = location.state.selectedTopic;
            handleSelectTopic(topic);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const loadComparisonHistory = async () => {
        try {
            const response = await comparisonService.getUserComparisons();
            const sortedHistory = (response || []).sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA;
            });
            setComparisonHistory(sortedHistory);
        } catch (error) {
            console.error('비교 기록 로드 실패:', error);
        }
    };

    const handleCompare = async () => {
        if (!selectedPresentation1 || !selectedPresentation2) {
            setError('비교할 두 발표를 모두 선택해주세요.');
            return;
        }

        if (selectedPresentation1.id === selectedPresentation2.id) {
            setError('서로 다른 발표를 선택해주세요.');
            return;
        }

        try {
            setIsComparing(true);
            resetError();

            const response = await comparisonService.comparePresentations(
                selectedPresentation1.id,
                selectedPresentation2.id
            );

            setComparisonData(response);
            await loadComparisonHistory();
        } catch (error) {
            console.error('발표 비교 실패:', error);
            setError(error.message || '발표 비교에 실패했습니다.');
        } finally {
            setIsComparing(false);
        }
    };

    const handleNewComparison = () => {
        setSelectedPresentation1(null);
        setSelectedPresentation2(null);
        setComparisonData(null);
        resetError();
    };

    const handleSelectTopic = async (topic) => {
        setSelectedTopic(topic);
        setSelectedPresentation1(null);
        setSelectedPresentation2(null);
        setComparisonData(null);
        resetError();
        
        if (topic && topic.id) {
            const result = await topicService.getPresentations(topic.id);
            if (result.success && result.data) {
                const presentations = (result.data || []).sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB - dateA;
                });
                
                setTopicPresentations(presentations);
                
                if (presentations.length >= 2) {
                    const pres1 = presentations[0];
                    const pres2 = presentations[1];
                    
                    setSelectedPresentation1(pres1);
                    setSelectedPresentation2(pres2);
                    
                    setSuccess(`최신 발표 2개가 선택되었습니다. "발표 비교하기" 버튼을 눌러주세요.`);
                    setTimeout(() => setSuccess(''), 4000);
                } else if (presentations.length === 1) {
                    setSelectedPresentation1(presentations[0]);
                    setError('발표가 1개만 있습니다. 비교를 위해 발표를 하나 더 추가해주세요.');
                } else {
                    setError('이 토픽에는 발표가 없습니다. 발표를 먼저 추가해주세요.');
                }
            } else {
                setTopicPresentations([]);
            }
        } else {
            setTopicPresentations([]);
        }
    };

    const handleViewComparison = (comparison) => {
        setComparisonData(comparison);
        
        if (comparison.presentation1 && comparison.presentation2) {
            setSelectedPresentation1({
                id: comparison.presentation1.id,
                title: comparison.presentation1.title,
                createdAt: comparison.presentation1.createdAt
            });
            setSelectedPresentation2({
                id: comparison.presentation2.id,
                title: comparison.presentation2.title,
                createdAt: comparison.presentation2.createdAt
            });
        }
    };

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            position: 'relative',
            background: '#f5f5f5',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            <Navbar 
                isCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                showSidebarToggle={true}
            />

            <CollapsibleSidebar 
                isCollapsed={isSidebarCollapsed}
            />

            <div style={{
                marginLeft: isSidebarCollapsed ? 0 : 427,
                marginTop: 70,
                minHeight: 'calc(100vh - 70px)',
                transition: 'margin-left 0.3s ease-in-out',
                padding: '30px 20px',
                width: isSidebarCollapsed ? '100%' : 'calc(100% - 427px)',
                position: 'relative',
                zIndex: 1,
                boxSizing: 'border-box'
            }}>
                <div style={{
                    marginBottom: '30px'
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#000000',
                        margin: '0 0 10px 0',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        발표 비교
                    </h1>
                    <p style={{
                        fontSize: '16px',
                        color: '#666666',
                        margin: 0,
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        토픽을 선택하면 자동으로 최신 2개 발표가 선택됩니다
                    </p>
                </div>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ marginBottom: '20px' }}
                        onClose={resetError}
                    >
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert 
                        severity="success" 
                        sx={{ marginBottom: '20px' }}
                        onClose={() => setSuccess('')}
                    >
                        {success}
                    </Alert>
                )}

                {loading && (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                    </Box>
                )}

                {!loading && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        gap: '20px',
                        width: '100%',
                        maxWidth: '100%'
                    }}>
                        <div style={{ width: '380px', flexShrink: 0 }}>
                            <Paper sx={{ p: 3, marginBottom: '20px' }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
                                    토픽 선택
                                </Typography>
                                
                                <Typography variant="subtitle2" gutterBottom sx={{ color: '#666', mb: 2 }}>
                                    비교할 토픽을 선택하세요
                                </Typography>
                                <PresentationSelector
                                    presentations={topics.map(topic => {
                                        let teamInfo = '';
                                        if (topic.isTeamTopic) {
                                            if (topic.teamName) {
                                                teamInfo = `팀: ${topic.teamName}`;
                                            } else if (topic.teamId) {
                                                const team = teams.find(t => t.id === topic.teamId);
                                                teamInfo = team ? `팀: ${team.name}` : '팀';
                                            } else {
                                                teamInfo = '팀';
                                            }
                                        } else {
                                            teamInfo = '개인';
                                        }

                                        const presentationCount = topic.presentationCount !== undefined ? topic.presentationCount : 0;

                                        return {
                                            ...topic,
                                            label: topic.title || topic.name || '제목 없음',
                                            subtitle: `${teamInfo} • 발표 ${presentationCount}/2`
                                        };
                                    })}
                                    selectedPresentation={selectedTopic}
                                    onSelectPresentation={handleSelectTopic}
                                    placeholder="토픽을 선택하세요"
                                    teams={teams}
                                />
                            </Paper>

                            {selectedTopic && (
                                <Paper sx={{ p: 3, marginBottom: '20px' }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
                                        선택된 발표
                                    </Typography>
                                    
                                    {topicPresentations.length < 2 ? (
                                        <Alert severity="warning">
                                            이 토픽에는 {topicPresentations.length}개의 발표만 있습니다. 
                                            비교를 위해서는 최소 2개의 발표가 필요합니다.
                                        </Alert>
                                    ) : (
                                        <>
                                            {selectedPresentation1 && (
                                                <Box sx={{ 
                                                    mb: 2, 
                                                    p: 2, 
                                                    border: '2px solid #1976d2',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#e3f2fd'
                                                }}>
                                                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: '600', display: 'block', mb: 0.5 }}>
                                                        📹 발표 1 (최신)
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: '600', color: '#000' }}>
                                                        {selectedPresentation1.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#666' }}>
                                                        {new Date(selectedPresentation1.createdAt).toLocaleDateString('ko-KR', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {selectedPresentation2 && (
                                                <Box sx={{ 
                                                    mb: 3, 
                                                    p: 2, 
                                                    border: '2px solid #dc004e',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#fce4ec'
                                                }}>
                                                    <Typography variant="caption" sx={{ color: '#dc004e', fontWeight: '600', display: 'block', mb: 0.5 }}>
                                                        📹 발표 2
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: '600', color: '#000' }}>
                                                        {selectedPresentation2.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#666' }}>
                                                        {new Date(selectedPresentation2.createdAt).toLocaleDateString('ko-KR', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Button
                                                variant="contained"
                                                startIcon={isComparing ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <CompareIcon />}
                                                onClick={handleCompare}
                                                disabled={!selectedPresentation1 || !selectedPresentation2 || isComparing}
                                                fullWidth
                                                sx={{
                                                    backgroundColor: '#1976d2',
                                                    padding: '14px 24px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                                                    '&:hover': {
                                                        backgroundColor: '#1565c0',
                                                        boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                                                        transform: 'translateY(-2px)'
                                                    },
                                                    '&:disabled': {
                                                        backgroundColor: '#e0e0e0'
                                                    },
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {isComparing ? '비교 분석 중...' : '🔍 두 발표 비교하기'}
                                            </Button>
                                        </>
                                    )}
                                </Paper>
                            )}

                            {comparisonHistory.length > 0 && (
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
                                        최근 비교 기록
                                    </Typography>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {comparisonHistory.map((comparison, index) => (
                                            <div
                                                key={comparison.id || index}
                                                onClick={() => handleViewComparison(comparison)}
                                                style={{
                                                    padding: '12px',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: '8px',
                                                    marginBottom: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s ease',
                                                    backgroundColor: comparisonData?.id === comparison.id ? '#e3f2fd' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (comparisonData?.id !== comparison.id) {
                                                        e.target.style.backgroundColor = '#f5f5f5';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (comparisonData?.id !== comparison.id) {
                                                        e.target.style.backgroundColor = 'transparent';
                                                    }
                                                }}
                                            >
                                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                                    {comparison.presentation1?.title || '발표 1'} vs {comparison.presentation2?.title || '발표 2'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Paper>
                            )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0, maxWidth: '900px' }}>
                            {comparisonData ? (
                                <Paper sx={{ p: 4 }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        marginBottom: '30px'
                                    }}>
                                        <Typography variant="h5" sx={{ fontWeight: '700' }}>
                                            📊 비교 결과
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={handleNewComparison}
                                            size="medium"
                                        >
                                            새 비교
                                        </Button>
                                    </div>

                                    <ComparisonChart 
                                        comparisonData={comparisonData}
                                        presentation1={selectedPresentation1}
                                        presentation2={selectedPresentation2}
                                    />
                                </Paper>
                            ) : (
                                <Paper sx={{ 
                                    p: 6, 
                                    textAlign: 'center',
                                    backgroundColor: '#fafafa',
                                    minHeight: '500px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <CompareIcon sx={{ fontSize: 80, color: '#ccc', marginBottom: '20px' }} />
                                    <Typography variant="h5" color="textSecondary" gutterBottom sx={{ fontWeight: '600' }}>
                                        토픽을 선택해주세요
                                    </Typography>
                                    <Typography variant="body1" color="textSecondary">
                                        토픽을 선택하면 자동으로 최신 2개 발표가 선택됩니다
                                    </Typography>
                                </Paper>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Comparison;

