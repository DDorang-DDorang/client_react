import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
import { getVideoUrl } from '../utils/videoUrlUtils';

const CollapsibleSidebar = ({ isCollapsed, refreshKey }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
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
    const [analysisStatuses, setAnalysisStatuses] = useState({}); // 프레젠테이션별 분석 진행 상태

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
    // teams 배열 전체를 구독하되, 길이만 체크하여 불필요한 재렌더링 방지
    // teamsFromStore를 직접 구독하되, 메모이제이션으로 재렌더링 최소화
    const teamsFromStore = useSelector(state => state.team.teams || []);
    const teamsLength = teamsFromStore.length;
    
    // teams 배열을 메모이제이션하여 참조가 변경되어도 길이가 같으면 동일한 배열로 간주
    // 길이가 변경되지 않으면 이전 배열 참조 유지
    const teams = useMemo(() => {
        return teamsFromStore;
    }, [teamsLength]);
    const { notifications } = useSelector(state => state.notification);

    // 개인 토픽 필터링
    const privateTopics = Array.isArray(topics) ? topics.filter(topic => !topic.isTeamTopic) : [];
    
    // 팀 토픽 필터링
    const teamTopics = Array.isArray(topics) ? topics.filter(topic => topic.isTeamTopic) : [];
    
    
    // 마지막 로드 시간 추적 (중복 요청 방지)
    const lastLoadTimeRef = useRef(0);
    const DATA_CACHE_DURATION = 30000; // 30초 동안 캐시 유지

    // 컴포넌트 마운트 시 토픽 목록과 팀 목록 로드 (캐시 확인 및 엄격한 제한)
    const teamsLoadedRef = useRef(false); // 팀 목록이 한 번 로드되었는지 추적
    const userRef = useRef(null); // user 참조 추적
    
    useEffect(() => {
        // user가 null이 아니고, 식별자가 있을 때만 호출
        if (user && (user.userId || user.id || user.email)) {
            const currentUserId = user.userId || user.id;
            const previousUserId = userRef.current?.userId || userRef.current?.id;
            
            // user가 변경되지 않았고, 팀 목록이 이미 로드되었으면 스킵
            if (currentUserId === previousUserId && teamsLoadedRef.current && teamsLength > 0) {
                return;
            }
            
            // user가 변경되었거나 처음 로드하는 경우
            if (currentUserId !== previousUserId) {
                userRef.current = user;
                teamsLoadedRef.current = false; // user가 변경되면 팀 목록도 다시 로드
            }
            
            const now = Date.now();
            const timeSinceLastLoad = now - lastLoadTimeRef.current;
            
            // Redux store에 데이터가 있고, 최근에 로드했으면 재로드하지 않음
            const hasTopics = Array.isArray(topics) && topics.length > 0;
            const hasTeams = teamsLength > 0; // teams 배열 대신 길이만 확인
            
            // 초기 로드인 경우 (lastLoadTimeRef가 0) 항상 로드
            const isInitialLoad = lastLoadTimeRef.current === 0;
            
            // 팀 목록은 한 번만 로드 (이미 로드되었으면 재로드하지 않음)
            if (!isInitialLoad && hasTopics && hasTeams && timeSinceLastLoad < DATA_CACHE_DURATION && teamsLoadedRef.current) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('CollapsibleSidebar: 캐시된 데이터 사용 (재로드 스킵)');
                }
                return; // 캐시된 데이터 사용
            }
            
            // 데이터가 없거나 오래되었거나 초기 로드면 로드
            lastLoadTimeRef.current = now;
            
            // 토픽과 팀을 병렬로 로드 (순차적이 아닌)
            // 초기 로드이거나 데이터가 없으면 항상 로드
            if (isInitialLoad || !hasTopics) {
                loadTopics();
            }
            // 팀 목록은 한 번만 로드 (이미 로드되었으면 재로드하지 않음)
            if ((isInitialLoad || !hasTeams) && !teamsLoadedRef.current) {
                teamsLoadedRef.current = true;
                loadTeams();
            }
        }
    }, [user]); // user만 의존성으로 유지 (teamsLength는 체크용으로만 사용)
    
    // 로그아웃 시 모든 상태 초기화
    useEffect(() => {
        if (!user || (!user.userId && !user.id && !user.email)) {
            // user가 null이거나 유효하지 않으면 모든 상태 초기화
            setExpandedTopics(new Set());
            setExpandedTeams(new Set());
            setAnalysisResults({});
            setTopicPresentations({});
            setAnalysisStatuses({});
            setIsPrivateExpanded(true);
            setIsTeamExpanded(true);
            setShowTopicCreator(false);
            setShowTeamCreator(false);
            setShowTeamJoin(false);
            setShowTeamInvite(false);
            setSelectedTeam(null);
            setShowTeamTopicCreator(false);
            setTeamForTopicCreation(null);
            setShowTopicManager(false);
            setShowPresentationManager(false);
            setSelectedTopic(null);
            setSelectedPresentation(null);
            setShowVideoPlayer(false);
            setShowNotification(false);
            setNotificationMessage('');
            setShowPresentationOptions(false);
            setSelectedPresentationForOptions(null);
            
            // ref 값들도 초기화
            teamsLoadedRef.current = false;
            userRef.current = null;
            lastLoadTimeRef.current = 0;
            if (loadingPresentationsRef.current) {
                loadingPresentationsRef.current.clear();
            }
            lastAnalysisLoadTimeRef.current = 0;
        }
    }, [user]);

    useEffect(() => {
        // refreshKey가 변경되면 확장된 토픽의 발표 목록만 새로고침
        if (refreshKey > 0) {
            topics.forEach(topic => {
                if (expandedTopics.has(topic.id)) {
                    loadPresentations(topic.id);
                }
            });
        }
    }, [refreshKey, topics, expandedTopics]);

    // 확장된 토픽의 프레젠테이션에 대해 분석 결과 자동 로드 (최적화: 중복 방지 및 디바운싱)
    const loadingPresentationsRef = useRef(new Set()); // 현재 로드 중인 프레젠테이션 ID 추적
    const lastAnalysisLoadTimeRef = useRef(0); // 마지막 분석 로드 시간
    const LOAD_DEBOUNCE_MS = 1000; // 1초 디바운스
    
    useEffect(() => {
        const now = Date.now();
        const timeSinceLastLoad = now - lastAnalysisLoadTimeRef.current;
        
        // 너무 자주 실행되지 않도록 디바운싱
        if (timeSinceLastLoad < LOAD_DEBOUNCE_MS) {
            return;
        }
        
        lastAnalysisLoadTimeRef.current = now;
        
        // 확장된 토픽의 모든 프레젠테이션에 대해 분석 결과 로드
        const expandedTopicIds = Array.from(expandedTopics);
        expandedTopicIds.forEach(topicId => {
            const presentations = topicPresentations[topicId] || [];
            presentations.forEach(presentation => {
                const presentationId = presentation.id;
                
                // 이미 로드 중이면 스킵
                if (loadingPresentationsRef.current.has(presentationId)) {
                    return;
                }
                
                const analysisData = analysisResults[presentationId];
                const analysisStatus = analysisStatuses[presentationId];
                
                // 분석 결과가 없고 로드되지 않았으면 상태 확인 후 로드 시도
                // 상태를 먼저 확인하여 초기에 "분석 진행중"이 표시되도록 함
                if (!analysisData && !analysisStatus) {
                    // 로드 중 플래그 설정
                    loadingPresentationsRef.current.add(presentationId);
                    
                    // 상태를 먼저 확인 (초기 상태를 설정)
                    checkPresentationAnalysisStatus(presentationId);
                    
                    // 그 다음 분석 결과 로드 시도 (finally에서 플래그 해제)
                    loadAnalysisResults(presentationId);
                }
            });
        });
    }, [expandedTopics, topicPresentations.length]); // topicPresentations 객체 참조 대신 길이만 의존성으로 사용

    // 알림이 새로 오면 프레젠테이션 목록 새로고침 (최적화: 확장된 토픽만, 분석 관련 알림만)
    const lastNotificationRef = useRef(null);
    const checkingStatusesRef = useRef(new Set()); // 현재 확인 중인 프레젠테이션 ID 추적 (중복 방지)
    useEffect(() => {
        if (notifications && notifications.length > 0) {
            const latestNotification = notifications[0];
            const latestId = latestNotification.notificationId || latestNotification.id;
            
            // 새 알림인지 확인
            if (lastNotificationRef.current !== latestId) {
                // 초기 로드가 아니고, 분석 완료 알림인 경우에만 새로고침
                if (lastNotificationRef.current !== null) {
                    // 분석 완료 알림인지 확인 (AI_ANALYSIS_COMPLETE 타입)
                    const isAnalysisComplete = latestNotification.type === 'AI_ANALYSIS_COMPLETE';
                    
                    if (isAnalysisComplete) {
                        // 확장된 토픽만 새로고침하여 불필요한 요청 방지
                        topics.forEach(topic => {
                            if (expandedTopics.has(topic.id)) {
                                loadPresentations(topic.id);
                            }
                        });
                    }
                    // 다른 타입의 알림은 새로고침하지 않음 (불필요한 요청 방지)
                }
                lastNotificationRef.current = latestId;
            }
        }
    }, [notifications, topics, expandedTopics]); // notifications 배열 변경 감지

    // 주기적으로 프레젠테이션 목록 새로고침 (다른 페이지에 있을 때도 업데이트되도록)
    const presentationRefreshIntervalRef = useRef(null);
    useEffect(() => {
        if (!user || !(user.userId || user.id || user.email)) {
            // 인증되지 않았으면 interval 정리
            if (presentationRefreshIntervalRef.current) {
                clearInterval(presentationRefreshIntervalRef.current);
                presentationRefreshIntervalRef.current = null;
            }
            return;
        }

        // 확장된 토픽의 발표 목록을 주기적으로 새로고침 (2분마다)
        const refreshPresentations = () => {
            // 확장된 토픽만 새로고침하여 불필요한 요청 방지
            topics.forEach(topic => {
                if (expandedTopics.has(topic.id)) {
                    loadPresentations(topic.id);
                }
            });
        };

        // 초기 실행
        refreshPresentations();

        // 2분마다 새로고침
        presentationRefreshIntervalRef.current = setInterval(refreshPresentations, 120000); // 2분 = 120000ms

        return () => {
            if (presentationRefreshIntervalRef.current) {
                clearInterval(presentationRefreshIntervalRef.current);
                presentationRefreshIntervalRef.current = null;
            }
        };
    }, [user, topics, expandedTopics]); // user, topics, expandedTopics 변경 시 재설정

    // 페이지 포커스 시 발표 목록 새로고침
    useEffect(() => {
        if (!user || !(user.userId || user.id || user.email)) {
            return;
        }

        const handleFocus = () => {
            // 페이지가 포커스를 받으면 확장된 토픽의 발표 목록 새로고침
            topics.forEach(topic => {
                if (expandedTopics.has(topic.id)) {
                    loadPresentations(topic.id);
                }
            });
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, topics, expandedTopics]);

    const loadTopics = async () => {
        if (!user || !(user.userId || user.id || user.email)) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('사용자 정보가 없어 토픽을 로드할 수 없습니다.', user);
            }
            return;
        }
        const userIdentifier = user.userId || user.id || user.email;

        if (process.env.NODE_ENV === 'development') {
            console.log('CollapsibleSidebar: 토픽 로드 시작 - userIdentifier:', userIdentifier);
        }

        dispatch(setLoading(true));
        try {
            const result = await topicService.getTopics(userIdentifier);
            if (process.env.NODE_ENV === 'development') {
                console.log('CollapsibleSidebar: 토픽 로드 결과:', result);
            }
            
            if (result.success) {
                // 서버에서 받은 토픽들을 그대로 사용 (이미 올바른 순서로 정렬됨)
                const serverTopics = result.data || [];
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('CollapsibleSidebar: 로드된 토픽 개수:', serverTopics.length);
                }
                
                // 각 토픽의 발표 개수 가져오기 (병렬 처리)
                const topicsWithCounts = await Promise.all(
                    serverTopics.map(async (topic) => {
                        try {
                            const presentationsResult = await topicService.getPresentations(topic.id);
                            const presentationCount = presentationsResult.success 
                                ? (presentationsResult.data || []).length 
                                : 0;
                            
                            return {
                                ...topic,
                                presentationCount: presentationCount
                            };
                        } catch (error) {
                            console.error(`토픽 ${topic.id}의 발표 개수 로드 실패:`, error);
                            return {
                                ...topic,
                                presentationCount: 0
                            };
                        }
                    })
                );
                
                // 발표 개수가 포함된 토픽 목록을 Redux store에 설정
                dispatch(setTopics(topicsWithCounts));
                
                // 마지막 로드 시간 업데이트
                lastLoadTimeRef.current = Date.now();
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.error('CollapsibleSidebar: 토픽 로드 실패:', result.error);
                }
                dispatch(setError(result.error || '토픽을 불러오는 중 오류가 발생했습니다.'));
            }
        } catch (error) {
            console.error('CollapsibleSidebar: 토픽 로드 중 예외 발생:', error);
            dispatch(setError('토픽을 불러오는 중 오류가 발생했습니다.'));
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
            const result = await topicService.getPresentations(topicId);
            if (result.success) {
                const presentations = result.data || [];
                
                // 토픽별 프레젠테이션 상태 업데이트
                setTopicPresentations(prev => ({
                    ...prev,
                    [topicId]: presentations
                }));
                
                // Redux store도 업데이트 (기존 호환성 유지)
                dispatch(setPresentations(presentations));
                
                // 확장된 토픽의 프레젠테이션에 대해 분석 결과 로드 (병렬 처리)
                if (expandedTopics.has(topicId)) {
                    // 모든 프레젠테이션에 대해 분석 결과를 병렬로 로드
                    presentations.forEach(presentation => {
                        loadAnalysisResults(presentation.id);
                        checkPresentationAnalysisStatus(presentation.id);
                    });
                }
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to load presentations:', result.error);
                }
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
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60 };
        return gradeMap[data.intensityGrade] || 75;
    };

    const calculateSpeedScore = (data) => {
        if (!data.wpmGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60 };
        return gradeMap[data.wpmGrade] || 75;
    };

    const calculatePitchScore = (data) => {
        if (!data.pitchGrade) return 75;
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60 };
        return gradeMap[data.pitchGrade] || 75;
    };

    const calculateExpressionScore = (data) => {
        if (!data.anxietyGrade) return 75;
        
        // DB에서 가져온 등급을 그대로 사용하여 점수 변환
        const gradeMap = { 'A': 90, 'B': 80, 'C': 70, 'D': 60 };
        return gradeMap[data.anxietyGrade] || 75;
    };

    const calculateClarityScore = (data) => {
        if (data.pronunciationScore === null || data.pronunciationScore === undefined) return 75;
        return Math.round(data.pronunciationScore * 100);
    };

    const derivePronunciationGrade = (score) => {
        if (score === null || score === undefined) return 'C';
        if (score >= 0.85) return 'A';
        if (score >= 0.75) return 'B';
        if (score >= 0.65) return 'C';
        if (score >= 0.55) return 'D';
        return 'E';
    };

    // Spring Boot 데이터를 표시 형식으로 변환
    const convertSpringBootDataToDisplayFormat = (data) => {
        if (!data) {
            return { scores: null, grades: null };
        }

        // Spring Boot 응답 데이터 변환
        const pronunciationScore = data.sttResult?.pronunciationScore ?? null;
        const pronunciationGrade = data.sttResult?.pronunciationGrade || null;
        const pronunciationComment = data.sttResult?.pronunciationComment || null;
        const anxietyGrade = data.voiceAnalysis?.anxietyGrade || null;
        const anxietyRatio = data.voiceAnalysis?.anxietyRatio ?? null;
        const anxietyComment = data.voiceAnalysis?.anxietyComment || null;

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
            expressionGrade: data.voiceAnalysis?.anxietyGrade || '보통',
            expressionText: '',
            transcription: data.sttResult?.transcription || '',
            pronunciationScore,
            pronunciationGrade,
            pronunciationComment,
            anxietyGrade,
            anxietyRatio,
            anxietyComment
        };

        // 등급을 영문으로 변환하는 헬퍼 함수
        const normalizeGrade = (grade) => {
            if (!grade) return 'C';
            
            // 이미 영문 등급이면 그대로 반환
            if (typeof grade === 'string' && ['A', 'B', 'C', 'D', 'E', 'F'].includes(grade.toUpperCase())) {
                return grade.toUpperCase();
            }
            
            // 한글 등급을 영문으로 변환
            const koreanToEnglish = {
                '매우 좋음': 'A',
                '좋음': 'B',
                '보통': 'C',
                '나쁨': 'D',
                '매우 나쁨': 'F',
                'A+': 'A',
                'A-': 'A',
                'B+': 'B',
                'B-': 'B',
                'C+': 'C',
                'C-': 'C',
                'D+': 'D',
                'D-': 'D'
            };
            
            return koreanToEnglish[grade] || 'C';
        };

        // 등급 데이터 (PentagonChart에서 사용) - VideoAnalysis와 동일한 형식
        const grades = {
            voice: normalizeGrade(fastApiData.intensityGrade),
            speed: normalizeGrade(fastApiData.wpmGrade),
            expression: normalizeGrade(fastApiData.anxietyGrade),
            pitch: normalizeGrade(fastApiData.pitchGrade),
            clarity: normalizeGrade(fastApiData.pronunciationGrade || derivePronunciationGrade(fastApiData.pronunciationScore))
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
            // 먼저 분석 상태를 확인하여 현재 상태를 파악
            const currentStatus = await checkAnalysisStatus(presentationId);
            
            // 분석이 완료되지 않았으면 결과를 로드하지 않음
            if (currentStatus.status !== 'completed' && !currentStatus.isAnalyzing) {
                // 대기 중이거나 시작되지 않은 상태
                setAnalysisStatuses(prev => ({
                    ...prev,
                    [presentationId]: currentStatus
                }));
                
                // 이전 분석 결과가 있으면 제거 (새로운 분석이 시작되었을 수 있음)
                setAnalysisResults(prev => {
                    const newResults = { ...prev };
                    delete newResults[presentationId];
                    return newResults;
                });
                return;
            }
            
            // 분석이 진행 중일 때도 이전 결과를 제거 (새로운 분석이 진행 중)
            if (currentStatus.isAnalyzing) {
                setAnalysisStatuses(prev => ({
                    ...prev,
                    [presentationId]: currentStatus
                }));
                
                // 진행 중일 때는 이전 결과를 제거하여 차트가 표시되지 않도록 함
                setAnalysisResults(prev => {
                    const newResults = { ...prev };
                    delete newResults[presentationId];
                    return newResults;
                });
                return;
            }
            
            // 분석이 완료되었거나 진행 중일 때만 결과 로드 시도
            // hasAnalysisResults 호출을 스킵하고 직접 getAllAnalysisResults 호출
            // 결과가 없으면 에러가 나지만, 불필요한 요청을 하나 줄일 수 있음
            const analysisData = await videoAnalysisService.getAllAnalysisResults(presentationId);
            if (analysisData.success && analysisData.data) {
                // 데이터를 표시 형식으로 변환
                const convertedData = convertSpringBootDataToDisplayFormat(analysisData.data);
                
                setAnalysisResults(prev => ({
                    ...prev,
                    [presentationId]: convertedData
                }));
                
                // 분석 상태를 다시 확인하여 최신 상태로 업데이트
                // 분석 결과가 있어도 실제 상태가 완료인지 확인
                const latestStatus = await checkAnalysisStatus(presentationId);
                setAnalysisStatuses(prev => ({
                    ...prev,
                    [presentationId]: latestStatus
                }));
            } else {
                // 분석 결과가 없으면 분석 상태 확인
                setAnalysisStatuses(prev => ({
                    ...prev,
                    [presentationId]: currentStatus
                }));
            }
        } catch (error) {
            // 404 에러는 분석 결과가 없는 것이므로 정상
            if (error.response?.status === 404) {
                // 분석 결과가 없으면 분석 상태 확인
                checkPresentationAnalysisStatus(presentationId);
            } else {
                console.error('Load analysis results error:', error);
                // 다른 에러 발생 시에도 분석 상태 확인
                checkPresentationAnalysisStatus(presentationId);
            }
        } finally {
            // 로드 완료 시 플래그 해제
            loadingPresentationsRef.current.delete(presentationId);
        }
    };

    // 프레젠테이션의 분석 진행 상태 확인 (최적화: 주기 늘리고 완료 시 중단, 중복 방지)
    const checkPresentationAnalysisStatus = async (presentationId) => {
        // 이미 확인 중이면 중복 요청 방지
        if (checkingStatusesRef.current.has(presentationId)) {
            return;
        }
        
        // 확인 중 플래그 설정
        checkingStatusesRef.current.add(presentationId);
        
        try {
            const status = await checkAnalysisStatus(presentationId);
            setAnalysisStatuses(prev => ({
                ...prev,
                [presentationId]: status
            }));
            
            // 분석 진행 중이면 10초 후 다시 확인 (주기 증가)
            if (status.isAnalyzing) {
                setTimeout(() => {
                    // 확인 중 플래그 해제
                    checkingStatusesRef.current.delete(presentationId);
                    // 다시 확인 (중복 방지 로직이 있으므로 안전)
                    checkPresentationAnalysisStatus(presentationId);
                }, 10000); // 5초 -> 10초로 증가
            } else {
                // 확인 중 플래그 해제
                checkingStatusesRef.current.delete(presentationId);
                
                // 분석이 완료되면 결과를 다시 로드
                if (status.status === 'completed') {
                    loadAnalysisResults(presentationId);
                }
            }
        } catch (error) {
            console.error('Check analysis status error:', error);
            // 에러 발생 시에도 플래그 해제
            checkingStatusesRef.current.delete(presentationId);
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
        
        // 분석 페이지나 분석 대기 페이지에서 현재 보고 있는 프레젠테이션을 삭제한 경우 대시보드로 이동
        const currentPath = location.pathname;
        const currentPresentationId = params.presentationId || params.id;
        
        if ((currentPath.includes('/video-analysis/') || currentPath.includes('/analysis-progress/')) 
            && currentPresentationId === presentationId) {
            navigate('/dashboard', { replace: true });
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
    
    // teams.length가 변경되어도 불필요한 재렌더링 방지를 위한 최적화
    // teams 배열의 참조가 변경되어도 길이가 같으면 재계산하지 않음
    const teamsLengthRef = useRef(teams?.length || 0);
    const teamTopicsLengthRef = useRef(teamTopics?.length || 0);
    
    useEffect(() => {
        teamsLengthRef.current = teams?.length || 0;
        teamTopicsLengthRef.current = teamTopics?.length || 0;
    }, [teams?.length, teamTopics?.length]);

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
            // 토픽 객체에 presentationCount가 있으면 사용, 없으면 로드된 프레젠테이션 개수 사용
            const presentationCount = topic.presentationCount !== undefined 
                ? topic.presentationCount 
                : presentationsForTopic.length;
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
                            color: presentationCount >= 2 ? '#dc3545' : '#666666',
                            backgroundColor: presentationCount >= 2 ? '#ffe0e0' : '#f0f0f0',
                            borderRadius: '10px',
                            padding: '2px 8px',
                            minWidth: '35px',
                            textAlign: 'center',
                            fontWeight: presentationCount >= 2 ? '600' : '400'
                        }}>
                            {presentationCount}/2
                        </div>

                        {/* 비교하기 버튼 (발표가 정확히 2개일 때만 표시) */}
                        {presentationCount === 2 && (
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
                                    const analysisStatus = analysisStatuses[presentation.id];
                                    
                                    const analysisStatusValue = analysisStatus?.status;
                                    
                                    // 분석 상태에 따른 분류
                                    // 1. 상태가 없으면 "분석 대기중" (아직 확인하지 않은 상태)
                                    // 2. pending 또는 not_started이면 "분석 대기중"
                                    // 3. processing이면 "분석 진행중"
                                    // 4. completed이면 완료
                                    const isPending = !analysisStatus || 
                                        analysisStatusValue === 'pending' || 
                                        analysisStatusValue === 'not_started';
                                    const isProcessing = analysisStatus && 
                                        (analysisStatus.isAnalyzing || analysisStatusValue === 'processing');
                                    
                                    // 분석 진행 중인지 여부 (대기 중이 아닌 진행 중)
                                    const isAnalyzing = isProcessing && !isPending;
                                    
                                    // 분석이 완료되었는지 엄격하게 확인
                                    // 1. analysisStatus가 반드시 존재해야 함
                                    // 2. status가 'completed'여야 함
                                    // 3. isAnalyzing이 false여야 함
                                    // 4. 분석이 진행 중이거나 대기 중이면 완료되지 않은 것으로 간주
                                    const isAnalysisComplete = analysisStatus 
                                        && analysisStatusValue === 'completed' 
                                        && !isAnalyzing
                                        && analysisStatusValue !== 'processing'
                                        && analysisStatusValue !== 'pending'
                                        && analysisStatusValue !== 'not_started';
                                    
                                    // 실제 분석 데이터가 있을 때만 육각형 표시
                                    // scores 또는 grades가 있고, 실제 값이 있으면 분석 결과가 있는 것으로 판단
                                    // 단, 분석이 완료되었을 때만 차트 표시 (분석 진행 중이면 표시하지 않음)
                                    const hasScores = analysisData?.scores && 
                                        (analysisData.scores.voice || analysisData.scores.speed || 
                                         analysisData.scores.expression || analysisData.scores.pitch || 
                                         analysisData.scores.clarity);
                                    const hasGrades = analysisData?.grades && 
                                        (analysisData.grades.voice || analysisData.grades.speed || 
                                         analysisData.grades.expression || analysisData.grades.pitch || 
                                         analysisData.grades.clarity);
                                    
                                    // 분석이 완료되었고 데이터가 있을 때만 차트 표시
                                    // 분석 진행 중이거나 상태가 불명확하면 차트를 표시하지 않음
                                    // analysisStatus가 없으면 차트를 표시하지 않음 (초기 상태는 진행 중으로 간주)
                                    // isPending이나 isProcessing이 true이면 차트를 표시하지 않음
                                    const hasAnalysis = analysisStatus 
                                        && isAnalysisComplete 
                                        && !isPending 
                                        && !isProcessing
                                        && (hasScores || hasGrades);
                                    
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
                                                        width: '150px',
                                                        height: '150px',
                                                        backgroundColor: '#000000',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e9ecef',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        flexShrink: 0
                                                    }}>
                                                        {(() => {
                                                            const videoUrl = presentation.videoUrl ? getVideoUrl(presentation.videoUrl) : null;
                                                            
                                                            return videoUrl ? (
                                                                <>
                                                                    <video 
                                                                        src={videoUrl}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '8px',
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 0
                                                                        }}
                                                                        muted
                                                                        preload="metadata"
                                                                        playsInline
                                                                        onLoadedMetadata={(e) => {
                                                                            // 첫 프레임(0.1초 지점)으로 이동하여 썸네일 표시 (더 빠른 로딩)
                                                                            try {
                                                                                if (e.target.duration > 0.1) {
                                                                                    e.target.currentTime = 0.1;
                                                                                } else if (e.target.duration > 0) {
                                                                                    e.target.currentTime = e.target.duration * 0.05;
                                                                                }
                                                                            } catch (err) {
                                                                                // currentTime 설정 실패 시 무시
                                                                                if (process.env.NODE_ENV === 'development') {
                                                                                console.warn('썸네일 프레임 설정 실패:', err);
                                                                                }
                                                                            }
                                                                        }}
                                                                        onSeeked={(e) => {
                                                                            // 프레임 로드 완료 시 표시
                                                                            e.target.style.opacity = '1';
                                                                        }}
                                                                        onError={(e) => {
                                                                            // 비디오 로드 실패 시 기본 썸네일 표시
                                                                            e.target.style.display = 'none';
                                                                            const fallback = e.target.parentElement.querySelector('.thumbnail-fallback');
                                                                            if (fallback) {
                                                                                fallback.style.display = 'flex';
                                                                            }
                                                                        }}
                                                                    />
                                                                    {/* 비디오 로드 실패 시 대체 썸네일 */}
                                                                    <div 
                                                                        className="thumbnail-fallback"
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            backgroundColor: '#1a1a1a',
                                                                            display: 'none',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: '#ffffff',
                                                                            fontSize: '32px',
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 0,
                                                                            borderRadius: '8px'
                                                                        }}
                                                                    >
                                                                        🎥
                                                                    </div>
                                                                    {/* 재생 오버레이 아이콘 */}
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '50%',
                                                                        left: '50%',
                                                                        transform: 'translate(-50%, -50%)',
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                                        borderRadius: '50%',
                                                                        width: '48px',
                                                                        height: '48px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: 'white',
                                                                        fontSize: '20px',
                                                                        pointerEvents: 'none',
                                                                        transition: 'all 0.2s ease',
                                                                        zIndex: 2
                                                                    }}>
                                                                        ▶
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    backgroundColor: '#1a1a1a',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#ffffff',
                                                                    fontSize: '32px',
                                                                    borderRadius: '8px'
                                                                }}>
                                                                    📄
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* 미니 육각형 차트 또는 분석 대기 상태 */}
                                                    <div style={{
                                                        width: '150px',
                                                        height: '150px',
                                                        aspectRatio: '1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto',
                                                        overflow: 'visible',
                                                        flexShrink: 0,
                                                        padding: '5px'
                                                    }}>
                                                        {hasAnalysis ? (
                                                            <div style={{
                                                                width: '140px',
                                                                height: '140px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'visible'
                                                            }}>
                                                                <PentagonChart
                                                                    data={analysisData.grades || (analysisData.scores ? {
                                                                        voice: analysisData.scores.voice >= 90 ? 'A' : analysisData.scores.voice >= 80 ? 'B' : analysisData.scores.voice >= 70 ? 'C' : 'D',
                                                                        speed: analysisData.scores.speed >= 90 ? 'A' : analysisData.scores.speed >= 80 ? 'B' : analysisData.scores.speed >= 70 ? 'C' : 'D',
                                                                        expression: analysisData.scores.expression >= 90 ? 'A' : analysisData.scores.expression >= 80 ? 'B' : analysisData.scores.expression >= 70 ? 'C' : 'D',
                                                                        pitch: analysisData.scores.pitch >= 90 ? 'A' : analysisData.scores.pitch >= 80 ? 'B' : analysisData.scores.pitch >= 70 ? 'C' : 'D',
                                                                        clarity: analysisData.scores.clarity >= 90 ? 'A' : analysisData.scores.clarity >= 80 ? 'B' : analysisData.scores.clarity >= 70 ? 'C' : 'D'
                                                                    } : {})}
                                                                    size={140}
                                                                    showLabels={false}
                                                                    showGrid={false}
                                                                    isPreview={true}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                fontSize: '16px',
                                                                color: isProcessing ? '#1976d2' : '#999',
                                                                textAlign: 'center',
                                                                lineHeight: '1.3',
                                                                fontWeight: '500'
                                                            }}>
                                                                {isProcessing ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                        <div 
                                                                            className="analysis-spinner"
                                                                            style={{
                                                                                width: '20px',
                                                                                height: '20px',
                                                                                border: '3px solid #e3f2fd',
                                                                                borderTopColor: '#1976d2',
                                                                                borderRadius: '50%'
                                                                            }}
                                                                        ></div>
                                                                        <div>분석<br/>진행중</div>
                                                                    </div>
                                                                ) : (
                                                                    <>분석<br/>대기중</>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 비디오가 없을 때 분석 상태 표시 */}
                                            {!presentation.videoUrl && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '20px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e9ecef',
                                                    minHeight: '120px'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        textAlign: 'center'
                                                    }}>
                                                        {hasAnalysis ? (
                                                            <div style={{
                                                                width: '120px',
                                                                height: '120px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'visible',
                                                                padding: '5px'
                                                            }}>
                                                                <PentagonChart
                                                                    data={analysisData.grades || (analysisData.scores ? {
                                                                        voice: analysisData.scores.voice >= 90 ? 'A' : analysisData.scores.voice >= 80 ? 'B' : analysisData.scores.voice >= 70 ? 'C' : 'D',
                                                                        speed: analysisData.scores.speed >= 90 ? 'A' : analysisData.scores.speed >= 80 ? 'B' : analysisData.scores.speed >= 70 ? 'C' : 'D',
                                                                        expression: analysisData.scores.expression >= 90 ? 'A' : analysisData.scores.expression >= 80 ? 'B' : analysisData.scores.expression >= 70 ? 'C' : 'D',
                                                                        pitch: analysisData.scores.pitch >= 90 ? 'A' : analysisData.scores.pitch >= 80 ? 'B' : analysisData.scores.pitch >= 70 ? 'C' : 'D',
                                                                        clarity: analysisData.scores.clarity >= 90 ? 'A' : analysisData.scores.clarity >= 80 ? 'B' : analysisData.scores.clarity >= 70 ? 'C' : 'D'
                                                                    } : {})}
                                                                    size={110}
                                                                    showLabels={false}
                                                                    showGrid={false}
                                                                    isPreview={true}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {isProcessing ? (
                                                                    <>
                                                                        <div 
                                                                            className="analysis-spinner"
                                                                            style={{
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                border: '3px solid #e3f2fd',
                                                                                borderTopColor: '#1976d2',
                                                                                borderRadius: '50%'
                                                                            }}
                                                                        ></div>
                                                                        <div style={{
                                                                            fontSize: '14px',
                                                                            color: '#1976d2',
                                                                            fontWeight: '500'
                                                                        }}>
                                                                            분석 진행중
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div style={{
                                                                        fontSize: '14px',
                                                                        color: '#999',
                                                                        fontWeight: '500'
                                                                    }}>
                                                                        분석 대기중
                                                                    </div>
                                                                )}
                                                            </>
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
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .analysis-spinner {
                    animation: spin 1s linear infinite;
                }
            `}</style>
            {/* user가 없으면 사이드바를 렌더링하지 않음 */}
            {(!user || (!user.userId && !user.id && !user.email)) ? null : (
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
            )}
        </>
    );
};

export default CollapsibleSidebar; 