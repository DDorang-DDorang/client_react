import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import HexagonChart from '../components/HexagonChart';
import videoAnalysisService from '../api/videoAnalysisService';
import useAuthValidation from '../hooks/useAuthValidation';

// 기본 분석 데이터
const defaultAnalysisData = {
    scores: {
        voice: 0,
        speed: 0,
        pitch: 0,
        pronunciation: 0
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
        pitch: {
            grade: 'N/A',
            score: 0,
            text: '분석 결과가 없습니다.',
            avg: 0
        },
        pronunciation: {
            score: 0
        }
    },
    transcription: '음성 인식 결과가 없습니다.'
};

// 점수 계산 함수
const calculateScore = (grade) => {
    if (!grade) return 0;
    
    const gradeScores = {
        'A+': 100,
        'A': 95,
        'A-': 90,
        'B+': 85,
        'B': 80,
        'B-': 75,
        'C+': 70,
        'C': 65,
        'C-': 60,
        'D+': 55,
        'D': 50,
        'D-': 45,
        'F': 0
    };
    
    return gradeScores[grade] || 0;
};

const VideoAnalysis = () => {
    const { presentationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [videoData, setVideoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pageData, setPageData] = useState(null);

    // 인증 검증 스킵 (리디렉션 방지)
    useAuthValidation(true);

    console.log('=== VideoAnalysis 컴포넌트 렌더링 ===');
    console.log('presentationId:', presentationId);
    console.log('location.pathname:', location.pathname);
    console.log('window.location:', window.location.href);

    // HexagonChart에서 사용할 라벨 정의
    const labels = {
        voice: '음성',
        speed: '속도',
        gesture: '제스처',
        eyeContact: '시선',
        confidence: '자신감',
        clarity: '명확성'
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    useEffect(() => {
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
            
            // 이미 분석 데이터가 있으면 API 호출 없이 사용
            if (stateData.analysisData) {
                console.log('기존 분석 데이터 사용:', stateData.analysisData);
                const processedData = convertFastApiDataToDisplayFormat(stateData.analysisData);
                console.log('처리된 분석 데이터:', processedData);
                setAnalysisData(processedData);
                setLoading(false);
                return;
            }
        }
        
        // 분석 데이터가 없으면 서버에서 로드
        loadAnalysisResults();
    }, [presentationId, location.state, navigate]);

    const loadAnalysisResults = async () => {
        if (!presentationId) {
            setError('분석 ID가 없습니다. 대시보드로 이동합니다.');
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
            return;
        }

        try {
            setLoading(true);
            console.log('서버에서 분석 결과 로드 중...');
            console.log('presentationId:', presentationId);
            const response = await videoAnalysisService.getAllAnalysisResults(presentationId);
            
            console.log('=== 서버 응답 상세 분석 ===');
            console.log('response.success:', response.success);
            console.log('response.data:', response.data);
            console.log('response.data type:', typeof response.data);
            
            if (response.success) {
                console.log('서버 분석 결과 성공:', response.data);
                const processedData = convertSpringBootDataToDisplayFormat(response.data);
                console.log('처리된 서버 데이터:', processedData);
                setAnalysisData(processedData);
            } else {
                console.error('서버 응답 실패:', response.error);
                setError(response.error || '분석 결과를 불러올 수 없습니다.');
            }
        } catch (err) {
            console.error('분석 결과 로드 오류:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('인증이 만료되었습니다. 다시 로그인해주세요.');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    const convertSpringBootDataToDisplayFormat = (data) => {
        console.log('Spring Boot 데이터 변환 시작:', data);
        console.log('데이터 타입:', typeof data);
        console.log('데이터 키:', Object.keys(data));
        
        if (!data) {
            console.log('데이터가 없음');
            return createDefaultAnalysisData();
        }

        // FastAPI 응답 데이터 변환
        console.log('FastAPI 응답 데이터 변환');
        console.log('voiceAnalysis:', data.voiceAnalysis);
        console.log('sttResult:', data.sttResult);
        
        const fastApiData = {
            id: data.voiceAnalysis?.voiceAnalysisId,
            presentationId: data.presentationId,
            presentationTitle: data.title,
            intensityGrade: data.voiceAnalysis?.intensityGrade,
            intensityDb: data.voiceAnalysis?.intensityDb,
            intensityText: data.voiceAnalysis?.intensityText,
            pitchGrade: data.voiceAnalysis?.pitchGrade,
            pitchAvg: data.voiceAnalysis?.pitchAvg,
            pitchText: data.voiceAnalysis?.pitchText,
            wpmGrade: data.voiceAnalysis?.wpmGrade,
            wpmAvg: data.voiceAnalysis?.wpmAvg,
            wpmComment: data.voiceAnalysis?.wpmComment,
            transcription: data.sttResult?.transcription,
            pronunciationScore: data.sttResult?.pronunciationScore
        };

        console.log('FastAPI 데이터 변환 시작:', fastApiData);
        console.log('transcription 값:', fastApiData.transcription);
        console.log('pronunciationScore 값:', fastApiData.pronunciationScore);

        // 점수 계산
        const scores = {
            voice: calculateVoiceScore(fastApiData),
            speed: calculateSpeedScore(fastApiData),
            gesture: 75, // 기본값
            eyeContact: 70, // 기본값
            confidence: calculateConfidenceScore(fastApiData),
            clarity: calculateClarityScore(fastApiData)
        };

        console.log('계산된 점수:', scores);

        // 상세 분석 정보
        const details = [
            {
                title: '음성 강도',
                score: scores.voice,
                description: fastApiData.intensityText || '음성 강도 분석 결과가 없습니다.',
                suggestions: getVoiceSuggestions(fastApiData.intensityGrade)
            },
            {
                title: '말하기 속도',
                score: scores.speed,
                description: fastApiData.wpmComment || '말하기 속도 분석 결과가 없습니다.',
                suggestions: getSpeedSuggestions(fastApiData.wpmGrade)
            },
            {
                title: '피치 변화',
                score: calculatePitchScore(fastApiData),
                description: fastApiData.pitchText || '피치 변화 분석 결과가 없습니다.',
                suggestions: getPitchSuggestions(fastApiData.pitchGrade)
            },
            {
                title: '발음 정확도',
                score: calculatePronunciationScore(fastApiData),
                description: `발음 정확도: ${(fastApiData.pronunciationScore * 100).toFixed(1)}%`,
                suggestions: getPronunciationSuggestions(fastApiData.pronunciationScore)
            }
        ];

        const result = {
            scores,
            details,
            transcript: fastApiData.transcription || '음성 인식 결과가 없습니다.'
        };

        console.log('변환된 결과:', result);
        return result;
    };

    const convertFastApiDataToDisplayFormat = (data) => {
        console.log('FastAPI 데이터 변환 시작:', data);
        
        if (!data) {
            console.log('데이터가 없어 기본값 반환');
            return defaultAnalysisData;
        }

        // FastAPI 응답 데이터 구조 변환
        const transformedData = {
            scores: {
                voice: calculateScore(data.intensity_grade),
                speed: calculateScore(data.wpm_grade),
                pitch: calculateScore(data.pitch_grade),
                pronunciation: data.pronunciation_score ? Math.round(data.pronunciation_score * 100) : 0
            },
            details: {
                voice: {
                    grade: data.intensity_grade,
                    score: calculateScore(data.intensity_grade),
                    text: data.intensity_text,
                    db: data.intensity_db
                },
                speed: {
                    grade: data.wpm_grade,
                    score: calculateScore(data.wpm_grade),
                    text: data.wpm_comment,
                    wpm: data.wpm_avg
                },
                pitch: {
                    grade: data.pitch_grade,
                    score: calculateScore(data.pitch_grade),
                    text: data.pitch_text,
                    avg: data.pitch_avg
                },
                pronunciation: {
                    score: data.pronunciation_score ? Math.round(data.pronunciation_score * 100) : 0
                }
            },
            transcription: data.transcription || '음성 인식 결과가 없습니다.'
        };

        console.log('변환된 데이터:', transformedData);
        return transformedData;
    };

    // 점수 계산 헬퍼 함수들
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

    const calculateConfidenceScore = (data) => {
        const voiceScore = calculateVoiceScore(data);
        const speedScore = calculateSpeedScore(data);
        const pitchScore = calculatePitchScore(data);
        return Math.round((voiceScore + speedScore + pitchScore) / 3);
    };

    const calculateClarityScore = (data) => {
        if (!data.pronunciationScore) return 75;
        return Math.round(data.pronunciationScore * 100);
    };

    const calculatePronunciationScore = (data) => {
        if (!data.pronunciationScore) return 75;
        return Math.round(data.pronunciationScore * 100);
    };

    // 제안사항 헬퍼 함수들
    const getVoiceSuggestions = (grade) => {
        const suggestions = {
            'A': ['현재 음성 강도가 적절합니다.', '계속 유지하세요.'],
            'B': ['음성 강도가 약간 낮습니다.', '조금 더 크게 말해보세요.'],
            'C': ['음성 강도가 낮습니다.', '마이크에 더 가까이 말해보세요.'],
            'D': ['음성 강도가 매우 낮습니다.', '마이크 설정을 확인해주세요.'],
            'F': ['음성이 거의 들리지 않습니다.', '마이크와 녹음 환경을 점검해주세요.']
        };
        return suggestions[grade] || ['음성 강도 분석이 필요합니다.'];
    };

    const getSpeedSuggestions = (grade) => {
        const suggestions = {
            'A': ['현재 말하기 속도가 적절합니다.', '계속 유지하세요.'],
            'B': ['말하기 속도가 약간 빠릅니다.', '조금 더 천천히 말해보세요.'],
            'C': ['말하기 속도가 빠릅니다.', '더 천천히 말해보세요.'],
            'D': ['말하기 속도가 매우 빠릅니다.', '훨씬 더 천천히 말해보세요.'],
            'F': ['말하기 속도가 너무 빠릅니다.', '매우 천천히 말해보세요.']
        };
        return suggestions[grade] || ['말하기 속도 분석이 필요합니다.'];
    };

    const getPitchSuggestions = (grade) => {
        const suggestions = {
            'A': ['현재 피치 변화가 자연스럽습니다.', '계속 유지하세요.'],
            'B': ['피치 변화가 약간 부자연스럽습니다.', '더 자연스럽게 말해보세요.'],
            'C': ['피치 변화가 부자연스럽습니다.', '억양을 더 자연스럽게 해보세요.'],
            'D': ['피치 변화가 매우 부자연스럽습니다.', '억양을 크게 개선해보세요.'],
            'F': ['피치 변화가 전혀 없습니다.', '억양을 완전히 바꿔보세요.']
        };
        return suggestions[grade] || ['피치 변화 분석이 필요합니다.'];
    };

    const getPronunciationSuggestions = (score) => {
        if (score >= 0.8) return ['발음이 매우 정확합니다.', '계속 유지하세요.'];
        if (score >= 0.6) return ['발음이 대체로 정확합니다.', '조금 더 정확하게 발음해보세요.'];
        if (score >= 0.4) return ['발음이 부정확합니다.', '더 정확하게 발음해보세요.'];
        return ['발음이 매우 부정확합니다.', '발음을 크게 개선해보세요.'];
    };

    // 기본값 데이터 변환
    const convertDefaultDataToDisplayFormat = (data) => {
        return {
            scores: {
                voice: 75,
                speed: 72,
                gesture: 75,
                eyeContact: 70,
                confidence: 78,
                clarity: 82
            },
            details: [
                {
                    title: '음성 분석',
                    score: 75,
                    description: '음성 데이터를 분석하고 있습니다. 잠시만 기다려주세요.',
                    suggestions: ['음성이 포함된 비디오를 업로드해주세요', '마이크 설정을 확인해주세요']
                },
                {
                    title: '말하기 속도',
                    score: 72,
                    description: '말하기 속도를 분석하고 있습니다.',
                    suggestions: ['적절한 속도로 말해보세요']
                },
                {
                    title: '발음 정확도',
                    score: 82,
                    description: '발음 정확도를 분석하고 있습니다.',
                    suggestions: ['명확하게 발음해주세요']
                }
            ],
            transcript: {
                fullText: data?.transcription || '분석 결과를 불러오는 중입니다. 음성이 포함된 비디오를 업로드하면 더 정확한 분석 결과를 제공할 수 있습니다.',
                segments: []
            }
        };
    };

    // 기본 분석 데이터 생성
    const createDefaultAnalysisData = () => {
        return {
            scores: {
                voice: 75,
                speed: 72,
                gesture: 75,
                eyeContact: 70,
                confidence: 78,
                clarity: 82
            },
            details: [
                {
                    title: '음성 강도',
                    score: 75,
                    description: '목소리 크기와 볼륨의 일관성을 평가합니다.',
                    suggestions: ['마이크 설정을 확인해주세요', '적절한 거리에서 녹음해주세요']
                },
                {
                    title: '말하기 속도',
                    score: 72,
                    description: '분당 단어 수를 기준으로 말하기 속도를 평가합니다.',
                    suggestions: ['청중이 따라올 수 있는 속도로 말해보세요']
                },
                {
                    title: '피치 변화',
                    score: 78,
                    description: '목소리의 높낮이 변화와 억양을 평가합니다.',
                    suggestions: ['다양한 억양을 사용해보세요']
                },
                {
                    title: '발음 정확도',
                    score: 82,
                    description: '발음의 명확성과 정확도를 평가합니다.',
                    suggestions: ['또박또박 명확하게 발음해보세요']
                },
                {
                    title: '제스처',
                    score: 75,
                    description: '손동작과 몸짓을 통한 표현력을 평가합니다.',
                    suggestions: ['자연스러운 제스처를 활용해보세요']
                },
                {
                    title: '시선 처리',
                    score: 70,
                    description: '카메라와의 아이컨택과 시선 처리를 평가합니다.',
                    suggestions: ['카메라를 자주 바라보세요']
                }
            ],
            transcript: {
                fullText: '분석 결과를 불러올 수 없습니다. 음성이 포함된 비디오를 업로드하면 음성 인식 결과와 함께 더 상세한 분석을 제공합니다.',
                segments: []
            }
        };
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#4CAF50'; // 녹색
        if (score >= 60) return '#FF9800'; // 주황색
        return '#F44336'; // 빨간색
    };

    const getScoreText = (score) => {
        if (score >= 80) return '우수';
        if (score >= 60) return '보통';
        return '개선 필요';
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

    // scores가 없을 경우를 대비한 안전장치
    const scores = finalAnalysisData?.scores || {
        voice: 0,
        speed: 0,
        gesture: 0,
        eyeContact: 0,
        confidence: 0,
        clarity: 0
    };

    // 평균 점수 계산을 위한 안전장치
    const averageScore = Math.round(
        Object.values(scores).reduce((a, b) => a + b, 0) / 
        (Object.keys(scores).length || 1)
    );

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
                gap: '20px'
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
                            height: '300px',
                            backgroundColor: '#000000',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            {videoData && videoData.videoUrl ? (
                                <video
                                    controls
                                    src={videoData.videoUrl}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '12px'
                                    }}
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

                    {/* Overall Score Summary */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '20px',
                        border: '1px solid #e9ecef'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#000000',
                            margin: '0 0 16px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            📊 종합 점수
                        </h3>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px'
                        }}>
                            <div style={{
                                fontSize: '42px',
                                fontWeight: '700',
                                color: getScoreColor(averageScore)
                            }}>
                                {averageScore}점
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    color: '#000000',
                                    marginBottom: '4px'
                                }}>
                                    {getScoreText(averageScore)}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#666666'
                                }}>
                                    {Object.keys(scores).length}개 영역 평균 점수
                                </div>
                            </div>
                        </div>
                        
                        {/* Quick Score Breakdown */}
                        <div style={{
                            marginTop: '20px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px'
                        }}>
                            {Object.entries(scores).map(([key, score]) => (
                                <div key={key} style={{
                                    backgroundColor: '#ffffff',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#666666',
                                        marginBottom: '4px'
                                    }}>
                                        {labels[key] || key}
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: getScoreColor(score)
                                    }}>
                                        {score}점
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Back Button */}
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
                            width: '100%'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1C1C1C';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#2C2C2C';
                        }}
                    >
                        🏠 대시보드로 돌아가기
                    </button>
                </div>

                {/* Right Sidebar - HexagonChart (Main Focus) */}
                <div style={{
                    width: '40%',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    borderLeft: '1px solid #e9ecef',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        padding: '30px 20px 20px 20px',
                        height: '100%'
                    }}>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#000000',
                            margin: '0 0 20px 0',
                            fontFamily: 'Inter, sans-serif',
                            textAlign: 'center'
                        }}>
                            🎯 상세 분석 결과
                        </h2>
                        
                        {/* HexagonChart - The main component */}
                        <HexagonChart 
                            data={finalAnalysisData.scores} 
                            transcriptData={typeof finalAnalysisData.transcript === 'object' ? finalAnalysisData.transcript.fullText : finalAnalysisData.transcript}
                            analysisDetails={finalAnalysisData.details}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoAnalysis; 