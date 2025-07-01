import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import HexagonChart from '../components/HexagonChart';
import videoAnalysisService from '../api/videoAnalysisService';
import useAuthValidation from '../hooks/useAuthValidation';
import { Box, Container, Typography, CircularProgress, Paper, Alert, Fab, Tooltip } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

// 기본 분석 데이터
const defaultAnalysisData = {
    scores: {
        voice: 75,
        speed: 75,
        anxiety: 75,
        eyeContact: 75,
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
        anxiety: {
            grade: 'N/A',
            score: 75,
            text: '불안도 분석 기능은 현재 개발 중입니다.',
            suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
        },
        eyeContact: {
            grade: 'N/A',
            score: 75,
            text: '시선 처리 분석 기능은 현재 개발 중입니다.',
            suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
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
    
    // 오른쪽 영역 뷰 상태 추가
    const [currentView, setCurrentView] = useState('analysis'); // 'analysis' | 'transcript'
    const [transcriptText, setTranscriptText] = useState('');
    
    // AI 대본 수정 관련 상태
    const [aiEdits, setAiEdits] = useState([]);
    const [editedTranscript, setEditedTranscript] = useState('');

    // 인증 검증 활성화 (토큰 만료 시 로그인으로 리다이렉트)
    useAuthValidation();
    
    // AI 수정 상태가 변경될 때마다 편집된 대본 업데이트
    useEffect(() => {
        if (aiEdits.length > 0 && transcriptText) {
            const updatedText = applyAiEdits(transcriptText, aiEdits);
            setEditedTranscript(updatedText);
        }
    }, [aiEdits, transcriptText]);

    console.log('=== VideoAnalysis 컴포넌트 렌더링 ===');
    console.log('presentationId:', presentationId);
    console.log('location.pathname:', location.pathname);
    console.log('window.location:', window.location.href);

    // HexagonChart에서 사용할 라벨 정의
    const labels = {
        voice: '음성',
        speed: '속도',
        anxiety: '불안(미구현)',
        eyeContact: '시선(미구현)',
        pitch: '피치',
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
        if (!data) {
            return createDefaultAnalysisData();
        }

        // FastAPI 응답 데이터 변환
        const fastApiData = {
            id: data.voiceAnalysis?.voiceAnalysisId,
            presentationId: data.presentationId,
            presentationTitle: data.title,
            intensityGrade: data.voiceAnalysis?.intensityGrade || data.intensity_grade || '보통',
            intensityDb: data.voiceAnalysis?.intensityDb || data.intensity_db,
            intensityText: data.voiceAnalysis?.intensityText || data.intensity_text || '음성 강도가 적절합니다.',
            pitchGrade: data.voiceAnalysis?.pitchGrade || data.pitch_grade || '좋음',
            pitchAvg: data.voiceAnalysis?.pitchAvg || data.pitch_avg,
            pitchText: data.voiceAnalysis?.pitchText || data.pitch_text || '피치 변화가 자연스럽습니다.',
            wpmGrade: data.voiceAnalysis?.wpmGrade || data.wpm_grade || '보통',
            wpmAvg: data.voiceAnalysis?.wpmAvg || data.wpm_avg,
            wpmComment: data.voiceAnalysis?.wpmComment || data.wpm_comment || '말하기 속도가 적당합니다.',
            transcription: data.sttResult?.transcription || data.transcription || '',
            pronunciationScore: data.sttResult?.pronunciationScore || data.pronunciation_score || 0.75
        };

        // 점수 계산
        const scores = {
            voice: calculateVoiceScore(fastApiData) || 75,
            speed: calculateSpeedScore(fastApiData) || 75,
            anxiety: 75,
            eyeContact: 75,
            pitch: calculatePitchScore(fastApiData) || 75,
            clarity: calculateClarityScore(fastApiData) || 75
        };

        // 상세 분석 정보
        const details = {
            voice: {
                grade: fastApiData.intensityGrade,
                score: scores.voice,
                text: fastApiData.intensityText,
                suggestions: getVoiceSuggestions(fastApiData.intensityGrade)
            },
            speed: {
                grade: fastApiData.wpmGrade,
                score: scores.speed,
                text: fastApiData.wpmComment,
                suggestions: getSpeedSuggestions(fastApiData.wpmGrade)
            },
            anxiety: {
                grade: 'N/A',
                score: scores.anxiety,
                text: '불안도 분석 기능은 현재 개발 중입니다.',
                suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
            },
            eyeContact: {
                grade: 'N/A',
                score: scores.eyeContact,
                text: '시선 처리 분석 기능은 현재 개발 중입니다.',
                suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
            },
            pitch: {
                grade: fastApiData.pitchGrade,
                score: calculatePitchScore(fastApiData) || 75,
                text: fastApiData.pitchText,
                suggestions: getPitchSuggestions(fastApiData.pitchGrade)
            },
            clarity: {
                score: calculatePronunciationScore(fastApiData) || 75,
                text: `발음 정확도: ${(fastApiData.pronunciationScore * 100).toFixed(1)}%`,
                suggestions: getPronunciationSuggestions(fastApiData.pronunciationScore)
            }
        };

        return {
            scores,
            details,
            transcription: fastApiData.transcription
        };
    };

    const convertFastApiDataToDisplayFormat = (data) => {
        if (!data) {
            return defaultAnalysisData;
        }

        // FastAPI 응답 데이터 구조 변환
        const transformedData = {
            scores: {
                voice: calculateScore(data.intensity_grade) || 75,
                speed: calculateScore(data.wpm_grade) || 75,
                anxiety: 75,
                eyeContact: 75,
                pitch: calculateScore(data.pitch_grade) || 75,
                clarity: data.pronunciation_score ? Math.round(data.pronunciation_score * 100) : 75
            },
            details: {
                voice: {
                    grade: data.intensity_grade || '보통',
                    score: calculateScore(data.intensity_grade) || 75,
                    text: data.intensity_text || '음성 강도가 적절합니다. (목 데이터 - FastAPI 서버 연결 필요)',
                    suggestions: getVoiceSuggestions(data.intensity_grade || '보통')
                },
                speed: {
                    grade: data.wpm_grade || '보통',
                    score: calculateScore(data.wpm_grade) || 75,
                    text: data.wpm_comment || '말하기 속도가 적당합니다. (목 데이터 - FastAPI 서버 연결 필요)',
                    suggestions: getSpeedSuggestions(data.wpm_grade || '보통')
                },
                anxiety: {
                    grade: 'N/A',
                    score: 75,
                    text: '불안도 분석 기능은 현재 개발 중입니다.',
                    suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
                },
                eyeContact: {
                    grade: 'N/A',
                    score: 75,
                    text: '시선 처리 분석 기능은 현재 개발 중입니다.',
                    suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
                },
                pitch: {
                    grade: data.pitch_grade || '좋음',
                    score: calculateScore(data.pitch_grade) || 75,
                    text: data.pitch_text || '피치 변화가 자연스럽습니다. (목 데이터 - FastAPI 서버 연결 필요)',
                    suggestions: getPitchSuggestions(data.pitch_grade || '좋음')
                },
                clarity: {
                    score: data.pronunciation_score ? Math.round(data.pronunciation_score * 100) : 75,
                    text: `발음 정확도: ${(data.pronunciation_score * 100 || 75).toFixed(1)}%`,
                    suggestions: getPronunciationSuggestions(data.pronunciation_score || 0.75)
                }
            },
            transcription: data.transcription || '음성 인식 결과가 없습니다.'
        };

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

    // 기본 분석 데이터 생성
    const createDefaultAnalysisData = () => {
        return {
            scores: {
                voice: 75,
                speed: 72,
                anxiety: 75,
                eyeContact: 70,
                pitch: 78,
                clarity: 82
            },
            details: {
                voice: {
                    grade: 'N/A',
                    score: 75,
                    text: '목소리 크기와 볼륨의 일관성을 평가합니다.',
                    suggestions: ['마이크 설정을 확인해주세요', '적절한 거리에서 녹음해주세요']
                },
                speed: {
                    grade: 'N/A',
                    score: 72,
                    text: '분당 단어 수를 기준으로 말하기 속도를 평가합니다.',
                    suggestions: ['청중이 따라올 수 있는 속도로 말해보세요']
                },
                anxiety: {
                    grade: 'N/A',
                    score: 75,
                    text: '불안도 분석 기능은 현재 개발 중입니다.',
                    suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
                },
                eyeContact: {
                    grade: 'N/A',
                    score: 70,
                    text: '시선 처리 분석 기능은 현재 개발 중입니다.',
                    suggestions: ['이 기능은 곧 업데이트될 예정입니다.']
                },
                pitch: {
                    grade: 'N/A',
                    score: 78,
                    text: '목소리의 높낮이 변화와 억양을 평가합니다.',
                    suggestions: ['다양한 억양을 사용해보세요']
                },
                clarity: {
                    score: 82,
                    text: '발음의 명확성과 정확도를 평가합니다.',
                    suggestions: ['또박또박 명확하게 발음해보세요']
                }
            },
            transcription: '분석 결과를 불러올 수 없습니다. 음성이 포함된 비디오를 업로드하면 음성 인식 결과와 함께 더 상세한 분석을 제공합니다.'
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

    // 목업 AI 수정 데이터 생성
    const generateMockAiEdits = (originalText) => {
        const mockEdits = [];
        
        // '목 데이터' -> '목업 데이터' 수정 찾기
        const regex = /목 데이터/g;
        let match;
        
        while ((match = regex.exec(originalText)) !== null) {
            mockEdits.push({
                id: `edit_${match.index}`,
                original: '목 데이터',
                suggested: '목업 데이터',
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                applied: true // 기본적으로 AI 수정 적용됨
            });
        }
        
        return mockEdits;
    };
    
    // AI 수정이 적용된 대본 생성
    const applyAiEdits = (originalText, edits) => {
        let result = originalText;
        let offset = 0;
        
        // startIndex 순으로 정렬하여 순차적으로 적용
        const sortedEdits = [...edits].sort((a, b) => a.startIndex - b.startIndex);
        
        sortedEdits.forEach(edit => {
            if (edit.applied) {
                const start = edit.startIndex + offset;
                const end = edit.endIndex + offset;
                const before = result.substring(0, start);
                const after = result.substring(end);
                
                result = before + edit.suggested + after;
                offset += edit.suggested.length - edit.original.length;
            }
        });
        
        return result;
    };
    
    // 단어 클릭 처리 (적용/미적용 토글)
    const handleWordClick = (editId) => {
        setAiEdits(prevEdits => 
            prevEdits.map(edit => 
                edit.id === editId 
                    ? { ...edit, applied: !edit.applied }
                    : edit
            )
        );
    };
    
    // 대본 수정 영역으로 전환
    const handleEditTranscript = () => {
        console.log('=== 대본 수정 영역으로 전환 ===');
        
        // 현재 대본 데이터를 transcriptText에 설정
        const currentTranscript = finalAnalysisData?.transcription || '대본 데이터가 없습니다.';
        setTranscriptText(currentTranscript);
        
        // AI 수정 데이터 생성
        const mockEdits = generateMockAiEdits(currentTranscript);
        setAiEdits(mockEdits);
        
        // AI 수정이 적용된 대본 생성
        const aiEditedText = applyAiEdits(currentTranscript, mockEdits);
        setEditedTranscript(aiEditedText);
        
        // 뷰를 대본 수정으로 전환
        setCurrentView('transcript');
    };
    
    // 분석 결과로 돌아가기
    const handleBackToAnalysis = () => {
        setCurrentView('analysis');
    };
    
    // 대본을 렌더링하면서 수정된 단어들을 하이라이트
    const renderTranscriptWithHighlights = () => {
        if (!transcriptText || aiEdits.length === 0) {
            return <span>{editedTranscript || transcriptText}</span>;
        }
        
        const parts = [];
        let lastIndex = 0;
        
        // startIndex 순으로 정렬
        const sortedEdits = [...aiEdits].sort((a, b) => a.startIndex - b.startIndex);
        
        sortedEdits.forEach((edit, index) => {
            // 수정 전 텍스트 추가
            if (edit.startIndex > lastIndex) {
                parts.push(
                    <span key={`text_${index}`}>
                        {transcriptText.substring(lastIndex, edit.startIndex)}
                    </span>
                );
            }
            
            // 수정된 단어 추가 (클릭 가능)
            parts.push(
                <span
                    key={edit.id}
                    onClick={() => handleWordClick(edit.id)}
                    style={{
                        backgroundColor: edit.applied ? '#4CAF50' : 'transparent',
                        color: edit.applied ? 'white' : 'black',
                        textDecoration: edit.applied ? 'none' : 'underline',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        transition: 'all 0.2s ease'
                    }}
                    title={edit.applied ? `클릭하면 "${edit.original}"로 되돌립니다` : `클릭하면 "${edit.suggested}"로 적용합니다`}
                >
                    {edit.applied ? edit.suggested : edit.original}
                </span>
            );
            
            lastIndex = edit.endIndex;
        });
        
        // 마지막 남은 텍스트 추가
        if (lastIndex < transcriptText.length) {
            parts.push(
                <span key="text_end">
                    {transcriptText.substring(lastIndex)}
                </span>
            );
        }
        
        return <div>{parts}</div>;
    };
    
    // 대본 저장
    const handleSaveTranscript = () => {
        const finalTranscript = applyAiEdits(transcriptText, aiEdits);
        console.log('최종 대본 저장:', finalTranscript);
        console.log('적용된 수정사항:', aiEdits.filter(edit => edit.applied));
        
        // TODO: 실제 저장 로직 구현
        alert(`대본이 저장되었습니다!\n적용된 수정: ${aiEdits.filter(edit => edit.applied).length}개`);
        setCurrentView('analysis');
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
        voice: 0,
        speed: 0,
        anxiety: 0,
        eyeContact: 0,
        pitch: 0,
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
                            {videoData && (videoData.videoUrl || videoData.url) ? (
                                <video
                                    controls
                                    src={videoData.videoUrl || videoData.url}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '12px',
                                        objectFit: 'contain'
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
                        height: '100%'
                    }}>
                        {currentView === 'analysis' ? (
                            <>
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
                                    transcriptData={finalAnalysisData.transcription}
                                    analysisDetails={finalAnalysisData.details}
                                />
                            </>
                        ) : (
                            <>
                                {/* 대본 수정 영역 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '20px'
                                }}>
                                    <h2 style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#000000',
                                        margin: '0',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        📝 대본 수정
                                    </h2>
                                </div>
                                
                                {/* 대본 텍스트 영역 */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: 'calc(100% - 120px)'
                                }}>
                                    <label style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#333',
                                        marginBottom: '8px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        AI 수정된 발표 대본: <span style={{ fontSize: '12px', color: '#666' }}>(수정된 단어를 클릭하여 적용/미적용 변경)</span>
                                    </label>
                                    
                                    {/* AI 수정 안내 */}
                                    {aiEdits.length > 0 && (
                                        <div style={{
                                            backgroundColor: '#e8f5e8',
                                            border: '1px solid #4CAF50',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            marginBottom: '12px',
                                            fontSize: '13px',
                                            color: '#2e7d2e'
                                        }}>
                                            🤖 AI가 {aiEdits.length}개의 수정사항을 제안했습니다. 
                                            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}> 초록색</span>은 적용됨, 
                                            <span style={{ color: 'black', textDecoration: 'underline' }}> 밑줄</span>은 미적용입니다.
                                        </div>
                                    )}
                                    
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '16px',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'Inter, sans-serif',
                                            lineHeight: '1.8',
                                            backgroundColor: '#fafafa',
                                            overflowY: 'auto',
                                            userSelect: 'text'
                                        }}
                                    >
                                        {renderTranscriptWithHighlights()}
                                    </div>
                                    
                                    {/* 저장 버튼 */}
                                    <button
                                        onClick={handleSaveTranscript}
                                        style={{
                                            marginTop: '16px',
                                            padding: '12px 24px',
                                            backgroundColor: '#2C2C2C',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            fontFamily: 'Inter, sans-serif',
                                            transition: 'background-color 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#1C1C1C';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = '#2C2C2C';
                                        }}
                                    >
                                        💾 대본 저장
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 플로팅 버튼 - 상태에 따라 변경 */}
            <Tooltip title={currentView === 'analysis' ? '대본 수정' : '분석 결과'} placement="left">
                <Fab
                    color="primary"
                    aria-label={currentView === 'analysis' ? 'edit transcript' : 'back to analysis'}
                    onClick={currentView === 'analysis' ? handleEditTranscript : handleBackToAnalysis}
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
                    {currentView === 'analysis' ? '📝' : '📊'}
                </Fab>
            </Tooltip>
        </div>
    );
};

export default VideoAnalysis; 