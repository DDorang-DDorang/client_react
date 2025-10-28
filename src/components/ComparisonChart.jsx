import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';

const ComparisonChart = ({ comparisonData, presentation1, presentation2 }) => {
    const canvasRef = useRef(null);

    // 데이터 준비 (Hook 규칙을 위해 early return 전에 처리)
    const hasData = comparisonData && (comparisonData.comparisonData || comparisonData.presentation1);
    const data = hasData ? (comparisonData.comparisonData || comparisonData) : null;
    const metrics1 = data?.presentation1 || {};
    const metrics2 = data?.presentation2 || {};
    
    console.log('=== ComparisonChart 데이터 확인 ===');
    console.log('comparisonData:', comparisonData);
    console.log('comparisonData 타입:', typeof comparisonData);
    console.log('comparisonData 키들:', comparisonData ? Object.keys(comparisonData) : 'null');
    console.log('hasData:', hasData);
    console.log('data:', data);
    console.log('metrics1:', metrics1);
    console.log('metrics2:', metrics2);
    console.log('발음 점수1:', metrics1.pronunciationScore);
    console.log('발음 점수2:', metrics2.pronunciationScore);
    console.log('AI 분석 결과 확인:');
    console.log('- improvements_made:', comparisonData?.improvements_made);
    console.log('- areas_to_improve:', comparisonData?.areas_to_improve);
    console.log('- overall_feedback:', comparisonData?.overall_feedback);
    console.log('- strengths_comparison:', comparisonData?.strengths_comparison);
    console.log('- strengthsComparison:', comparisonData?.strengthsComparison);
    console.log('- improvement_suggestions:', comparisonData?.improvement_suggestions);
    console.log('- improvementSuggestions:', comparisonData?.improvementSuggestions);
    console.log('- overallFeedback:', comparisonData?.overallFeedback);
    
    // comparisonSummary 필드 확인
    console.log('- comparisonSummary:', comparisonData?.comparisonSummary);
    if (comparisonData?.comparisonSummary) {
        try {
            const parsedSummary = JSON.parse(comparisonData.comparisonSummary);
            console.log('- parsed comparisonSummary:', parsedSummary);
            console.log('- parsed improvements_made:', parsedSummary?.improvements_made);
            console.log('- parsed areas_to_improve:', parsedSummary?.areas_to_improve);
            console.log('- parsed overall_feedback:', parsedSummary?.overall_feedback);
        } catch (e) {
            console.log('- comparisonSummary 파싱 실패:', e);
        }
    }
    
    // comparisonSummary에서 AI 분석 결과 파싱
    let aiAnalysisData = {};
    if (comparisonData?.comparisonSummary) {
        try {
            aiAnalysisData = JSON.parse(comparisonData.comparisonSummary);
        } catch (e) {
            console.log('comparisonSummary 파싱 실패:', e);
        }
    }
    
    const pres1 = presentation1 || comparisonData?.presentation1;
    const pres2 = presentation2 || comparisonData?.presentation2;

    // ABCDE 등급을 점수(0-100)로 변환
    const gradeToScore = (grade) => {
        const gradeMap = { 
            'A': 90, 
            'B': 75, 
            'C': 60, 
            'D': 45, 
            'E': 30,
            // 백엔드가 한글 등급을 보낼 수도 있음
            '매우 좋음': 90,
            '좋음': 75,
            '보통': 60,
            '나쁨': 45,
            '매우 나쁨': 30
        };
        return gradeMap[grade] || 60;
    };

    // 발음 점수를 등급으로 변환
    const convertPronunciationToGrade = (score) => {
        console.log('발음 점수 변환:', score, typeof score);
        // null 또는 undefined 체크 (0도 유효한 값으로 처리)
        if (score === null || score === undefined) {
            console.log('발음 점수 없음 (null/undefined), C 반환');
            return 'C';
        }
        // 0-1 범위의 숫자로 변환
        const numScore = parseFloat(score);
        if (isNaN(numScore)) {
            console.log('발음 점수가 숫자가 아님, C 반환');
            return 'C';
        }
        
        console.log('발음 점수 숫자 변환:', numScore);
        if (numScore >= 0.8) return 'A';
        if (numScore >= 0.6) return 'B';
        if (numScore >= 0.4) return 'C';
        if (numScore >= 0.2) return 'D';
        return 'E';
    };


    // 감정 분석 데이터 파싱
    const parseEmotionAnalysis = (emotionAnalysisJson) => {
        if (!emotionAnalysisJson) return null;
        
        try {
            return JSON.parse(emotionAnalysisJson);
        } catch (e) {
            console.log('감정 분석 데이터 파싱 실패:', e);
            return null;
        }
    };

    // 감정 분석 결과를 표시용 텍스트로 변환
    const formatEmotionAnalysis = (emotionData) => {
        if (!emotionData) return '감정 분석 데이터 없음';
        
        const positive = emotionData.positive || 0;
        const neutral = emotionData.neutral || 0;
        const negative = emotionData.negative || 0;
        
        // 모든 값이 0이면 분석 대기로 표시
        if (positive === 0 && neutral === 0 && negative === 0) {
            return '감정 분석 대기중';
        }
        
        return `긍정: ${positive.toFixed(1)}% | 중립: ${neutral.toFixed(1)}% | 부정: ${negative.toFixed(1)}%`;
    };

    // 각 메트릭의 등급 계산 (DB에서 가져온 등급 그대로 사용)
    const getMetricGrades = (metrics) => {
        return {
            voice: metrics.intensityGrade || 'C',
            speed: metrics.wpmGrade || 'C',
            expression: metrics.expressionGrade || 'C',
            pitch: metrics.pitchGrade || 'C',
            clarity: convertPronunciationToGrade(metrics.pronunciationScore)
        };
    };

    // 오각형 그래프에 사용할 5개 축 데이터 준비 (등급 기반)
    const convertToPentagonData = (grades) => {
        return {
            voice: gradeToScore(grades.voice),
            speed: gradeToScore(grades.speed),
            expression: gradeToScore(grades.expression),
            pitch: gradeToScore(grades.pitch),
            clarity: gradeToScore(grades.clarity)
        };
    };

    const grades1 = getMetricGrades(metrics1);
    const grades2 = getMetricGrades(metrics2);

    const pentData1 = convertToPentagonData(grades1);
    const pentData2 = convertToPentagonData(grades2);

    // 평균 등급 계산 (useEffect보다 먼저 선언)
    const gradeValues = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
    const avg1 = Object.values(grades1).reduce((sum, g) => sum + gradeValues[g], 0) / 5;
    const avg2 = Object.values(grades2).reduce((sum, g) => sum + gradeValues[g], 0) / 5;
    
    const getAvgGrade = (avg) => {
        if (avg >= 4.5) return 'A';
        if (avg >= 3.5) return 'B';
        if (avg >= 2.5) return 'C';
        if (avg >= 1.5) return 'D';
        return 'E';
    };

    const avgGrade1 = getAvgGrade(avg1);
    const avgGrade2 = getAvgGrade(avg2);

    const getGradeColor = (grade) => {
        const colors = {
            'A': '#4caf50',
            'B': '#8bc34a',
            'C': '#ffc107',
            'D': '#ff9800',
            'E': '#f44336'
        };
        return colors[grade] || '#9e9e9e';
    };


    // 육각형 그래프 그리기
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 80;
        const sides = 5;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Helper function to get point on pentagon
        const getPentPoint = (index, radiusMultiplier = 1) => {
            const angle = (index * 2 * Math.PI) / sides - Math.PI / 2;
            return {
                x: centerX + Math.cos(angle) * radius * radiusMultiplier,
                y: centerY + Math.sin(angle) * radius * radiusMultiplier
            };
        };

        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Draw pentagon grid lines at 20%, 40%, 60%, 80%, 100%
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(multiplier => {
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const point = getPentPoint(i % sides, multiplier);
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        });

        // Draw axis lines from center to vertices
        for (let i = 0; i < sides; i++) {
            const point = getPentPoint(i, 1.0);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }

        // Labels and axes (5각형에 맞게 5개 메트릭)
        const axisLabels = ['음성 강도', '말하기 속도', '표정', '피치', '명확성'];
        const axisOrder = ['voice', 'speed', 'expression', 'pitch', 'clarity'];

        // Draw data polygon for presentation 1 (파란색)
        const dataPoints1 = [];
        axisOrder.forEach((key, index) => {
            const value = pentData1[key] || 0;
            const normalizedValue = value / 100;
            const point = getPentPoint(index, normalizedValue);
            dataPoints1.push(point);
        });

        // Fill data polygon 1
        ctx.fillStyle = 'rgba(25, 118, 210, 0.2)';
        ctx.beginPath();
        ctx.moveTo(dataPoints1[0].x, dataPoints1[0].y);
        dataPoints1.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();

        // Draw data polygon border 1
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(dataPoints1[0].x, dataPoints1[0].y);
        dataPoints1.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.stroke();

        // Draw data points 1
        dataPoints1.forEach(point => {
            ctx.fillStyle = '#1976d2';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw data polygon for presentation 2 (빨간색)
        const dataPoints2 = [];
        axisOrder.forEach((key, index) => {
            const value = pentData2[key] || 0;
            const normalizedValue = value / 100;
            const point = getPentPoint(index, normalizedValue);
            dataPoints2.push(point);
        });

        // Fill data polygon 2
        ctx.fillStyle = 'rgba(220, 0, 78, 0.2)';
        ctx.beginPath();
        ctx.moveTo(dataPoints2[0].x, dataPoints2[0].y);
        dataPoints2.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();

        // Draw data polygon border 2
        ctx.strokeStyle = '#dc004e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(dataPoints2[0].x, dataPoints2[0].y);
        dataPoints2.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.stroke();

        // Draw data points 2
        dataPoints2.forEach(point => {
            ctx.fillStyle = '#dc004e';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels with grades
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        axisLabels.forEach((label, index) => {
            const key = axisOrder[index];
            const outerRadius = radius * 1.3;
            const outerPoint = getPentPoint(index, outerRadius / radius);
            
            // 라벨 그리기
            ctx.fillText(label, outerPoint.x, outerPoint.y - 8);
            
            // 등급 그리기
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillStyle = '#1976d2';
            ctx.fillText(grades1[key], outerPoint.x - 15, outerPoint.y + 10);
            
            ctx.fillStyle = '#dc004e';
            ctx.fillText(grades2[key], outerPoint.x + 15, outerPoint.y + 10);
            
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillStyle = '#000000';
        });

        // 중앙에 평균 등급 표시
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = '#1976d2';
        ctx.fillText(avgGrade1, centerX - 25, centerY + 5);
        
        ctx.fillStyle = '#dc004e';
        ctx.fillText(avgGrade2, centerX + 25, centerY + 5);

    }, [pentData1, pentData2, grades1, grades2, avgGrade1, avgGrade2]);

    // 데이터가 없으면 early return
    if (!hasData) {
        return (
            <Box textAlign="center" py={4}>
                <Typography color="textSecondary">
                    비교 데이터를 불러올 수 없습니다.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* 범례 */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                backgroundColor: '#1976d2', 
                                borderRadius: '4px',
                                flexShrink: 0
                            }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: '600', 
                                        fontSize: '0.95rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={pres1?.title}
                                >
                                    {pres1?.title || '발표 1'}
                                </Typography>
                            </Box>
                            <Chip
                                label={`평균 ${avgGrade1}`}
                                size="small"
                                sx={{
                                    backgroundColor: getGradeColor(avgGrade1),
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '0.8rem',
                                    flexShrink: 0
                                }}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                backgroundColor: '#dc004e', 
                                borderRadius: '4px',
                                flexShrink: 0
                            }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: '600', 
                                        fontSize: '0.95rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={pres2?.title}
                                >
                                    {pres2?.title || '발표 2'}
                                </Typography>
                            </Box>
                            <Chip
                                label={`평균 ${avgGrade2}`}
                                size="small"
                                sx={{
                                    backgroundColor: getGradeColor(avgGrade2),
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '0.8rem',
                                    flexShrink: 0
                                }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* 5각형 비교 차트 */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mb: 4,
                minHeight: '450px'
            }}>
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={450}
                    style={{
                        maxWidth: '100%',
                        height: 'auto'
                    }}
                />
            </Box>

            {/* Detailed Metrics - 등급 기반 */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: '600', mb: 2 }}>
                📊 상세 비교
            </Typography>
            <Grid container spacing={2} sx={{ marginBottom: '30px' }}>
                <Grid item xs={6}>
                    <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', border: '2px solid #1976d2' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: '#1976d2', fontWeight: '600' }}>
                            📹 {pres1?.title || '발표 1'}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricItemWithGrade 
                                label="음성 강도" 
                                value={`${(metrics1.intensityDb || 0).toFixed(1)}dB`}
                                grade={grades1.voice}
                            />
                            <MetricItemWithGrade 
                                label="말하기 속도" 
                                value={`${(metrics1.wpmAvg || 0).toFixed(1)}WPM`}
                                grade={grades1.speed}
                            />
                            <MetricItemWithGrade 
                                label="표정" 
                                value={formatEmotionAnalysis(parseEmotionAnalysis(metrics1.emotionAnalysis))}
                                grade={grades1.expression}
                            />
                            <MetricItemWithGrade 
                                label="피치" 
                                value={`${(metrics1.pitchAvg || 0).toFixed(1)}Hz`}
                                grade={grades1.pitch}
                            />
                            <MetricItemWithGrade 
                                label="명확성" 
                                value={
                                    metrics1.pronunciationScore !== null && metrics1.pronunciationScore !== undefined
                                        ? `${(metrics1.pronunciationScore * 100).toFixed(1)}%`
                                        : '분석 대기'
                                }
                                grade={grades1.clarity}
                            />
                        </Box>
                    </Paper>
                </Grid>
                
                <Grid item xs={6}>
                    <Paper sx={{ p: 2, backgroundColor: '#fce4ec', border: '2px solid #dc004e' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ color: '#dc004e', fontWeight: '600' }}>
                            📹 {pres2?.title || '발표 2'}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricItemWithGrade 
                                label="음성 강도" 
                                value={`${(metrics2.intensityDb || 0).toFixed(1)}dB`}
                                grade={grades2.voice}
                            />
                            <MetricItemWithGrade 
                                label="말하기 속도" 
                                value={`${(metrics2.wpmAvg || 0).toFixed(1)}WPM`}
                                grade={grades2.speed}
                            />
                            <MetricItemWithGrade 
                                label="표정" 
                                value={formatEmotionAnalysis(parseEmotionAnalysis(metrics2.emotionAnalysis))}
                                grade={grades2.expression}
                            />
                            <MetricItemWithGrade 
                                label="피치" 
                                value={`${(metrics2.pitchAvg || 0).toFixed(1)}Hz`}
                                grade={grades2.pitch}
                            />
                            <MetricItemWithGrade 
                                label="명확성" 
                                value={
                                    metrics2.pronunciationScore !== null && metrics2.pronunciationScore !== undefined
                                        ? `${(metrics2.pronunciationScore * 100).toFixed(1)}%`
                                        : '분석 대기'
                                }
                                grade={grades2.clarity}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* AI 대본 비교 분석 결과 */}
            {hasData && (
                <Paper sx={{ p: 3, backgroundColor: '#f0f7ff', border: '2px solid #1976d2', mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: '700', color: '#1976d2', mb: 2 }}>
                        🤖 AI 대본 비교 분석
                    </Typography>
                    
                    {/* 개선된 부분 */}
                    {(aiAnalysisData.improvements_made || comparisonData.improvements_made) && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ 
                                fontWeight: '700',
                                color: '#1976d2',
                                mb: 1,
                                fontSize: '1.05rem'
                            }}>
                                💪 개선된 부분
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                mb: 0.5,
                                pl: 2,
                                color: '#444',
                                lineHeight: 1.8
                            }}>
                                {aiAnalysisData.improvements_made || comparisonData.improvements_made}
                            </Typography>
                        </Box>
                    )}
                    
                    {/* 개선이 필요한 부분 */}
                    {(aiAnalysisData.areas_to_improve || comparisonData.areas_to_improve) && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ 
                                fontWeight: '700',
                                color: '#1976d2',
                                mb: 1,
                                fontSize: '1.05rem'
                            }}>
                                💡 개선이 필요한 부분
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                mb: 0.5,
                                pl: 2,
                                color: '#444',
                                lineHeight: 1.8
                            }}>
                                {aiAnalysisData.areas_to_improve || comparisonData.areas_to_improve}
                            </Typography>
                        </Box>
                    )}
                    
                    {/* 전체 피드백 */}
                    {(aiAnalysisData.overall_feedback || comparisonData.overall_feedback) && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ 
                                fontWeight: '700',
                                color: '#1976d2',
                                mb: 1,
                                fontSize: '1.05rem'
                            }}>
                                📝 전체 피드백
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                mb: 0.5,
                                pl: 2,
                                color: '#444',
                                lineHeight: 1.8
                            }}>
                                {aiAnalysisData.overall_feedback || comparisonData.overall_feedback}
                            </Typography>
                        </Box>
                    )}
                    
                    {/* AI 분석 결과가 없는 경우 */}
                    {!(aiAnalysisData.improvements_made || aiAnalysisData.areas_to_improve || aiAnalysisData.overall_feedback || 
                       comparisonData.improvements_made || comparisonData.areas_to_improve || comparisonData.overall_feedback) && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" sx={{ 
                                mb: 0.5,
                                pl: 2,
                                color: '#666',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                py: 2
                            }}>
                                AI 대본 비교 분석 결과를 불러오는 중입니다...
                            </Typography>
                        </Box>
                    )}
                </Paper>
            )}

        </Box>
    );
};

// 메트릭 아이템 컴포넌트 (등급 포함)
const MetricItemWithGrade = ({ label, value, grade }) => {
    const getGradeColor = (grade) => {
        const colors = {
            'A': '#4caf50',
            'B': '#8bc34a',
            'C': '#ffc107',
            'D': '#ff9800',
            'E': '#f44336'
        };
        return colors[grade] || '#9e9e9e';
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: '500' }}>
                    {label}:
                </Typography>
                <Chip 
                    label={grade} 
                    size="small" 
                    sx={{ 
                        backgroundColor: getGradeColor(grade),
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        height: '22px',
                        minWidth: '28px'
                    }}
                />
            </Box>
            <Typography 
                variant="body2" 
                sx={{ 
                    fontWeight: '600', 
                    fontSize: '0.8rem',
                    color: '#666',
                    lineHeight: 1.2,
                    wordBreak: 'break-word'
                }}
            >
                {value}
            </Typography>
        </Box>
    );
};

export default ComparisonChart;
