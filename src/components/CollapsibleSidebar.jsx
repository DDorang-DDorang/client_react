import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopicStore } from '../store/topicStore';
import { useUserStore } from '../store/userStore';
import topicService from '../api/topicService';
import videoAnalysisService from '../api/videoAnalysisService';
import TopicCreator from './TopicCreator';
import TopicManager from './TopicManager';
import PresentationManager from './PresentationManager';
import VideoPlayer from './VideoPlayer';

const CollapsibleSidebar = ({ isCollapsed }) => {
    const navigate = useNavigate();
    const { user } = useUserStore();
    const [isPrivateExpanded, setIsPrivateExpanded] = useState(true);
    const [isTeamExpanded, setIsTeamExpanded] = useState(true);
    const [expandedTopics, setExpandedTopics] = useState(new Set());
    const [showTopicCreator, setShowTopicCreator] = useState(false);

    // 관리 모달 상태
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [showPresentationManager, setShowPresentationManager] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedPresentation, setSelectedPresentation] = useState(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    const {
        topics,
        presentations,
        currentTopic,
        setTopics,
        setPresentations,
        setCurrentTopic,
        getPresentationsByTopic,
        setLoading,
        setError,
        updateTopic,
        deleteTopic,
        updatePresentation,
        deletePresentation
    } = useTopicStore();

    // 컴포넌트 마운트 시 토픽 목록 로드
    useEffect(() => {
        if (user && user.id) {
            loadTopics();
        }
    }, [user]);

    const loadTopics = async () => {
        if (!user || !user.id) {
            console.warn('사용자 정보가 없어 토픽을 로드할 수 없습니다.');
            return;
        }

        setLoading(true);
        try {
            // 사용자 식별자 결정
            const userIdentifier = user.userId || user.id || user.email;
            
            const result = await topicService.getTopics(userIdentifier);
            if (result.success) {
                setTopics(result.data);
                
                // 로컬 데이터 사용 시 알림
                if (result.isLocal) {
                    console.log('로컬 토픽 데이터 사용 중');
                }
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('토픽을 불러오는 중 오류가 발생했습니다.');
            console.error('Load topics error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPresentations = async (topicId) => {
        try {
            const result = await topicService.getPresentations(topicId);
            if (result.success) {
                setPresentations(result.data);
            }
        } catch (error) {
            console.error('Load presentations error:', error);
        }
    };

    const handleTopicClick = async (topic) => {
        setCurrentTopic(topic);
        
        // 토픽을 클릭하면 항상 확장되도록 수정
        const newExpandedTopics = new Set(expandedTopics);
        newExpandedTopics.add(topic.id);
        setExpandedTopics(newExpandedTopics);
        
        await loadPresentations(topic.id);
    };

    const handleTopicToggle = (e, topicId) => {
        e.stopPropagation(); // 부모 클릭 이벤트 방지
        
        // 토픽 확장/축소 토글
        const newExpandedTopics = new Set(expandedTopics);
        if (newExpandedTopics.has(topicId)) {
            newExpandedTopics.delete(topicId);
        } else {
            newExpandedTopics.add(topicId);
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
        setCurrentTopic(newTopic);
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
        updateTopic(updatedTopic.id, updatedTopic);
        setSelectedTopic(updatedTopic);
        // 토픽 목록 새로고침
        loadTopics();
    };

    const handleTopicDeleted = (topicId) => {
        deleteTopic(topicId);
        setSelectedTopic(null);
        setShowTopicManager(false);
        // 현재 선택된 토픽이 삭제된 경우 선택 해제
        if (currentTopic?.id === topicId) {
            setCurrentTopic(null);
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
        updatePresentation(updatedPresentation.id, updatedPresentation);
        setSelectedPresentation(updatedPresentation);
        // 프레젠테이션 목록 새로고침
        if (currentTopic) {
            loadPresentations(currentTopic.id);
        }
    };

    const handlePresentationDeleted = (presentationId) => {
        deletePresentation(presentationId);
        setSelectedPresentation(null);
        setShowPresentationManager(false);
    };

    const handlePlayPresentation = (presentation) => {
        handlePresentationClick(presentation);
    };

    const handleCreatePresentation = (topicId) => {
        // Dashboard로 이동하여 녹화/업로드 준비
        const topic = topics.find(t => t.id === topicId);
        setCurrentTopic(topic);
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

    const renderTopicItems = (topicList) => {
        return topicList.map((topic) => {
            const topicPresentations = getPresentationsByTopic(topic.id);
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
                            {topicPresentations.length > 0 ? (
                                topicPresentations.map((presentation) => (
                                    <div
                                        key={presentation.id}
                                        onClick={() => handlePresentationClick(presentation)}
                                        onContextMenu={(e) => handlePresentationRightClick(e, presentation)}
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
                                            transition: 'background-color 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#f9f9f9';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                        title="우클릭으로 프레젠테이션 관리"
                                    >
                                        {/* 프레젠테이션 아이콘 */}
                                        <div style={{ fontSize: '14px' }}>
                                            {presentation.videoUrl ? '🎥' : '📄'}
                                        </div>

                                        {/* 프레젠테이션 제목 */}
                                        <div style={{
                                            color: '#333333',
                                            fontSize: '13px',
                                            fontFamily: 'Inter, sans-serif',
                                            fontWeight: '400',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {presentation.title}
                                        </div>
                                    </div>
                                ))
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