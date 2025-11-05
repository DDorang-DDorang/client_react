import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import PentagonChart from '../components/PentagonChart';
import CommentSection from '../components/CommentSection';
import videoAnalysisService from '../api/videoAnalysisService';
import useAuthValidation from '../hooks/useAuthValidation';
import { Box, Container, Typography, CircularProgress, Paper, Alert, Fab, Tooltip } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import useError from '../hooks/useError';
import useLoading from '../hooks/useLoading';
import theme from '../theme';

// 기본 분석 데이터
const defaultAnalysisData = {
    scores: {
        voice: 75,
        speed: 75,
        expression: 75,
        pitch: 75,
        clarity: 75
    },
    details: {
        voice: {
            grade: 'N/A',
            score: 0,
            text: '분석 결과가 없습니다.',
            db: 0
        },
        speed: {
            grade: 'N/A',
            score: 0,
            text: '분석 결과가 없습니다.',
            wpm: 0
        },
        expression: {
            grade: 'N/A',
            score: 75,
            text: '표정 분석 기능은 현재 개발 중입니다.',
        },
        pitch: {
            grade: 'N/A',
            score: 0,
            text: '분석 결과가 없습니다.',
            avg: 0
        },
        clarity: {
            score: 0
        }
    },
    transcription: '음성 인식 결과가 없습니다.'
};

// 등급을 점수로 변환하는 함수
const gradeToScore = (grade) => {
    if (!grade) return 75;
    
    const gradeScores = {
        'A': 90,
        'B': 80,
        'C': 70,
        'D': 60,
        'E': 50,
        'F': 40
    };
    
    return gradeScores[grade] || 75;
};

// 점수를 등급으로 변환하는 함수
const calculateGradeFromScore = (score) => {
    if (typeof score === 'string') return score;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    if (score >= 50) return 'E';
    return 'F';
};

// 점수 계산 함수
const calculateScore = (grade) => {
    return gradeToScore(grade);
};

