import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import topicService from '../api/topicService';
import videoAnalysisService from '../api/videoAnalysisService';
import TopicCreator from './TopicCreator';
import TopicManager from './TopicManager';
import PresentationManager from './PresentationManager';
import VideoPlayer from './VideoPlayer';
import PentagonChart from './PentagonChart';
import PresentationOptionsModal from './PresentationOptionsModal';
import TeamCreator from './team/TeamCreator';
import TeamJoin from './team/TeamJoin';
import TeamInvite from './team/TeamInvite';
import { setTopics, setPresentations, setCurrentTopic, setLoading, setError, updateTopic, deleteTopic, updatePresentation, deletePresentation, addTopic } from '../store/slices/topicSlice';
import { fetchUserTeams, createTeam, joinTeamByInvite } from '../store/slices/teamSlice';

const CollapsibleSidebar = ({ isCollapsed, refreshKey }) => {
    const navigate = useNavigate();
    const user = useSelector(state => state.auth.user);
    const topics = useSelector(state => state.topic.topics) || [];
    const dispatch = useDispatch();
    const [isPrivateExpanded, setIsPrivateExpanded] = useState(true);
    const [isTeamExpanded, setIsTeamExpanded] = useState(true);
    const [expandedTopics, setExpandedTopics] = useState(new Set());
    const [expandedTeams, setExpandedTeams] = useState(new Set()); // 팀별 확장 상태
    const [showTopicCreator, setShowTopicCreator] = useState(false);
    const [showTeamCreator, setShowTeamCreator] = useState(false);
    const [showTeamJoin, setShowTeamJoin] = useState(false);
    const [showTeamInvite, setShowTeamInvite] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showTeamTopicCreator, setShowTeamTopicCreator] = useState(false);
    const [teamForTopicCreation, setTeamForTopicCreation] = useState(null);
    const [analysisResults, setAnalysisResults] = useState({});
    const [topicPresentations, setTopicPresentations] = useState({});

    // 관리 모달 상태
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [showPresentationManager, setShowPresentationManager] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedPresentation, setSelectedPresentation] = useState(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showPresentationOptions, setShowPresentationOptions] = useState(false);
    const [selectedPresentationForOptions, setSelectedPresentationForOptions] = useState(null);

    const presentations = useSelector(state => state.topic.presentations);
    const currentTopic = useSelector(state => state.topic.currentTopic);
    const { teams = [] } = useSelector(state => state.team);
    const { notifications } = useSelector(state => state.notification);

    // 개인 토픽 필터링
    const privateTopics = Array.isArray(topics) ? topics.filter(topic => !topic.isTeamTopic) : [];
    
    // 팀 토픽 필터링
    const teamTopics = Array.isArray(topics) ? topics.filter(topic => topic.isTeamTopic) : [];
    
    // 디버깅 로그 추가
    useEffect(() => {
        console.log('토픽 상태 업데이트:');
        console.log('전체 토픽:', topics.length, '개');
        console.log('개인 토픽:', privateTopics.length, '개');
        console.log('팀 토픽:', teamTopics.length, '개');
        console.log('개인 토픽 목록:', privateTopics.map(t => ({ id: t.id, title: t.title || t.name, isTeamTopic: t.isTeamTopic })));
        console.log('팀 토픽 목록:', teamTopics.map(t => ({ id: t.id, title: t.title || t.name, isTeamTopic: t.isTeamTopic, teamId: t.teamId })));
    }, [topics, privateTopics.length, teamTopics.length]);
    
    // 컴포넌트 마운트 시 토픽 목록과 팀 목록 로드
    useEffect(() => {
        // user가 null이 아니고, 식별자가 있을 때만 호출
        if (user && (user.userId || user.id || user.email)) {
            loadTopics();
            loadTeams();
        }
    }, [user]);
    
    // 팀 토픽 생성 후 상태 변화 감지 (한 번만 실행)
    useEffect(() => {
        if (teamTopics.length > 0) {
            console.log('팀 토픽 상태 변화 감지:', teamTopics.length, '개');
            // teamId가 없는 팀 토픽들만 로그로 표시
            const topicsWithoutTeamId = teamTopics.filter(topic => !topic.teamId);
            if (topicsWithoutTeamId.length > 0) {
                console.warn(`${topicsWithoutTeamId.length}개의 팀 토픽에 teamId가 없습니다:`, 
                    topicsWithoutTeamId.map(t => t.title));
            }
        }
    }, [teamTopics.length]); // teamTopics.length만 의존성으로 사용

    useEffect(() => {
        // refreshKey가 변경되면 모든 토픽의 발표 목록 새로고침
        if (refreshKey > 0) {
            topics.forEach(topic => {
                loadPresentations(topic.id);
            });
        }
    }, [refreshKey]);

    // 알림이 새로 오면 프레젠테이션 목록 새로고침
    const lastNotificationRef = useRef(null);
    useEffect(() => {
        if (notifications && notifications.length > 0) {
            const latestNotification = notifications[0];
            const latestId = latestNotification.notificationId || latestNotification.id;
            
            // 새 알림인지 확인
            if (lastNotificationRef.current !== latestId) {
                console.log('🔔 새 알림 감지 - 프레젠테이션 목록 새로고침');
                // 초기 로드가 아니면 새로고침
                if (lastNotificationRef.current !== null) {
                    topics.forEach(topic => {
                        loadPresentations(topic.id);
                    });
                }
                lastNotificationRef.current = latestId;
            }
        }
    }, [notifications]); // notifications 배열 변경 감지

    // 주기적으로 프레젠테이션 목록 새로고침 (분석 상태 업데이트)
    useEffect(() => {
        if (!user) return;

        const refreshPresentations = () => {
            console.log('🔄 주기적으로 프레젠테이션 목록 새로고침');
            topics.forEach(topic => {
                loadPresentations(topic.id);
            });
        };

        // 20초마다 새로고침
        const interval = setInterval(refreshPresentations, 20000);

        return () => clearInterval(interval);
    }, [user, topics.length]); // topics.length 변경 시 재설정

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
                // 서버에서 받은 토픽들을 그대로 사용 (이미 올바른 순서로 정렬됨)
                const serverTopics = result.data || [];
                
                console.log('서버에서 받은 토픽:', serverTopics);
                
                // 서버 데이터를 Redux store에 설정
                dispatch(setTopics(serverTopics));
                
                // 모든 토픽의 발표 개수를 로드 (사이드바 표시용)
                serverTopics.forEach(topic => {
                    loadPresentations(topic.id);
                });
                
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

    const loadTeams = async () => {
        try {
            await dispatch(fetchUserTeams()).unwrap();
        } catch (error) {
            console.error('Load teams error:', error);
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
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'E': 50, 'F': 40 };
        return gradeMap[data.intensityGrade] || 75;
    };

    const calculateSpeedScore = (data) => {
        if (!data.wpmGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'E': 50, 'F': 40 };
        return gradeMap[data.wpmGrade] || 75;
    };

    const calculatePitchScore = (data) => {
        if (!data.pitchGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'E': 50, 'F': 40 };
        return gradeMap[data.pitchGrade] || 75;
    };

    const calculateExpressionScore = (data) => {
        if (!data.expressionGrade) return 75;
        
        // DB에서 가져온 등급을 그대로 사용하여 점수 변환
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'E': 50, 'F': 40 };
        return gradeMap[data.expressionGrade] || 75;
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
            expressionGrade: data.voiceAnalysis?.expressionGrade || '보통',
            expressionText: data.voiceAnalysis?.expressionText || '표정이 자연스럽습니다.',
            transcription: data.sttResult?.transcription || '',
            pronunciationScore: data.sttResult?.pronunciationScore || 0.75
        };

        // 등급 데이터 (PentagonChart에서 사용)
        const grades = {
            voice: fastApiData.intensityGrade,
            speed: fastApiData.wpmGrade,
            expression: fastApiData.expressionGrade,
            pitch: fastApiData.pitchGrade,
            clarity: fastApiData.pronunciationScore ? 
                (fastApiData.pronunciationScore >= 0.8 ? 'A' :
                 fastApiData.pronunciationScore >= 0.6 ? 'B' :
                 fastApiData.pronunciationScore >= 0.4 ? 'C' :
                 fastApiData.pronunciationScore >= 0.2 ? 'D' : 'E') : 'C'
        };

        // 점수 계산 (기존 호환성 유지)
        const scores = {
            voice: calculateVoiceScore(fastApiData),
            speed: calculateSpeedScore(fastApiData),
            expression: calculateExpressionScore(fastApiData),
            pitch: calculatePitchScore(fastApiData),
            clarity: calculateClarityScore(fastApiData)
        };

        return { scores, grades };
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
        // 토픽을 클릭하면 확장/축소 토글
        const newExpandedTopics = new Set(expandedTopics);
        if (newExpandedTopics.has(topic.id)) {
            // 이미 확장되어 있으면 축소
            newExpandedTopics.delete(topic.id);
            setExpandedTopics(newExpandedTopics);
        } else {
            // 확장되어 있지 않으면 확장
            newExpandedTopics.add(topic.id);
            setExpandedTopics(newExpandedTopics);
        }
        
        // 현재 토픽 설정
        dispatch(setCurrentTopic(topic));
        
        // 개인 토픽이든 팀 토픽이든 프레젠테이션 목록 로드 (축소하지 않는 경우에만)
        if (newExpandedTopics.has(topic.id)) {
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
            // 토픽이 확장될 때 프레젠테이션 목록 로드 (모든 토픽에 대해)
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

    // 팀 토글 함수 추가
    const handleTeamToggle = (teamId) => {
        const newExpandedTeams = new Set(expandedTeams);
        if (newExpandedTeams.has(teamId)) {
            newExpandedTeams.delete(teamId);
        } else {
            newExpandedTeams.add(teamId);
        }
        setExpandedTeams(newExpandedTeams);
    };

    const handlePresentationClick = async (presentation) => {
        console.log('프레젠테이션 클릭:', presentation);
        
        // 분석 결과가 있는지 확인
        try {
            const hasResults = await videoAnalysisService.hasAnalysisResults(presentation.id);
            console.log('분석 결과 확인 응답:', hasResults);
            
            if (hasResults.success && hasResults.data && hasResults.data.hasResults) {
                // 분석 결과가 있으면 최신 데이터를 로드한 후 분석 페이지로 이동
                console.log('분석 결과가 있음 - 최신 데이터 로드 후 분석 페이지로 이동');
                await loadLatestAnalysisDataAndNavigate(presentation);
            } else {
                // 분석 결과가 없을 때의 처리
                console.log('분석 결과가 없음 - 옵션 선택');
                
                // 분석 진행 중인지 확인
                const analysisStatus = await checkAnalysisStatus(presentation.id);
                
                if (analysisStatus.isAnalyzing) {
                    // 분석 진행 중이면 진행 상태 페이지로 이동
                    navigate(`/analysis-progress/${presentation.id}`, {
                    state: {
                        presentationData: presentation,
                            topicData: currentTopic,
                            analysisStatus: analysisStatus
                    }
                });
            } else {
                    // 분석이 진행 중이 아니면 옵션 선택 모달 표시
                    showPresentationOptionsModal(presentation);
                }
            }
        } catch (error) {
            console.error('분석 결과 확인 실패:', error);
            // 에러 발생 시 옵션 선택 모달 표시
            showPresentationOptionsModal(presentation);
        }
    };

    // 분석 진행 상태 확인
    const checkAnalysisStatus = async (presentationId) => {
        try {
            // 분석 작업 상태 확인 API 호출
            const response = await fetch(`/api/video-analysis/${presentationId}/status`);
            if (response.ok) {
                const data = await response.json();
                return {
                    isAnalyzing: data.status === 'processing' || data.status === 'pending',
                    status: data.status,
                    progress: data.progress || 0
                };
            }
        } catch (error) {
            console.error('분석 상태 확인 실패:', error);
        }
        return { isAnalyzing: false, status: 'unknown', progress: 0 };
    };

    // 프레젠테이션 옵션 선택 모달 표시
    const showPresentationOptionsModal = (presentation) => {
        setSelectedPresentationForOptions(presentation);
        setShowPresentationOptions(true);
    };

    // 옵션 액션 핸들러들
    const handleVideoPlay = () => {
        setSelectedPresentation(selectedPresentationForOptions);
            setShowVideoPlayer(true);
    };

    const handleAnalyze = () => {
        navigate('/dashboard', {
            state: {
                selectedPresentation: selectedPresentationForOptions,
                action: 'analyze'
            }
        });
    };

    const handleEdit = () => {
        navigate('/dashboard', {
            state: {
                selectedPresentation: selectedPresentationForOptions,
                action: 'edit'
            }
        });
    };

    // 최신 분석 데이터를 로드하고 분석 페이지로 이동
    const loadLatestAnalysisDataAndNavigate = async (presentation) => {
        try {
            console.log('최신 분석 데이터 로드 시작...');
            
            // DB에서 최신 분석 결과 조회
            const result = await videoAnalysisService.getAllAnalysisResults(presentation.id);
            
            if (result.success && result.data) {
                console.log('최신 분석 데이터 로드 성공:', result.data);
                
                // 분석 페이지로 이동하면서 최신 데이터 전달
                navigate(`/video-analysis/${presentation.id}`, {
                    state: {
                        presentationData: presentation,
                        topicData: currentTopic,
                        analysisData: result.data,
                        forceRefresh: true, // 강제 새로고침 플래그
                        timestamp: Date.now()
                    }
                });
            } else {
                console.error('분석 데이터 로드 실패:', result.error);
                // 분석 결과가 없어도 페이지로 이동 (에러 처리)
                navigate(`/video-analysis/${presentation.id}`, {
                    state: {
                        presentationData: presentation,
                        topicData: currentTopic,
                        forceRefresh: true
                    }
                });
            }
        } catch (error) {
            console.error('최신 분석 데이터 로드 중 오류:', error);
            // 에러가 발생해도 페이지로 이동
            navigate(`/video-analysis/${presentation.id}`, {
                state: {
                    presentationData: presentation,
                    topicData: currentTopic,
                    forceRefresh: true
                }
            });
        }
    };

    const handleTopicCreated = (newTopic) => {
        // 새로 생성된 토픽을 현재 토픽으로 설정
        dispatch(setCurrentTopic(newTopic));
        // 토픽이 개인 토픽이므로 Private Topics 섹션을 확장
        setIsPrivateExpanded(true);
        
        // 개인 토픽 생성 후 토픽 목록 새로고침
        setTimeout(() => {
            loadTopics();
        }, 100);
    };



    const handleTeamJoined = async (result) => {
        try {
            // result는 팀 참가 결과이므로 inviteCode가 아님
            // 이미 팀 참가가 완료되었으므로 팀 목록만 새로고침
            setShowTeamJoin(false);
            await loadTeams();
        } catch (error) {
            console.error('팀 참가 후 목록 새로고침 실패:', error);
        }
    };

    // 토픽 관리 관련 핸들러
    const handleTopicRightClick = (e, topic) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedTopic(topic);
        setShowTopicManager(true);
    };

    const handleTopicUpdated = (updatedTopic) => {
        dispatch(updateTopic({ topicId: updatedTopic.id, updates: updatedTopic }));
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
        dispatch(updatePresentation({ presentationId: updatedPresentation.id, updates: updatedPresentation }));
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

    const handleCreateTeamPresentation = (teamId) => {
        console.log('=== 팀 프레젠테이션 생성 버튼 클릭 ===');
        console.log('teamId:', teamId);
        console.log('현재 topics:', topics);
        console.log('현재 teams:', teams);
        
        // 팀 정보 찾기
        const team = teams.find(t => t.id === teamId);
        console.log('팀 토픽 생성 다이얼로그 열기 - teamId:', teamId);
        console.log('찾은 팀:', team);
        console.log('전체 팀 목록:', teams);
        
        if (!team) {
            console.error('팀을 찾을 수 없음:', teamId);
            showNotificationMessage('팀 정보를 찾을 수 없습니다.');
            return;
        }
        
        console.log('팀 토픽 생성 다이얼로그 상태 설정');
        setTeamForTopicCreation(team);
        setShowTeamTopicCreator(true);
        console.log('showTeamTopicCreator 상태:', true);
    };

    const showNotificationMessage = (message) => {
        setNotificationMessage(message);
        setShowNotification(true);
        setTimeout(() => {
            setShowNotification(false);
        }, 3000);
    };

    const handleTeamTopicCreated = (topic) => {
        // 팀 토픽 생성 완료 후 프레젠테이션 생성 페이지로 이동
        setShowTeamTopicCreator(false);
        setTeamForTopicCreation(null);
        dispatch(setCurrentTopic(topic));
        
        // 토픽이 Redux store에 추가되었는지 확인
        console.log('팀 토픽 생성 완료:', topic);
        console.log('현재 Redux topics 상태:', topics);
        
        // 팀 토픽이 생성된 팀을 자동으로 확장하여 표시
        if (topic.teamId) {
            setExpandedTeams(prev => new Set([...prev, topic.teamId]));
            console.log(`팀 ${topic.teamId} 자동 확장하여 팀 토픽 표시`);
            
            // 새로 생성된 토픽도 확장하여 표시
            setExpandedTopics(prev => new Set([...prev, topic.id]));
        }
        
        // 토픽 목록을 즉시 새로고침하여 새로 생성된 팀 토픽이 표시되도록 함
        loadTopics();
        
        // 성공 메시지 표시
        showNotificationMessage(`새로운 팀 토픽 "${topic.title}"이 생성되었습니다.`);
        
        // Dashboard로 이동
        setTimeout(() => {
            console.log('팀 토픽 생성 후 상태 확인:');
            console.log('topics:', topics);
            console.log('teamTopics:', topics.filter(t => t.isTeamTopic));
            
            // 새로 생성된 팀 토픽이 있는지 확인
            const newTeamTopic = topics.find(t => t.id === topic.id);
            if (newTeamTopic) {
                console.log('새로 생성된 팀 토픽이 Redux store에 존재함:', newTeamTopic);
            } else {
                console.warn('새로 생성된 팀 토픽이 Redux store에 없음!');
            }
            
            navigate('/dashboard', { 
                state: { 
                    selectedTopic: topic,
                    action: 'create'
                } 
            });
        }, 500); // 약간의 지연을 두어 사용자가 성공 메시지를 볼 수 있도록 함
    };

    // 디버깅 로그 (개발 시에만 사용)
    if (process.env.NODE_ENV === 'development') {
        console.log('CollapsibleSidebar - topics:', topics.length, '개');
        console.log('CollapsibleSidebar - privateTopics:', privateTopics.length, '개');
        console.log('CollapsibleSidebar - teamTopics:', teamTopics.length, '개');
    }

    // 팀별 토픽 그룹을 useMemo로 계산 (의존성 최적화)
    const teamTopicGroups = useMemo(() => {
        const groups = {};
        
        if (Array.isArray(teamTopics) && teamTopics.length > 0) {
            teamTopics.forEach(topic => {
                // teamId가 있으면 해당 팀으로 그룹화
                if (topic.teamId) {
                    if (!groups[topic.teamId]) {
                        groups[topic.teamId] = [];
                    }
                    groups[topic.teamId].push(topic);
                } else {
                    // teamId가 없으면 사용자 ID로 그룹화 (임시 해결책)
                    const fallbackTeamId = topic.userId || 'unknown';
                    if (!groups[fallbackTeamId]) {
                        groups[fallbackTeamId] = [];
                    }
                    groups[fallbackTeamId].push(topic);
                }
            });
        }
        
        // 각 팀에 대해 빈 배열이라도 초기화 (팀 토픽이 없는 팀도 표시)
        if (Array.isArray(teams)) {
            teams.forEach(team => {
                if (!groups[team.id]) {
                    groups[team.id] = [];
                }
            });
        }
        
        // teamId가 없는 팀 토픽들을 적절한 팀에 할당 (한 번만 실행)
        if (Array.isArray(teamTopics) && Array.isArray(teams) && teams.length > 0) {
            const unassignedTopics = teamTopics.filter(topic => !topic.teamId);
            if (unassignedTopics.length > 0) {
                // 첫 번째 팀에 할당 (임시 해결책)
                const firstTeam = teams[0];
                if (firstTeam && !groups[firstTeam.id]) {
                    groups[firstTeam.id] = [];
                }
                
                unassignedTopics.forEach(topic => {
                    if (firstTeam) {
                        // 그룹에 추가 (Redux 업데이트는 제거하여 무한 루프 방지)
                        groups[firstTeam.id].push(topic);
                    }
                });
            }
        }
        
        return groups;
    }, [teamTopics.length, teams.length]); // 길이만 의존성으로 사용하여 무한 루프 방지

    // Redux에서는 selector 함수로 직접 구현
    const getPresentationsByTopic = (presentations, topicId) => {
        return Array.isArray(presentations) ? presentations.filter(presentation => presentation.topicId === topicId) : [];
    };

        const renderTeamTopicItems = () => {
        const teamTopicEntries = Object.entries(teamTopicGroups);
        
        if (teamTopicEntries.length === 0) {
            return (
                <div style={{
                    paddingLeft: '32px',
                    paddingRight: '16px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    color: '#999999',
                    fontSize: '11px',
                    fontStyle: 'italic',
                    textAlign: 'center'
                }}>
                    팀 토픽이 없습니다.
                </div>
            );
        }
        
        return teamTopicEntries.map(([teamId, topics]) => {
            const team = teams.find(t => t.id === teamId);
            
            // 팀 정보가 없어도 토픽은 표시
            let teamName = `팀 ${teamId}`;
            if (team) {
                teamName = team.name;
            } else if (teamId === 'unknown' || teamId === user?.userId) {
                teamName = '내 팀 토픽';
            }
            
            const isTeamExpanded = expandedTeams.has(teamId);

            return (
                <div key={teamId} style={{ marginBottom: '16px' }}>
                    {/* 팀 헤더 - 클릭 가능한 버튼 */}
                    <div 
                        onClick={() => handleTeamToggle(teamId)}
                        style={{
                            paddingLeft: '32px',
                            paddingRight: '16px',
                            paddingTop: '8px',
                            paddingBottom: '4px',
                            color: '#666666',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s ease',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="클릭하여 팀 토픽 보기/숨기기"
                    >
                        {/* 화살표 아이콘 */}
                        <div style={{
                            fontSize: '14px',
                            transform: isTeamExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            color: '#666666'
                        }}>
                            ▶
                        </div>
                        
                        {/* 팀 이름 */}
                        <span>{teamName} 토픽</span>
                    </div>
                    
                    {/* 팀의 토픽들 - 확장 상태에 따라 표시/숨김 */}
                    {isTeamExpanded && (
                        <div style={{ marginTop: '4px' }}>
                            {topics.map(topic => renderTopicItems([topic]))}
                        </div>
                    )}
                </div>
            );
        });
    };

    const renderTopicItems = (topicList) => {
        if (!Array.isArray(topicList)) {
            console.warn('topicList is not an array:', topicList);
            return null;
        }
        
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
                        title={topic.isTeamTopic ? "클릭하여 팀 프레젠테이션 만들기" : "우클릭으로 토픽 관리"}
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
                            {topic.name || topic.title}
                        </div>

                        {/* 프레젠테이션 개수 (최대 2개) */}
                        <div style={{
                            fontSize: '12px',
                            color: presentationsForTopic.length >= 2 ? '#dc3545' : '#666666',
                            backgroundColor: presentationsForTopic.length >= 2 ? '#ffe0e0' : '#f0f0f0',
                            borderRadius: '10px',
                            padding: '2px 8px',
                            minWidth: '35px',
                            textAlign: 'center',
                            fontWeight: presentationsForTopic.length >= 2 ? '600' : '400'
                        }}>
                            {presentationsForTopic.length}/2
                        </div>

                        {/* 비교하기 버튼 (발표가 정확히 2개일 때만 표시) */}
                        {presentationsForTopic.length === 2 && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/comparison', { 
                                        state: { 
                                            selectedTopic: topic 
                                        } 
                                    });
                                }}
                                style={{
                                    fontSize: '11px',
                                    color: '#1976d2',
                                    backgroundColor: '#e3f2fd',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#1976d2';
                                    e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e3f2fd';
                                    e.currentTarget.style.color = '#1976d2';
                                }}
                                title="두 발표를 비교합니다"
                            >
                                ⚖️ 비교
                            </div>
                        )}

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
                                                        aspectRatio: '1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {hasAnalysis ? (
                                                            <div style={{
                                                                width: '180px',
                                                                height: '180px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <PentagonChart
                                                                    data={analysisData.grades || analysisData.scores}
                                                                    size={180}
                                                                    showLabels={false}
                                                                    showGrid={false}
                                                                    isPreview={true}
                                                                />
                                                            </div>
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
                                    onClick={() => {
                                        if (topic.isTeamTopic) {
                                            // 팀 토픽인 경우 Dashboard로 이동
                                            navigate('/dashboard', { 
                                                state: { 
                                                    selectedTopic: topic,
                                                    action: 'create'
                                                } 
                                            });
                                        } else {
                                            // 일반 토픽인 경우 기존 방식으로 처리
                                            handleCreatePresentation(topic.id);
                                        }
                                    }}
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
                                        color: topic.isTeamTopic ? '#28a745' : '#666666',
                                        fontSize: '13px',
                                        fontStyle: 'italic',
                                        border: `1px dashed ${topic.isTeamTopic ? '#28a745' : '#cccccc'}`,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (topic.isTeamTopic) {
                                            e.currentTarget.style.backgroundColor = '#f0fff0';
                                            e.currentTarget.style.borderColor = '#28a745';
                                            e.currentTarget.style.color = '#28a745';
                                        } else {
                                        e.currentTarget.style.backgroundColor = '#f0f8ff';
                                        e.currentTarget.style.borderColor = '#007bff';
                                        e.currentTarget.style.color = '#007bff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (topic.isTeamTopic) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.borderColor = '#28a745';
                                            e.currentTarget.style.color = '#28a745';
                                        } else {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.borderColor = '#cccccc';
                                        e.currentTarget.style.color = '#666666';
                                        }
                                    }}
                                >
                                    <div style={{ fontSize: '14px' }}>+</div>
                                    <div>{topic.isTeamTopic ? '팀 프레젠테이션 만들기' : '새 프레젠테이션 만들기'}</div>
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
            zIndex: 1000,
            borderRight: isCollapsed ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: isCollapsed ? 'none' : '2px 0px 8px rgba(0, 0, 0, 0.1)',
            overflowY: 'auto',
            visibility: isCollapsed ? 'hidden' : 'visible',
            opacity: isCollapsed ? 0 : 1
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
                            개인 토픽 ({privateTopics.length})
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
                        onClick={() => setIsTeamExpanded(!isTeamExpanded)}
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
                            팀 프로젝트 ({teams.length})
                        </div>
                    </div>
                    
                    {/* 팀 관련 액션 버튼들 */}
                    <div style={{
                        display: 'flex',
                        gap: '4px'
                    }}>
                        {/* 팀 참가 버튼 */}
                        <div
                            onClick={() => setShowTeamJoin(true)}
                            style={{
                                fontSize: '11px',
                                color: '#1976d2',
                                backgroundColor: '#e3f2fd',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#1976d2';
                                e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#e3f2fd';
                                e.currentTarget.style.color = '#1976d2';
                            }}
                            title="팀 참가"
                        >
                            팀 참가
                        </div>
                        
                        {/* 팀 생성 버튼 */}
                        <div
                            onClick={() => setShowTeamCreator(true)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#007bff',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#0056b3';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#007bff';
                                e.target.style.transform = 'scale(1)';
                            }}
                            title="새 팀 만들기"
                        >
                            +
                        </div>
                    </div>
                </div>

                {/* Team Items */}
                {isTeamExpanded && (
                    <div style={{
                        marginTop: '8px',
                        paddingLeft: '8px'
                    }}>
                        {teams.length > 0 ? (
                            teams.map((team) => {
                                // 해당 팀의 토픽들 가져오기
                                const teamTopicsForTeam = teamTopicGroups[team.id] || [];
                                const isTeamExpanded = expandedTeams.has(team.id);
                                
                                return (
                                    <div key={team.id}>
                                        {/* 팀 항목 */}
                                        <div
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
                                                margin: '2px 8px',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                            onClick={() => {
                                                // 팀 토글 (토픽 표시/숨김)
                                                handleTeamToggle(team.id);
                                            }}
                                            title="클릭하여 팀 토픽 보기/숨기기"
                                        >
                                            {/* 팀 토글 화살표 */}
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#666666',
                                                transform: isTeamExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease',
                                                cursor: 'pointer'
                                            }}>
                                                ▶
                    </div>
                                            
                                            <div style={{ fontSize: '14px' }}>👥</div>
                                            <div style={{
                                                color: '#333333',
                                                fontSize: '14px',
                                                fontFamily: 'Inter, sans-serif',
                                                fontWeight: '500',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {team.name}
                                                {team.userRole && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: '#666666',
                                                        marginLeft: '6px',
                                                        fontWeight: '400'
                                                    }}>
                                                        ({team.userRole === 'OWNER' ? '팀장' : team.userRole === 'ADMIN' ? '관리자' : '멤버'})
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#666666',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '10px',
                                                padding: '2px 6px',
                                                minWidth: '20px',
                                                textAlign: 'center'
                                            }}>
                                                {team.memberCount || 0}
                                            </div>
                                            
                                            {/* 팀 상세 보기 버튼 */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('팀 상세보기 클릭:', team);
                                                    console.log('팀 ID:', team.id);
                                                    console.log('이동할 URL:', `/teams/${team.id}`);
                                                    
                                                    // 팀 ID가 문자열인지 숫자인지 확인
                                                    const teamId = typeof team.id === 'string' ? team.id : team.id.toString();
                                                    console.log('최종 teamId:', teamId);
                                                    
                                                    navigate(`/teams/${teamId}`);
                                                }}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#6c757d79',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = '#495057ac';
                                                    e.target.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = '#6c757d79';
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                                title="팀 상세 보기"
                                            >
                                                🔍
                                            </div>
                                            
                                            {/* 팀 초대 버튼 - 팀장/관리자만 표시 */}
                                            {(team.userRole === 'OWNER' || team.userRole === 'ADMIN') && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTeam(team);
                                                        setShowTeamInvite(true);
                                                    }}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#ffc107d2',
                                                        color: '#000000',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = '#e0a800eb';
                                                        e.target.style.transform = 'scale(1.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = '#ffc107d2';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                    title="팀 초대 링크 생성"
                                                >
                                                    ✉️
                                                </div>
                                            )}
                                            
                                            {/* 팀 프레젠테이션 생성 버튼 */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreateTeamPresentation(team.id);
                                                }}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#007bff',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = '#0056b3';
                                                    e.target.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = '#007bff';
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                                title="새 팀 토픽 만들기"
                                            >
                                                +
                                            </div>
                                        </div>
                                        
                                        {/* 팀의 토픽들 - 확장 상태에 따라 표시/숨김 */}
                                        {isTeamExpanded && teamTopicsForTeam.length > 0 && (
                                            <div style={{ marginLeft: '16px' }}>
                                                {teamTopicsForTeam.map(topic => renderTopicItems([topic]))}
                                            </div>
                                        )}
                                        
                                        {/* 팀에 토픽이 없을 때 메시지 */}
                                        {isTeamExpanded && teamTopicsForTeam.length === 0 && (
                                            <div style={{
                                                paddingLeft: '48px',
                                                paddingRight: '16px',
                                                paddingTop: '4px',
                                                paddingBottom: '4px',
                                                color: '#999999',
                                                fontSize: '12px',
                                                fontStyle: 'italic'
                                            }}>
                                                팀 토픽이 없습니다. ➕ 버튼을 클릭하여 팀 토픽을 만들어보세요.
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{
                                paddingLeft: '32px',
                                paddingRight: '16px',
                                paddingTop: '8px',
                                paddingBottom: '8px',
                                color: '#666666',
                                fontSize: '13px',
                                fontStyle: 'italic',
                                textAlign: 'center'
                            }}>
                                참여한 팀이 없습니다
                            </div>
                        )}
                        
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

            {/* Team Creator Modal */}
            <TeamCreator
                open={showTeamCreator}
                onClose={() => {
                    setShowTeamCreator(false);
                    // 팀 생성 다이얼로그가 닫힐 때 팀 목록 새로고침
                    loadTeams();
                }}
            />

            {/* Team Join Modal */}
            <TeamJoin
                open={showTeamJoin}
                onClose={() => setShowTeamJoin(false)}
                onSuccess={handleTeamJoined}
            />

            {/* Team Invite Modal */}
            <TeamInvite
                open={showTeamInvite}
                onClose={() => {
                    setShowTeamInvite(false);
                    setSelectedTeam(null);
                }}
                team={selectedTeam}
            />

            {/* Team Topic Creator Modal */}
            <TopicCreator
                open={showTeamTopicCreator}
                onClose={() => {
                    console.log('팀 토픽 생성 다이얼로그 닫기');
                    setShowTeamTopicCreator(false);
                    setTeamForTopicCreation(null);
                }}
                onTopicCreated={handleTeamTopicCreated}
                isTeamTopic={true}
                team={teamForTopicCreation}
            />
            

            {/* Presentation Options Modal */}
            <PresentationOptionsModal
                open={showPresentationOptions}
                onClose={() => setShowPresentationOptions(false)}
                presentation={selectedPresentationForOptions}
                onVideoPlay={handleVideoPlay}
                onAnalyze={handleAnalyze}
                onEdit={handleEdit}
            />

            {/* Notification */}
            {showNotification && (
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    right: '20px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid #f5c6cb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    maxWidth: '300px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    {notificationMessage}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSidebar; 