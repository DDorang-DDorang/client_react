import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import HexagonChart from '../components/HexagonChart';
import videoAnalysisService from '../api/videoAnalysisService';
import useAuthValidation from '../hooks/useAuthValidation';

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

        // 나머지 useEffect 로직...
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
                setAnalysisData(stateData.analysisData);
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

    // FastAPI 직접 응답을 화면 표시 형태로 변환
    const convertFastApiDataToDisplayFormat = (data) => {
        return {
            scores: {
                voice: Math.round((data.intensity_db || 65) / 80 * 100), // dB를 점수로 변환
                speed: Math.round((data.wpm_avg || 120) / 150 * 100), // WPM을 점수로 변환
                gesture: 75, // 기본값 (FastAPI에서 제스처 분석 안함)
                eyeContact: 70, // 기본값
                confidence: Math.round((data.pitch_avg || 150) / 200 * 100), // 피치를 자신감 점수로 변환
                clarity: Math.round((data.pronunciation_score || 0.75) * 100) // 발음 정확도
            },
            details: [
                {
                    title: '음성 강도',
                    score: Math.round((data.intensity_db || 65) / 80 * 100),
                    description: data.intensity_text || '목소리 크기와 볼륨의 일관성을 평가합니다.',
                    suggestions: [
                        '마이크와 적절한 거리를 유지하세요',
                        '중요한 내용에서는 목소리를 조금 더 크게 해보세요',
                        '일정한 볼륨을 유지하며 말해보세요'
                    ]
                },
                {
                    title: '말하기 속도',
                    score: Math.round((data.wpm_avg || 120) / 150 * 100),
                    description: data.wpm_comment || '분당 단어 수(WPM)를 기준으로 말하기 속도를 평가합니다.',
                    suggestions: [
                        '청중이 따라올 수 있는 적절한 속도로 말하세요',
                        '중요한 포인트에서는 잠시 멈춰서 강조해보세요',
                        '복잡한 내용은 천천히 설명해보세요'
                    ]
                },
                {
                    title: '피치 변화',
                    score: Math.round((data.pitch_avg || 150) / 200 * 100),
                    description: data.pitch_text || '목소리의 높낮이 변화와 억양을 평가합니다.',
                    suggestions: [
                        '단조로운 톤을 피하고 다양한 억양을 사용하세요',
                        '질문할 때는 목소리를 약간 올려보세요',
                        '감정을 담아서 표현력을 높여보세요'
                    ]
                },
                {
                    title: '발음 정확도',
                    score: Math.round((data.pronunciation_score || 0.75) * 100),
                    description: '음성 인식 기술을 활용한 발음의 명확성과 정확도 평가입니다.',
                    suggestions: [
                        '또박또박 명확하게 발음하세요',
                        '어려운 단어는 천천히 발음해보세요',
                        '입 모양을 크게 하여 발음하세요'
                    ]
                },
                {
                    title: '제스처 (예상)',
                    score: 75,
                    description: '손동작과 몸짓을 통한 표현력을 평가합니다. (현재 비디오 분석 미구현)',
                    suggestions: [
                        '자연스러운 손동작을 활용하세요',
                        '중요한 포인트에서 적절한 제스처를 사용하세요',
                        '과도한 동작은 피하고 절제된 움직임을 유지하세요'
                    ]
                },
                {
                    title: '시선 처리 (예상)',
                    score: 70,
                    description: '카메라와의 아이컨택과 시선 처리를 평가합니다. (현재 비디오 분석 미구현)',
                    suggestions: [
                        '카메라를 자주 바라보며 청중과의 연결감을 만드세요',
                        '스크립트를 보더라도 중간중간 카메라를 보세요',
                        '자연스러운 시선 이동을 연습해보세요'
                    ]
                }
            ],
            transcript: {
                fullText: data.transcription || '음성 인식 결과가 없습니다. 음성이 포함된 비디오를 업로드하면 STT 분석 결과를 확인하실 수 있습니다.',
                segments: []
            }
        };
    };

    // Spring Boot API 응답을 화면 표시 형태로 변환
    const convertSpringBootDataToDisplayFormat = (data) => {
        const voiceAnalysis = data.voiceAnalysis;
        const sttResult = data.sttResult;
        
        if (!voiceAnalysis && !sttResult) {
            return createDefaultAnalysisData();
        }

        return {
            scores: {
                voice: voiceAnalysis ? Math.round((voiceAnalysis.intensityDb || 65) / 80 * 100) : 75,
                speed: voiceAnalysis ? Math.round((voiceAnalysis.wpmAvg || 120) / 150 * 100) : 72,
                gesture: 75, // 기본값
                eyeContact: 70, // 기본값
                confidence: voiceAnalysis ? Math.round((voiceAnalysis.pitchAvg || 150) / 200 * 100) : 78,
                clarity: sttResult ? Math.round((sttResult.pronunciationScore || 0.75) * 100) : 82
            },
            details: [
                {
                    title: '음성 강도',
                    score: voiceAnalysis ? Math.round((voiceAnalysis.intensityDb || 65) / 80 * 100) : 75,
                    description: voiceAnalysis?.intensityText || '목소리 크기와 볼륨의 일관성을 분석한 결과입니다.',
                    suggestions: [
                        '마이크와 적절한 거리를 유지하세요',
                        '중요한 내용에서는 목소리를 조금 더 크게 해보세요',
                        '일정한 볼륨을 유지하며 말해보세요'
                    ]
                },
                {
                    title: '말하기 속도',
                    score: voiceAnalysis ? Math.round((voiceAnalysis.wpmAvg || 120) / 150 * 100) : 72,
                    description: voiceAnalysis?.wpmComment || '분당 단어 수(WPM)를 기준으로 한 말하기 속도 분석 결과입니다.',
                    suggestions: [
                        '청중이 따라올 수 있는 적절한 속도로 말하세요',
                        '중요한 포인트에서는 잠시 멈춰서 강조해보세요',
                        '복잡한 내용은 천천히 설명해보세요'
                    ]
                },
                {
                    title: '피치 변화',
                    score: voiceAnalysis ? Math.round((voiceAnalysis.pitchAvg || 150) / 200 * 100) : 78,
                    description: voiceAnalysis?.pitchText || '목소리의 높낮이 변화와 억양 분석 결과입니다.',
                    suggestions: [
                        '단조로운 톤을 피하고 다양한 억양을 사용하세요',
                        '질문할 때는 목소리를 약간 올려보세요',
                        '감정을 담아서 표현력을 높여보세요'
                    ]
                },
                {
                    title: '발음 정확도',
                    score: sttResult ? Math.round((sttResult.pronunciationScore || 0.75) * 100) : 82,
                    description: '음성 인식 기술을 활용한 발음의 명확성과 정확도 평가 결과입니다.',
                    suggestions: [
                        '또박또박 명확하게 발음하세요',
                        '어려운 단어는 천천히 발음해보세요',
                        '입 모양을 크게 하여 발음하세요'
                    ]
                },
                {
                    title: '제스처 (예상)',
                    score: 75,
                    description: '손동작과 몸짓을 통한 표현력 평가입니다. (비디오 분석 기능 개발 예정)',
                    suggestions: [
                        '자연스러운 손동작을 활용하세요',
                        '중요한 포인트에서 적절한 제스처를 사용하세요',
                        '과도한 동작은 피하고 절제된 움직임을 유지하세요'
                    ]
                },
                {
                    title: '시선 처리 (예상)',
                    score: 70,
                    description: '카메라와의 아이컨택과 시선 처리 평가입니다. (비디오 분석 기능 개발 예정)',
                    suggestions: [
                        '카메라를 자주 바라보며 청중과의 연결감을 만드세요',
                        '스크립트를 보더라도 중간중간 카메라를 보세요',
                        '자연스러운 시선 이동을 연습해보세요'
                    ]
                }
            ],
            transcript: {
                fullText: sttResult?.transcription || '음성 인식 결과가 없습니다. 음성이 포함된 비디오를 업로드하면 STT 분석 결과를 확인하실 수 있습니다.',
                segments: []
            }
        };
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
                            transcriptData={finalAnalysisData.transcript}
                            analysisDetails={finalAnalysisData.details}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoAnalysis; 