const VideoAnalysis = () => {
    const { presentationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [analysisData, setAnalysisData] = useState(null);
    const [videoData, setVideoData] = useState(null);
    const { error, setError, resetError } = useError('');
    const { loading, setLoading } = useLoading(true);
    const [pageData, setPageData] = useState(null);
    
    // 오른쪽 영역 뷰 상태 추가
    const [currentView, setCurrentView] = useState('analysis'); // 'analysis' | 'feedback' | 'transcript'
    
    // 비디오 재생 시간 상태
    const [currentVideoTime, setCurrentVideoTime] = useState(0);
    
    // LLM 피드백 상태
    const [feedbackData, setFeedbackData] = useState(null);
    
    // 대본 관련 상태
    const [transcriptText, setTranscriptText] = useState('');
    const [editedTranscript, setEditedTranscript] = useState('');
    
    // 메인 비디오 ref 추가
    const mainVideoRef = React.useRef(null);

    // 인증 검증 활성화 (토큰 만료 시 로그인으로 리다이렉트)
    useAuthValidation();

    console.log('=== VideoAnalysis 컴포넌트 렌더링 ===');
    console.log('presentationId:', presentationId);
    console.log('location.pathname:', location.pathname);
    console.log('window.location:', window.location.href);

    // PentagonChart에서 사용할 라벨 정의
    const labels = {
        voice: '음성',
        speed: '속도',
        expression: '표정',
        pitch: '피치',
        clarity: '명확성'
    };

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    // 비디오 시간 업데이트 핸들러
    const handleVideoTimeUpdate = (time) => {
        setCurrentVideoTime(time);
    };

    // 비디오 시간 이동 핸들러
    const handleSeekToTime = (time) => {
        // 메인 비디오 ref를 사용하여 특정 비디오만 제어
        if (mainVideoRef.current) {
            mainVideoRef.current.currentTime = time;
            setCurrentVideoTime(time);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            // presentationId가 없으면 대시보드로 리다이렉트
            if (!presentationId) {
                console.error('VideoAnalysis: presentationId가 없습니다');
                setError('분석 결과를 찾을 수 없습니다. 대시보드로 이동합니다.');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
                return;
            }

            console.log('=== VideoAnalysis useEffect 실행 ===');
            console.log('VideoAnalysis 마운트됨, presentationId:', presentationId);
            console.log('location.state:', location.state);
            console.log('현재 URL:', window.location.href);
        
        // React Router state 또는 localStorage에서 데이터 확인
        let stateData = location.state;
        
        if (!stateData) {
            console.log('React Router state가 없습니다. localStorage 확인 중...');
            try {
                const savedState = localStorage.getItem('videoAnalysisState');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    console.log('localStorage에서 상태 복원:', parsedState);
                    
                    // presentationId가 일치하는지 확인
                    if (parsedState.presentationId === presentationId) {
                        // 데이터가 너무 오래되었으면 무시 (1시간)
                        const ageInMs = Date.now() - (parsedState.timestamp || 0);
                        const oneHour = 60 * 60 * 1000;
                        
                        if (ageInMs < oneHour) {
                            stateData = parsedState;
                            console.log('유효한 localStorage 데이터 사용');
                        } else {
                            console.log('localStorage 데이터가 오래되어 무시');
                            localStorage.removeItem('videoAnalysisState');
                        }
                    } else {
                        console.log('localStorage의 presentationId가 일치하지 않음');
                        localStorage.removeItem('videoAnalysisState');
                    }
                }
            } catch (e) {
                console.warn('localStorage 읽기 실패:', e);
                localStorage.removeItem('videoAnalysisState');
            }
        } else {
            // React Router state가 있으면 localStorage는 정리
            console.log('React Router state 사용, localStorage 정리');
            localStorage.removeItem('videoAnalysisState');
        }
        
        if (stateData) {
            console.log('페이지 데이터 설정:', stateData);
            setPageData(stateData);
            
            // 비디오 데이터 설정
            if (stateData.presentationData) {
                setVideoData(stateData.presentationData);
            }
            
            // forceRefresh 플래그가 있으면 무조건 DB에서 새로 로드
            if (stateData.forceRefresh) {
                console.log('강제 새로고침 플래그 감지 - DB에서 최신 데이터 로드');
                console.log('stateData:', stateData);
                
                // pageData 설정 (forceRefresh 시에도 데이터 전달)
                setPageData(stateData);
                
                // 비디오 데이터 설정
                if (stateData.presentationData) {
                    setVideoData(stateData.presentationData);
                }
                
                // 기존 상태 초기화
                setAnalysisData(null);
                setFeedbackData(null);
                setTranscriptText('');
                setEditedTranscript('');
                
                // 캐시 무시하고 강제로 새로 로드 (pageData 전달)
                await loadAnalysisResults(stateData);
                return;
            }
            
            // 이미 분석 데이터가 있으면 API 호출 없이 사용
            if (stateData.analysisData) {
                console.log('기존 분석 데이터 사용:', stateData.analysisData);
                // 기존 데이터가 FastAPI 형식이므로 Spring Boot 형식으로 변환
                const processedData = convertSpringBootDataToDisplayFormat(stateData.analysisData);
                console.log('처리된 분석 데이터:', processedData);
                setAnalysisData(processedData);
                setLoading(false);
                return;
            }
        }
        
        // 분석 데이터가 없으면 서버에서 로드
        loadAnalysisResults();
        };
        
        loadData();
    }, [presentationId, location.state, navigate]);

    const loadAnalysisResults = async (passedPageData = null) => {
        try {
            setLoading(true);
            resetError();
            
            console.log('=== DB에서 분석 결과 로드 시작 ===');
            console.log('presentationId:', presentationId);
            
            // 모든 분석 결과 조회 (캐시 무시)
            const result = await videoAnalysisService.getAllAnalysisResults(presentationId);
            
            console.log('API 응답:', result);
            
            if (result.success && result.data) {
                console.log('=== 분석 결과 로드 성공 ===');
                console.log('로드된 데이터:', result.data);
                
                // 피드백 데이터 설정
                if (result.data.feedback) {
                    setFeedbackData(result.data.feedback);
                }
                
                // VoiceAnalysis 데이터 처리
                if (result.data.voiceAnalysis) {
                    console.log('VoiceAnalysis 데이터 발견:', result.data.voiceAnalysis);
                    console.log('STT 결과:', result.data.sttResult);
                    const convertedData = convertSpringBootDataToDisplayFormat(result.data.voiceAnalysis, result.data.sttResult);
                    console.log('변환된 데이터:', convertedData);
                    setAnalysisData(convertedData);
                }
                
                // STT 결과 처리
                if (result.data.sttResult) {
                    console.log('STT 결과 발견:', result.data.sttResult);
                    // transcription을 transcriptText로 설정
                    if (result.data.sttResult.transcription) {
                        setTranscriptText(result.data.sttResult.transcription);
                    }
                    // correctedScript를 editedTranscript로 설정
                    if (result.data.sttResult.correctedScript) {
                        setEditedTranscript(result.data.sttResult.correctedScript);
                    }
                    // STT 결과가 있지만 VoiceAnalysis가 없는 경우, STT 데이터로 기본 분석 데이터 생성
                    if (!result.data.voiceAnalysis) {
                        console.log('VoiceAnalysis가 없어서 STT 기반 데이터 생성');
                        const sttBasedData = createAnalysisDataFromStt(result.data.sttResult);
                        setAnalysisData(sttBasedData);
                    }
                }
                
                // 비디오 데이터 설정 (전달된 pageData 우선 사용)
                const currentPageData = passedPageData || pageData;
                if (currentPageData?.presentationData) {
                    console.log('비디오 데이터 설정:', currentPageData.presentationData);
                    setVideoData(currentPageData.presentationData);
                } else {
                    console.log('비디오 데이터가 없습니다. currentPageData:', currentPageData);
                }
            } else {
                console.log('=== 분석 결과가 없음 ===');
                console.log('result.success:', result.success);
                console.log('result.data:', result.data);
                console.log('result.error:', result.error);
                setAnalysisData(createDefaultAnalysisData());
            }
        } catch (error) {
            console.error('=== 분석 결과 로드 실패 ===');
            console.error('에러 상세:', error);
            console.error('에러 응답:', error.response);
            console.error('에러 메시지:', error.message);
            
            // 404 오류인 경우 프레젠테이션이 삭제된 것으로 간주
            if (error.response && error.response.status === 404) {
                console.log('프레젠테이션이 삭제되었습니다. 대시보드로 이동합니다.');
                navigate('/dashboard', { replace: true });
                return;
            }
            
            setError(`분석 결과를 불러올 수 없습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setLoading(false);
        }
    };

    const convertSpringBootDataToDisplayFormat = (voiceAnalysisData, sttResult = null) => {
        if (!voiceAnalysisData) {
            return createDefaultAnalysisData();
        }

        console.log('VoiceAnalysis 데이터 변환:', voiceAnalysisData);
        console.log('STT 결과:', sttResult);

        // 점수 계산
        const scores = {
            voice: calculateVoiceScore(voiceAnalysisData) || 'C',
            speed: calculateSpeedScore(voiceAnalysisData) || 'C',
            expression: calculateExpressionScore(voiceAnalysisData) || 'C',
            pitch: calculatePitchScore(voiceAnalysisData) || 'C',
            clarity: sttResult?.pronunciationScore ? calculatePronunciationScore(sttResult) : 'C'
        };

        // 상세 분석 정보
        const details = {
            voice: {
                grade: voiceAnalysisData.intensityGrade || 'C',
                score: scores.voice,
                text: voiceAnalysisData.intensityText || '음성 강도가 적절합니다.'
            },
            speed: {
                grade: voiceAnalysisData.wpmGrade || 'C',
                score: scores.speed,
                text: voiceAnalysisData.wpmComment || '말하기 속도가 적당합니다.'
            },
            expression: {
                grade: voiceAnalysisData.expressionGrade || 'C',
                score: scores.expression,
                text: voiceAnalysisData.expressionText || '표정 분석이 완료되었습니다.'
            },
            pitch: {
                grade: voiceAnalysisData.pitchGrade || 'C',
                score: scores.pitch,
                text: voiceAnalysisData.pitchText || '피치 변화가 자연스럽습니다.'
            },
            clarity: {
                grade: scores.clarity,
                score: scores.clarity,
                text: sttResult?.pronunciationScore ? 
                    `발음 정확도: ${(sttResult.pronunciationScore * 100).toFixed(1)}%` : 
                    '발음 정확도 분석 기능은 현재 개발 중입니다.'
            }
        };

        return {
            scores,
            details,
            transcription: sttResult?.transcription || '',
            adjustedScript: sttResult?.adjustedScript || '',
            correctedScript: sttResult?.correctedScript || ''
        };
    };

    const createAnalysisDataFromStt = (sttResult) => {
        console.log('STT 데이터로부터 분석 데이터 생성:', sttResult);
        
        // 기본 점수 설정
        const scores = {
            voice: 'C',
            speed: 'C',
            expression: 'C',
            pitch: 'C',
            clarity: sttResult.pronunciationScore ? calculatePronunciationScore(sttResult) : 'C'
        };

        // 상세 분석 정보
        const details = {
                voice: {
                grade: 'C',
                score: scores.voice,
                text: '음성 강도 분석이 완료되지 않았습니다.',
                },
                speed: {
                grade: 'C',
                score: scores.speed,
                text: '말하기 속도 분석이 완료되지 않았습니다.',
                },
                expression: {
                    grade: 'C',
                score: scores.expression,
                    text: '표정 분석이 완료되지 않았습니다.',
                },
                pitch: {
                grade: 'C',
                score: scores.pitch,
                    text: '피치 분석이 완료되지 않았습니다.',
                },
                clarity: {
                grade: scores.clarity,
                score: scores.clarity,
                text: sttResult.pronunciationScore ? 
                    `발음 정확도: ${(sttResult.pronunciationScore * 100).toFixed(1)}%` : 
                    '발음 정확도 분석이 완료되지 않았습니다.',
            }
        };

        return {
            scores,
            details,
            transcription: sttResult.transcription || '',
            adjustedScript: sttResult.adjustedScript || '',
            correctedScript: sttResult.correctedScript || ''
        };
    };

    // 점수 계산 헬퍼 함수들
    const calculateVoiceScore = (data) => {
        if (!data || !data.intensityGrade) return 'C';
        return data.intensityGrade;
    };

    const calculateSpeedScore = (data) => {
        if (!data || !data.wpmGrade) return 'C';
        return data.wpmGrade;
    };

    const calculatePitchScore = (data) => {
        if (!data || !data.pitchGrade) return 'C';
        return data.pitchGrade;
    };

    const calculateExpressionScore = (data) => {
        if (!data || !data.expressionGrade) return 'C';
        
        // 한글 등급을 영문 등급으로 변환
        const koreanToEnglish = {
            '매우 좋음': 'A',
            '좋음': 'B', 
            '보통': 'C',
            '나쁨': 'D',
            '매우 나쁨': 'F'
        };
        
        return koreanToEnglish[data.expressionGrade] || data.expressionGrade;
    };

    const calculateClarityScore = (data) => {
        // 명확도 분석은 아직 구현되지 않음
        return 'C';
    };

    const calculatePronunciationScore = (data) => {
        if (!data || !data.pronunciationScore) return 'C';
        // 발음 점수는 0-1 범위이므로 A-E 등급으로 변환
        const score = data.pronunciationScore;
        if (score >= 0.85) return 'A';
        if (score >= 0.75) return 'B';
        if (score >= 0.65) return 'C';
        if (score >= 0.55) return 'D';
        return 'E';
    };


    // 기본 분석 데이터 생성
    const createDefaultAnalysisData = () => {
        return {
            scores: {
                voice: 'C',
                speed: 'C',
                expression: 'C',
                pitch: 'C',
                clarity: 'C'
            },
            details: {
                voice: {
                    grade: 'N/A',
                    score: 75,
                    text: '목소리 크기와 볼륨의 일관성을 평가합니다.',
                },
                speed: {
                    grade: 'N/A',
                    score: 72,
                    text: '분당 단어 수를 기준으로 말하기 속도를 평가합니다.',
                },
                expression: {
                    grade: 'N/A',
                    score: 75,
                    text: '표정의 자연스러움과 적절성을 평가합니다.',
                },
                pitch: {
                    grade: 'N/A',
                    score: 78,
                    text: '목소리의 높낮이 변화와 억양을 평가합니다.',
                },
                clarity: {
                    score: 82,
                    text: '발음의 명확성과 정확도를 평가합니다.',
                }
            },
            transcription: '분석 결과를 불러올 수 없습니다. 음성이 포함된 비디오를 업로드하면 음성 인식 결과와 함께 더 상세한 분석을 제공합니다.',
            adjustedScript: '',
            correctedScript: ''
        };
    };

    const getScoreColor = (grade) => {
        if (typeof grade === 'string') {
            // 등급 기반 색상
            const gradeColors = {
                'A': '#4CAF50', // 녹색
                'B': '#8BC34A', // 연한 녹색
                'C': '#FF9800', // 주황색
                'D': '#FF5722', // 진한 주황색
                'E': '#F44336', // 빨간색
                'F': '#D32F2F'  // 진한 빨간색
            };
            return gradeColors[grade] || '#FF9800';
        } else {
            // 숫자 점수 기반 색상 (기존 호환성)
            if (grade >= 80) return '#4CAF50';
            if (grade >= 60) return '#FF9800';
            return '#F44336';
        }
    };

    const getScoreText = (grade) => {
        if (typeof grade === 'string') {
            // 등급 기반 텍스트
            const gradeTexts = {
                'A': '우수',
                'B': '양호',
                'C': '보통',
                'D': '미흡',
                'E': '부족',
                'F': '매우 부족'
            };
            return gradeTexts[grade] || '보통';
        } else {
            // 숫자 점수 기반 텍스트 (기존 호환성)
            if (grade >= 80) return '우수';
            if (grade >= 60) return '보통';
        return '개선 필요';
        }
    };


    

    
    const renderFeedbackTab = () => {
        if (!feedbackData) {
            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666666'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                    <div>AI 피드백이 아직 준비되지 않았습니다.</div>
                    <div style={{ fontSize: '14px', marginTop: '8px' }}>
                        분석이 완료되면 여기에 표시됩니다.
                    </div>
                </div>
            );
        }

        return (
            <div style={{
                padding: '20px',
                height: '100%',
                overflowY: 'auto'
            }}>
                <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#000000',
                    margin: '0 0 20px 0',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    🤖 AI 피드백
                </h3>

                {/* 자주 사용된 단어 */}
                {feedbackData.frequentWords && feedbackData.frequentWords.length > 0 && (
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        border: '1px solid #e9ecef'
                    }}>
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#000000',
                            margin: '0 0 12px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            📊 자주 사용된 단어
                        </h4>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {feedbackData.frequentWords.map((word, index) => (
                                <span key={index} style={{
                                    backgroundColor: '#007bff',
                                    color: '#ffffff',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {word}
                    </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 어색한 문장 개선 제안 */}
                {feedbackData.awkwardSentences && feedbackData.awkwardSentences.length > 0 && (
                    <div style={{
                        backgroundColor: '#fff3cd',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        border: '1px solid #ffeaa7'
                    }}>
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#856404',
                            margin: '0 0 12px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            ✏️ 어색한 문장 개선 제안
                        </h4>
                        {feedbackData.awkwardSentences.map((sentence, index) => (
                            <div key={index} style={{
                                marginBottom: '16px',
                                padding: '12px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #ffeaa7'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#856404',
                                    marginBottom: '8px',
                                    fontWeight: '500'
                                }}>
                                    원문:
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    marginBottom: '12px',
                                    fontStyle: 'italic'
                                }}>
                                    "{sentence.original}"
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#856404',
                                    marginBottom: '8px',
                                    fontWeight: '500'
                                }}>
                                    개선안:
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#28a745',
                                    fontWeight: '500'
                                }}>
                                    "{sentence.suggestion}"
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 난이도 문제 */}
                {feedbackData.difficultyIssues && feedbackData.difficultyIssues.length > 0 && (
                    <div style={{
                        backgroundColor: '#d1ecf1',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        border: '1px solid #bee5eb'
                    }}>
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#0c5460',
                            margin: '0 0 12px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            📈 난이도 분석
                        </h4>
                        {feedbackData.difficultyIssues.map((issue, index) => (
                            <div key={index} style={{
                                marginBottom: '16px',
                                padding: '12px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #bee5eb'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#0c5460',
                                    marginBottom: '8px',
                                    fontWeight: '500'
                                }}>
                                    {issue.type === 'too_easy' ? '🟢 너무 쉬운 표현' : '🔴 복잡한 표현'}:
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    marginBottom: '12px',
                                    fontStyle: 'italic'
                                }}>
                                    "{issue.sentence}"
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#0c5460',
                                    marginBottom: '8px',
                                    fontWeight: '500'
                                }}>
                                    개선안:
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#28a745',
                                    fontWeight: '500'
                                }}>
                                    "{issue.suggestion}"
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 예측 질문 */}
                {feedbackData.predictedQuestions && feedbackData.predictedQuestions.length > 0 && (
                    <div style={{
                        backgroundColor: '#d4edda',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        border: '1px solid #c3e6cb'
                    }}>
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#155724',
                            margin: '0 0 12px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            ❓ 예상 질문
                        </h4>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {feedbackData.predictedQuestions.map((question, index) => (
                                <div key={index} style={{
                                    padding: '12px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #c3e6cb',
                                    fontSize: '14px',
                                    color: '#155724'
                                }}>
                                    {index + 1}. {question}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 대본 관련 함수들
    const handleSaveTranscript = () => {
        // 대본 저장 로직 (필요시 구현)
        console.log('대본 저장됨');
    };

    const handleEditTranscript = () => {
        // 대본 편집 모드 활성화
        console.log('대본 편집 모드');
    };

    const handleBackToAnalysis = () => {
        setCurrentView('analysis');
    };
    
    const renderTranscriptTab = () => {
        return (
            <div style={{
                padding: '20px',
                height: '100%',
                overflowY: 'auto'
            }}>
                <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#000000',
                    margin: '0 0 20px 0',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    📝 발표 대본
                </h3>

                {/* 원본 대본 (correctedScript) */}
                {editedTranscript && (
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#000000',
                            marginBottom: '8px',
                            display: 'block'
                        }}>
                            원본 대본 (STT 결과):
                        </label>
                        <div style={{
                            padding: '16px',
                            border: '1px solid #e9ecef',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#333333',
                            minHeight: '120px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {editedTranscript}
                        </div>
                    </div>
                )}

                {/* AI 수정된 대본 (adjustedScript) */}
                {finalAnalysisData.adjustedScript && (
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#000000',
                            marginBottom: '8px',
                            display: 'block'
                        }}>
                            AI 수정된 대본:
                        </label>
                        <div style={{
                            padding: '16px',
                            border: '1px solid #e9ecef',
                            borderRadius: '8px',
                            backgroundColor: '#f0f8ff',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#333333',
                            minHeight: '120px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {finalAnalysisData.adjustedScript}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: '#666666',
                            fontStyle: 'italic',
                            marginTop: '8px'
                        }}>
                            💡 AI가 원본 대본을 분석하여 더 자연스럽고 명확한 표현으로 수정했습니다.
                        </div>
                    </div>
                )}

                {/* 대본이 없는 경우 */}
                {!editedTranscript && !finalAnalysisData.adjustedScript && (
                    <div style={{
                        textAlign: 'center',
                        color: '#666666',
                        padding: '40px 20px',
                        fontSize: '16px'
                    }}>
                        음성이 포함된 영상을 업로드하면 STT 분석 결과를 확인할 수 있습니다.
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '18px',
                color: '#666666'
            }}>
                분석 결과를 불러오는 중...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{
                    color: '#F44336',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#2C2C2C',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );
    }

    const finalAnalysisData = analysisData || createDefaultAnalysisData();
    console.log('finalAnalysisData:', finalAnalysisData);
    console.log('transcription:', finalAnalysisData.transcription);

    // scores가 없을 경우를 대비한 안전장치
    const scores = finalAnalysisData?.scores || {
        voice: 'C',
        speed: 'C',
        anxiety: 'C',
        eyeContact: 'C',
        pitch: 'C',
        clarity: 'C'
    };

    // 평균 점수 계산을 위한 안전장치
    const averageScore = (() => {
        const gradeValues = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
        
        let totalGradeValue = 0;
        let gradeCount = 0;
        
        Object.entries(scores).forEach(([key, value]) => {
            if (typeof value === 'string' && gradeValues[value] !== undefined) {
                totalGradeValue += gradeValues[value];
                gradeCount++;
            }
        });
        
        // 등급 평균 계산
        const averageGradeValue = gradeCount > 0 ? totalGradeValue / gradeCount : 3;
        const averageGrade = Object.keys(gradeValues).find(key => 
            gradeValues[key] === Math.round(averageGradeValue)
        ) || 'C';
        
        return { grade: averageGrade };
    })();

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            position: 'relative',
            background: 'white',
            overflow: 'hidden'
        }}>
            {/* Navbar */}
            <Navbar 
                isCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                showSidebarToggle={true}
            />

            {/* Collapsible Sidebar */}
            <CollapsibleSidebar 
                isCollapsed={isSidebarCollapsed}
            />

            {/* Main Content Area */}
            <div style={{
                marginLeft: isSidebarCollapsed ? 0 : 427,
                marginTop: 70,
                height: 'calc(100vh - 70px)',
                transition: 'margin-left 0.3s ease-in-out',
                display: 'flex',
                gap: '20px',
                padding: isSidebarCollapsed ? '0 20px' : '0'
            }}>
                {/* Left Side - Video and Overall Score */}
                <div style={{
                    width: '60%',
                    padding: '30px 20px',
                    overflowY: 'auto'
                }}>
                    {/* Header */}
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
                            발표 분석 결과
                        </h1>
                        <p style={{
                            fontSize: '16px',
                            color: '#666666',
                            margin: 0,
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            AI가 분석한 당신의 발표 능력을 확인해보세요
                        </p>
                    </div>

                    {/* Video Player */}
                    <div style={{
                        width: '100%',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#000000',
                            margin: '0 0 16px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            📹 분석된 영상
                        </h3>
                        <div style={{
                            width: '100%',
                            height: isSidebarCollapsed ? '500px' : '400px',
                            backgroundColor: '#000000',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            {videoData && (videoData.videoUrl || videoData.url) ? (
                                <video
                                    ref={mainVideoRef}
                                    controls
                                    src={videoData.videoUrl || videoData.url}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '12px',
                                        objectFit: 'contain'
                                    }}
                                    onTimeUpdate={(e) => handleVideoTimeUpdate(e.target.currentTime)}
                                />
                            ) : (
                                <div style={{
                                    color: '#ffffff',
                                    fontSize: '16px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎥</div>
                                    <div>분석된 영상이 여기에 표시됩니다</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 댓글 섹션 */}
                    <CommentSection 
                        presentationId={presentationId} 
                        currentTime={currentVideoTime}
                        onSeekToTime={handleSeekToTime}
                    />

                    {/* Overall Score Summary */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        border: '1px solid #e9ecef',
                        textAlign: 'center'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#000000',
                            margin: '0 0 16px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            종합 점수
                        </h3>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: '700',
                                color: getScoreColor(averageScore.grade)
                            }}>
                                {averageScore.grade}등급
                            </div>
                            <div style={{
                                textAlign: 'left'
                            }}>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    color: '#000000',
                                    marginBottom: '4px'
                                }}>
                                    {getScoreText(averageScore.grade)}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#666666'
                                }}>
                                    {Object.keys(scores).length}개 영역 평균
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <button
                            onClick={() => navigate('/comparison')}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#9c27b0',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'background-color 0.2s ease',
                                flex: 1
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#7b1fa2';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#9c27b0';
                            }}
                        >
                             발표 비교
                        </button>
                        
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#2C2C2C',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'background-color 0.2s ease',
                                flex: 1
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#1C1C1C';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#2C2C2C';
                            }}
                        >
                             대시보드
                        </button>
                    </div>
                </div>

                {/* Right Sidebar - 조건부 렌더링 */}
                <div style={{
                    width: '40%',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    borderLeft: '1px solid #e9ecef',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        padding: '30px 20px 20px 20px',
                        height: '100%',
                        position: 'relative'
                    }}>
                        {currentView === 'analysis' ? (
                            <PentagonChart 
                                data={finalAnalysisData.scores} 
                                analysisDetails={finalAnalysisData.details}
                            />
                        ) : currentView === 'feedback' ? (
                            renderFeedbackTab()
                        ) : currentView === 'transcript' ? (
                            renderTranscriptTab()
                        ) : null}
                                </div>
                </div>
            </div>

            {/* 대본 저장 버튼 - 대본 수정 모드일 때만 표시 */}
            {/* 플로팅 버튼 - 3개 탭 순환 */}
            <Tooltip title={
                currentView === 'analysis' ? '피드백 보기' : 
                currentView === 'feedback' ? '대본 보기' :
                '분석 결과'
            } placement="left">
                <Fab
                    color="primary"
                    aria-label={
                        currentView === 'analysis' ? 'show feedback' : 
                        currentView === 'feedback' ? 'show transcript' :
                        'back to analysis'
                    }
                    onClick={() => {
                        if (currentView === 'analysis') {
                            setCurrentView('feedback');
                        } else if (currentView === 'feedback') {
                            setCurrentView('transcript');
                        } else {
                            setCurrentView('analysis');
                        }
                    }}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#2C2C2C',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                        },
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        width: 64,
                        height: 64,
                        fontSize: '24px'
                    }}
                >
                    {currentView === 'analysis' ? '🤖' : 
                     currentView === 'feedback' ? '📝' : '📊'}
                </Fab>
            </Tooltip>
        </div>
    );
};

export default VideoAnalysis; 