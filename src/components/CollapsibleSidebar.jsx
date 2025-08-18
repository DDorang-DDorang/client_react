import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import topicService from '../api/topicService';
import videoAnalysisService from '../api/videoAnalysisService';
import TopicCreator from './TopicCreator';
import TopicManager from './TopicManager';
import PresentationManager from './PresentationManager';
import VideoPlayer from './VideoPlayer';
import HexagonChart from './HexagonChart';
import { setTopics, setPresentations, setCurrentTopic, setLoading, setError, updateTopic, deleteTopic, updatePresentation, deletePresentation } from '../store/slices/topicSlice';

const CollapsibleSidebar = ({ isCollapsed, refreshKey }) => {
    const navigate = useNavigate();
    const user = useSelector(state => state.auth.user);
    const topics = useSelector(state => state.topic.topics);
    const dispatch = useDispatch();
    const [isPrivateExpanded, setIsPrivateExpanded] = useState(true);
    const [isTeamExpanded, setIsTeamExpanded] = useState(true);
    const [expandedTopics, setExpandedTopics] = useState(new Set());
    const [showTopicCreator, setShowTopicCreator] = useState(false);
    const [analysisResults, setAnalysisResults] = useState({});
    const [topicPresentations, setTopicPresentations] = useState({});

    // 관리 모달 상태
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [showPresentationManager, setShowPresentationManager] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedPresentation, setSelectedPresentation] = useState(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    const presentations = useSelector(state => state.topic.presentations);
    const currentTopic = useSelector(state => state.topic.currentTopic);

    // 컴포넌트 마운트 시 토픽 목록 로드
    useEffect(() => {
        // user가 null이 아니고, 식별자가 있을 때만 호출
        if (user && (user.userId || user.id || user.email)) {
            loadTopics();
        }
    }, [user]);

    useEffect(() => {
        if (currentTopic) {
            loadPresentations(currentTopic.id);
        }
    }, [refreshKey]);

    const loadTopics = async () => {
        if (!user || !(user.userId || user.id || user.email)) {
            console.warn('사용자 정보가 없어 토픽을 로드할 수 없습니다.', user);
            return;
        }
        const userIdentifier = user.userId || user.id || user.email;
        console.log('userIdentifier:', userIdentifier);

        dispatch(setLoading(true));
        try {
            const result = await topicService.getTopics(userIdentifier);
            if (result.success) {
                dispatch(setTopics(result.data));
                
                // 로컬 데이터 사용 시 알림
                if (result.isLocal) {
                    console.log('로컬 토픽 데이터 사용 중');
                }
            } else {
                dispatch(setError(result.error));
            }
        } catch (error) {
            dispatch(setError('토픽을 불러오는 중 오류가 발생했습니다.'));
            console.error('Load topics error:', error);
        } finally {
            dispatch(setLoading(false));
        }
    };

    const loadPresentations = async (topicId) => {
        try {
            console.log('Loading presentations for topic:', topicId);
            const result = await topicService.getPresentations(topicId);
            if (result.success) {
                console.log('Presentations loaded:', result.data);
                
                // 토픽별 프레젠테이션 상태 업데이트
                setTopicPresentations(prev => ({
                    ...prev,
                    [topicId]: result.data
                }));
                
                // Redux store도 업데이트 (기존 호환성 유지)
                dispatch(setPresentations(result.data));
                
                // 각 프레젠테이션의 분석 결과 로드
                for (const presentation of result.data) {
                    loadAnalysisResults(presentation.id);
                }
            } else {
                console.error('Failed to load presentations:', result.error);
                // 실패 시 빈 배열로 설정
                setTopicPresentations(prev => ({
                    ...prev,
                    [topicId]: []
                }));
                dispatch(setPresentations([]));
            }
        } catch (error) {
            console.error('Load presentations error:', error);
            // 에러 시 빈 배열로 설정
            setTopicPresentations(prev => ({
                ...prev,
                [topicId]: []
            }));
            dispatch(setPresentations([]));
        }
    };

    // 점수 계산 헬퍼 함수들 (VideoAnalysis 페이지와 동일)
    const calculateScore = (grade) => {
        if (!grade) return 75;
        
        const gradeScores = {
            'A+': 100, 'A': 95, 'A-': 90,
            'B+': 85, 'B': 80, 'B-': 75,
            'C+': 70, 'C': 65, 'C-': 60,
            'D+': 55, 'D': 50, 'D-': 45,
            'F': 0
        };
        
        return gradeScores[grade] || 75;
    };

    const calculateVoiceScore = (data) => {
        if (!data.intensityGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 50 };
        return gradeMap[data.intensityGrade] || 75;
    };

    const calculateSpeedScore = (data) => {
        if (!data.wpmGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 50 };
        return gradeMap[data.wpmGrade] || 75;
    };

    const calculatePitchScore = (data) => {
        if (!data.pitchGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 50 };
        return gradeMap[data.pitchGrade] || 75;
    };

    const calculateClarityScore = (data) => {
        if (!data.pronunciationScore) return 75;
        return Math.round(data.pronunciationScore * 100);
    };

    // Spring Boot 데이터를 표시 형식으로 변환
    const convertSpringBootDataToDisplayFormat = (data) => {
        if (!data) {
            return null;
        }

        // Spring Boot 응답 데이터 변환
        const fastApiData = {
            intensityGrade: data.voiceAnalysis?.intensityGrade || '보통',
            intensityDb: data.voiceAnalysis?.intensityDb,
            intensityText: data.voiceAnalysis?.intensityText || '음성 강도가 적절합니다.',
            pitchGrade: data.voiceAnalysis?.pitchGrade || '좋음',
            pitchAvg: data.voiceAnalysis?.pitchAvg,
            pitchText: data.voiceAnalysis?.pitchText || '피치 변화가 자연스럽습니다.',
            wpmGrade: data.voiceAnalysis?.wpmGrade || '보통',
            wpmAvg: data.voiceAnalysis?.wpmAvg,
            wpmComment: data.voiceAnalysis?.wpmComment || '말하기 속도가 적당합니다.',
            transcription: data.sttResult?.transcription || '',
            pronunciationScore: data.sttResult?.pronunciationScore || 0.75
        };

        // 점수 계산
        const scores = {
            voice: calculateVoiceScore(fastApiData),
            speed: calculateSpeedScore(fastApiData),
            anxiety: 75,
            eyeContact: 75,
            pitch: calculatePitchScore(fastApiData),
            clarity: calculateClarityScore(fastApiData)
        };

        return { scores };
    };

    const loadAnalysisResults = async (presentationId) => {
        try {
            const hasResults = await videoAnalysisService.hasAnalysisResults(presentationId);
            if (hasResults.success && hasResults.data.hasResults) {
                const analysisData = await videoAnalysisService.getAllAnalysisResults(presentationId);
                if (analysisData.success) {
                    console.log('Sidebar - Analysis data loaded for:', presentationId, analysisData.data);
                    
                    // 데이터를 표시 형식으로 변환
                    const convertedData = convertSpringBootDataToDisplayFormat(analysisData.data);
                    
                    setAnalysisResults(prev => ({
                        ...prev,
                        [presentationId]: convertedData
                    }));
                }
            }
        } catch (error) {
            console.error('Load analysis results error:', error);
        }
    };

    const handleTopicClick = async (topic) => {
        // 토픽을 클릭하면 항상 확장되도록 수정
        const newExpandedTopics = new Set(expandedTopics);
        newExpandedTopics.add(topic.id);
        setExpandedTopics(newExpandedTopics);
        
        // 현재 토픽 설정
        dispatch(setCurrentTopic(topic));
        
        // 프레젠테이션 목록 로드 (이미 로드된 경우가 아니라면)
        if (!topicPresentations[topic.id]) {
            try {
                await loadPresentations(topic.id);
            } catch (error) {
                console.error('프레젠테이션 로드 실패:', error);
            }
        }
    };

    const handleTopicToggle = async (e, topicId) => {
        e.stopPropagation(); // 부모 클릭 이벤트 방지
        
        // 토픽 확장/축소 토글
        const newExpandedTopics = new Set(expandedTopics);
        if (newExpandedTopics.has(topicId)) {
            newExpandedTopics.delete(topicId);
        } else {
            newExpandedTopics.add(topicId);
            // 토픽이 확장될 때 프레젠테이션 목록 로드
            const topic = topics.find(t => t.id === topicId);
            if (topic) {
                dispatch(setCurrentTopic(topic));
                try {
                    await loadPresentations(topicId);
                } catch (error) {
                    console.error('프레젠테이션 로드 실패:', error);
                }
            }
        }
        setExpandedTopics(newExpandedTopics);
    };

    const handlePresentationClick = async (presentation) => {
        console.log('프레젠테이션 클릭:', presentation);
        
        // 분석 결과가 있는지 확인
        try {
            const hasResults = await videoAnalysisService.hasAnalysisResults(presentation.id);
            
            if (hasResults.success && hasResults.data.hasResults) {
                // 분석 결과가 있으면 분석 페이지로 이동
                navigate(`/video-analysis/${presentation.id}`, {
                    state: {
                        presentationData: presentation,
                        topicData: currentTopic
                    }
                });
            } else {
                // 분석 결과가 없으면 비디오 플레이어로 재생
                setSelectedPresentation(presentation);
                setShowVideoPlayer(true);
            }
        } catch (error) {
            console.error('분석 결과 확인 실패:', error);
            // 에러 발생 시 기본적으로 비디오 플레이어로 재생
            setSelectedPresentation(presentation);
            setShowVideoPlayer(true);
        }
    };

    const handleTopicCreated = (newTopic) => {
        // 새로 생성된 토픽을 현재 토픽으로 설정
        dispatch(setCurrentTopic(newTopic));
        // 토픽이 개인 토픽이므로 Private Topics 섹션을 확장
        setIsPrivateExpanded(true);
    };

    // 토픽 관리 관련 핸들러
    const handleTopicRightClick = (e, topic) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedTopic(topic);
        setShowTopicManager(true);
    };

    const handleTopicUpdated = (updatedTopic) => {
        dispatch(updateTopic(updatedTopic.id, updatedTopic));
        setSelectedTopic(updatedTopic);
        // 토픽 목록 새로고침
        loadTopics();
    };

    const handleTopicDeleted = (topicId) => {
        dispatch(deleteTopic(topicId));
        setSelectedTopic(null);
        setShowTopicManager(false);
        // 현재 선택된 토픽이 삭제된 경우 선택 해제
        if (currentTopic?.id === topicId) {
            dispatch(setCurrentTopic(null));
        }
    };

    // 프레젠테이션 관리 관련 핸들러
    const handlePresentationRightClick = (e, presentation) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedPresentation(presentation);
        setShowPresentationManager(true);
    };

    const handlePresentationUpdated = (updatedPresentation) => {
        dispatch(updatePresentation(updatedPresentation.id, updatedPresentation));
        setSelectedPresentation(updatedPresentation);
        // 프레젠테이션 목록 새로고침
        if (currentTopic) {
            loadPresentations(currentTopic.id);
        }
    };

    const handlePresentationDeleted = (presentationId) => {
        dispatch(deletePresentation(presentationId));
        setSelectedPresentation(null);
        setShowPresentationManager(false);
        // 토픽별 프레젠테이션 상태에서도 제거
        if (currentTopic) {
            setTopicPresentations(prev => ({
                ...prev,
                [currentTopic.id]: prev[currentTopic.id]?.filter(p => p.id !== presentationId) || []
            }));
        }
    };

    const handlePlayPresentation = (presentation) => {
        handlePresentationClick(presentation);
    };

    const handleCreatePresentation = (topicId) => {
        // Dashboard로 이동하여 녹화/업로드 준비
        const topic = topics.find(t => t.id === topicId);
        dispatch(setCurrentTopic(topic));
        navigate('/dashboard', { 
            state: { 
                selectedTopic: topic,
                action: 'create'
            } 
        });
    };

    // 개인 토픽 필터링
    const privateTopics = topics.filter(topic => !topic.isTeamTopic);
    
    // 팀 토픽 필터링
    const teamTopics = topics.filter(topic => topic.isTeamTopic);

    // Redux에서는 selector 함수로 직접 구현
    const getPresentationsByTopic = (presentations, topicId) => {
        return presentations.filter(presentation => presentation.topicId === topicId);
    };

    const renderTopicItems = (topicList) => {
        return topicList.map((topic) => {
            // 토픽별 프레젠테이션 상태에서 가져오기
            const presentationsForTopic = topicPresentations[topic.id] || [];
            const isExpanded = expandedTopics.has(topic.id);
            
            return (
                <div key={topic.id} style={{ marginBottom: '4px' }}>
                    {/* 토픽 항목 */}
                    <div
                        onClick={() => handleTopicClick(topic)}
                        onContextMenu={(e) => handleTopicRightClick(e, topic)}
                        style={{
                            width: '100%',
                            minHeight: '44px',
                            paddingLeft: '32px',
                            paddingRight: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            borderRadius: '8px',
                            margin: '2px 8px',
                            backgroundColor: currentTopic?.id === topic.id ? '#e3f2fd' : 'transparent',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                            if (currentTopic?.id !== topic.id) {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentTopic?.id !== topic.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                        title="우클릭으로 토픽 관리"
                    >
                        {/* 폴더 아이콘 */}
                        <div style={{
                            fontSize: '16px',
                            transition: 'transform 0.2s ease'
                        }}>
                            📁
                        </div>

                        {/* 토픽 이름 */}
                        <div style={{
                            color: '#000000',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: '500',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {topic.title}
                        </div>

                        {/* 프레젠테이션 개수 */}
                        <div style={{
                            fontSize: '12px',
                            color: '#666666',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '10px',
                            padding: '2px 6px',
                            minWidth: '20px',
                            textAlign: 'center'
                        }}>
                            {topic.presentationCount || 0}
                        </div>

                        {/* 확장/축소 아이콘 */}
                        <div 
                            onClick={(e) => handleTopicToggle(e, topic.id)}
                            style={{
                                fontSize: '12px',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                color: '#999999',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="클릭으로 펼치기/접기"
                        >
                            ▶
                        </div>
                    </div>

                    {/* 프레젠테이션 목록 */}
                    {isExpanded && (
                        <div style={{
                            paddingLeft: '24px',
                            marginTop: '4px'
                        }}>
                            {presentationsForTopic.length > 0 ? (
                                presentationsForTopic.map((presentation) => {
                                    const analysisData = analysisResults[presentation.id];
                                    // 실제 분석 데이터가 있을 때만 육각형 표시
                                    const hasAnalysis = !!analysisData && !!analysisData.scores;
                                    
                                    return (
                                        <div
                                            key={presentation.id}
                                            onClick={() => handlePresentationClick(presentation)}
                                            onContextMenu={(e) => handlePresentationRightClick(e, presentation)}
                                            style={{
                                                paddingLeft: '30px',
                                                paddingRight: '30px',
                                                paddingTop: '25px',
                                                paddingBottom: '25px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '20px',
                                                cursor: 'pointer',
                                                borderRadius: '15px',
                                                margin: '8px 8px',
                                                transition: 'background-color 0.2s ease',
                                                border: '2px solid #f0f0f0',
                                                minHeight: '220px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f9f9f9';
                                                e.currentTarget.style.borderColor = '#e0e0e0';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.borderColor = '#f0f0f0';
                                            }}
                                            title="우클릭으로 프레젠테이션 관리"
                                        >
                                            {/* 상단: 아이콘 + 제목 */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                {/* 프레젠테이션 아이콘 */}
                                                <div style={{ fontSize: '14px' }}>
                                                    {presentation.videoUrl ? '🎥' : '📄'}
                                                </div>

                                                {/* 프레젠테이션 제목 */}
                                                <div style={{
                                                    color: '#333333',
                                                    fontSize: '15px',
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontWeight: '600',
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {presentation.title}
                                                </div>
                                            </div>

                                            {/* 하단: 썸네일 + 분석 그래프 (영상이 있을 때) */}
                                            {presentation.videoUrl && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center'
                                                }}>
                                                    {/* 비디오 썸네일 */}
                                                    <div style={{
                                                        width: '200px',
                                                        height: '150px',
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e9ecef',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <video 
                                                            src={presentation.videoUrl}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px'
                                                            }}
                                                            muted
                                                            preload="metadata"
                                                            onLoadedMetadata={(e) => {
                                                                e.target.currentTime = 1; // 1초 지점의 프레임
                                                            }}
                                                            onError={(e) => {
                                                                // 비디오 로드 실패 시 기본 썸네일 표시
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                        {/* 비디오 로드 실패 시 대체 썸네일 */}
                                                        <div style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            backgroundColor: '#333',
                                                            display: 'none',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: '20px',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0
                                                        }}>
                                                            ▶
                                                        </div>
                                                        {/* 재생 오버레이 아이콘 */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                            borderRadius: '50%',
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: '18px'
                                                        }}>
                                                            ▶
                                                        </div>
                                                    </div>

                                                    {/* 미니 육각형 차트 또는 분석 대기 상태 */}
                                                    <div style={{
                                                        width: '180px',
                                                        height: '180px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto'
                                                    }}>
                                                        {hasAnalysis ? (
                                                            <HexagonChart
                                                                data={analysisData.scores}
                                                                size={180}
                                                                showLabels={false}
                                                                showGrid={false}
                                                                isPreview={true}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                fontSize: '16px',
                                                                color: '#999',
                                                                textAlign: 'center',
                                                                lineHeight: '1.3',
                                                                fontWeight: '500'
                                                            }}>
                                                                분석<br/>대기중
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    );
                                })
                            ) : (
                                <div
                                    onClick={() => handleCreatePresentation(topic.id)}
                                    style={{
                                        paddingLeft: '32px',
                                        paddingRight: '16px',
                                        paddingTop: '8px',
                                        paddingBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        margin: '1px 8px',
                                        color: '#666666',
                                        fontSize: '13px',
                                        fontStyle: 'italic',
                                        border: '1px dashed #cccccc',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0f8ff';
                                        e.currentTarget.style.borderColor = '#007bff';
                                        e.currentTarget.style.color = '#007bff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.borderColor = '#cccccc';
                                        e.currentTarget.style.color = '#666666';
                                    }}
                                >
                                    <div style={{ fontSize: '14px' }}>+</div>
                                    <div>새 프레젠테이션 만들기</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div style={{
            position: 'fixed',
            left: isCollapsed ? -427 : 0,
            top: 0,
            width: 427,
            height: '100vh',
            background: '#ffffff',
            transition: 'left 0.3s ease-in-out',
            zIndex: 999,
            borderRight: isCollapsed ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: isCollapsed ? 'none' : '2px 0px 8px rgba(0, 0, 0, 0.1)',
            overflowY: 'auto'
        }}>
            {/* Top spacing for navbar area */}
            <div style={{ height: '70px' }}></div>

            {/* Private Section */}
            <div style={{
                margin: '20px 16px 16px 16px'
            }}>
                {/* Private Header */}
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s ease',
                        userSelect: 'none'
                    }}
                >
                    <div 
                        onClick={() => setIsPrivateExpanded(!isPrivateExpanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                        }}
                    >
                        <div style={{
                            fontSize: '16px',
                            transform: isPrivateExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}>
                            ▶
                        </div>
                        <div style={{
                            color: '#000000',
                            fontSize: '20px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: '700'
                        }}>
                            Private Topics ({privateTopics.length})
                        </div>
                    </div>
                    
                    {/* 토픽 생성 버튼 */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTopicCreator(true);
                        }}
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#007bff',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginLeft: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#0056b3';
                            e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#007bff';
                            e.target.style.transform = 'scale(1)';
                        }}
                        title="새 토픽 만들기"
                    >
                        +
                    </div>
                </div>

                {/* Private Items */}
                {isPrivateExpanded && (
                    <div style={{
                        marginTop: '8px',
                        paddingLeft: '8px'
                    }}>
                        {renderTopicItems(privateTopics)}
                    </div>
                )}
            </div>

            {/* Team Section */}
            <div style={{
                margin: '20px 16px 16px 16px'
            }}>
                {/* Team Header */}
                <div 
                    onClick={() => setIsTeamExpanded(!isTeamExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s ease',
                        userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            fontSize: '16px',
                            transform: isTeamExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}>
                            ▶
                        </div>
                        <div style={{
                            color: '#000000',
                            fontSize: '20px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: '700'
                        }}>
                            Team Topics ({teamTopics.length})
                        </div>
                    </div>
                </div>

                {/* Team Items */}
                {isTeamExpanded && (
                    <div style={{
                        marginTop: '8px',
                        paddingLeft: '8px'
                    }}>
                        {renderTopicItems(teamTopics)}
                    </div>
                )}
            </div>
            
            {/* Topic Creator Modal */}
            <TopicCreator
                open={showTopicCreator}
                onClose={() => setShowTopicCreator(false)}
                onTopicCreated={handleTopicCreated}
            />

            {/* Topic Manager Modal */}
            <TopicManager
                open={showTopicManager}
                onClose={() => setShowTopicManager(false)}
                topic={selectedTopic}
                onTopicUpdated={handleTopicUpdated}
                onTopicDeleted={handleTopicDeleted}
            />

            {/* Presentation Manager Modal */}
            <PresentationManager
                open={showPresentationManager}
                onClose={() => setShowPresentationManager(false)}
                presentation={selectedPresentation}
                onPresentationUpdated={handlePresentationUpdated}
                onPresentationDeleted={handlePresentationDeleted}
                onPlayPresentation={handlePlayPresentation}
            />

            {/* Video Player Modal */}
            <VideoPlayer
                open={showVideoPlayer}
                onClose={() => setShowVideoPlayer(false)}
                presentation={selectedPresentation}
            />
        </div>
    );
};

export default CollapsibleSidebar; 