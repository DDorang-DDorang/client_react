import React, { useState } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    Typography,
    Paper,
    Chip,
    CircularProgress
} from '@mui/material';
import { Search as SearchIcon, VideoLibrary as VideoIcon } from '@mui/icons-material';

const PresentationSelector = ({ 
    presentations, 
    selectedPresentation, 
    onSelectPresentation, 
    placeholder = "발표를 선택하세요",
    disabled = false,
    teams = [] // 팀 정보를 props로 받기
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // 검색 필터링
    const filteredPresentations = presentations.filter(presentation =>
        presentation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        presentation.displayTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        presentation.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        presentation.script?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 발표 옵션 포맷팅
    const presentationOptions = filteredPresentations.map(presentation => {
        // 토픽 정보를 기반으로 private/팀 정보 결정
        let visibilityInfo = '';
        if (presentation.topicId) {
            // 토픽 정보가 있는 경우 (비교 페이지에서 사용)
            visibilityInfo = '개인';
        } else if (presentation.isTeamTopic) {
            // 팀 토픽인 경우
            if (presentation.teamName) {
                visibilityInfo = `팀: ${presentation.teamName}`;
            } else if (presentation.teamId) {
                // 팀 ID로 팀명 찾기
                const team = teams.find(t => t.id === presentation.teamId);
                visibilityInfo = team ? `팀: ${team.name}` : '팀';
            } else {
                visibilityInfo = '팀';
            }
        } else {
            // 개인 토픽인 경우
            visibilityInfo = '개인';
        }

        return {
            ...presentation,
            // 이미 label이 있으면 그대로 사용, 없으면 displayTitle 또는 title 사용
            label: presentation.label || presentation.displayTitle || presentation.title || '제목 없음',
            subtitle: presentation.subtitle || visibilityInfo
        };
    });

    const handleChange = (event, newValue) => {
        onSelectPresentation(newValue);
    };

    const handleInputChange = (event, newInputValue) => {
        setSearchTerm(newInputValue);
    };

    return (
        <Autocomplete
            value={selectedPresentation}
            onChange={handleChange}
            onInputChange={handleInputChange}
            options={presentationOptions}
            getOptionLabel={(option) => {
                if (!option) return '';
                return option.label || option.displayTitle || option.title || '제목 없음';
            }}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            disabled={disabled}
            loading={false}
            noOptionsText="발표를 찾을 수 없습니다"
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder={placeholder}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
                        endAdornment: (
                            <>
                                {false && <CircularProgress color="inherit" size={20} />}
                                {params.InputProps.endAdornment}
                            </>
                        )
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1976d2'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1976d2',
                                borderWidth: 2
                            }
                        }
                    }}
                />
            )}
            renderOption={(props, option) => (
                <Box
                    component="li"
                    {...props}
                    sx={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f0f0f0',
                        '&:last-child': {
                            borderBottom: 'none'
                        },
                        '&:hover': {
                            backgroundColor: '#f5f5f5'
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                        <VideoIcon 
                            sx={{ 
                                color: '#1976d2', 
                                mr: 2, 
                                mt: 0.5,
                                fontSize: '20px'
                            }} 
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                    fontWeight: '600',
                                    color: '#000',
                                    marginBottom: '4px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {option.label}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: '#666',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.4,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                }}
                            >
                                {option.subtitle}
                            </Typography>
                            
                            {/* 메타데이터 */}
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 1, 
                                marginTop: 1,
                                flexWrap: 'wrap'
                            }}>
                                {/* 토픽인 경우 발표 개수 표시 */}
                                {option.presentations && (
                                    <Chip
                                        label={`📁 ${option.presentations.length}개 발표`}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#fff3e0',
                                            color: '#f57c00',
                                            fontSize: '0.75rem',
                                            height: '20px'
                                        }}
                                    />
                                )}
                                {/* 발표인 경우 기존 메타데이터 표시 */}
                                {option.topicTitle && !option.presentations && (
                                    <Chip
                                        label={`📁 ${option.topicTitle}`}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#fff3e0',
                                            color: '#f57c00',
                                            fontSize: '0.75rem',
                                            height: '20px'
                                        }}
                                    />
                                )}
                                {option.goalTime && (
                                    <Chip
                                        label={`목표: ${option.goalTime}분`}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#e3f2fd',
                                            color: '#1976d2',
                                            fontSize: '0.75rem',
                                            height: '20px'
                                        }}
                                    />
                                )}
                                {option.type && (
                                    <Chip
                                        label={option.type === 'upload' ? '업로드' : '녹화'}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#f3e5f5',
                                            color: '#7b1fa2',
                                            fontSize: '0.75rem',
                                            height: '20px'
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}
            PaperComponent={({ children, ...other }) => (
                <Paper 
                    {...other} 
                    sx={{ 
                        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflow: 'auto'
                    }}
                >
                    {children}
                </Paper>
            )}
            ListboxProps={{
                style: {
                    maxHeight: '300px',
                    padding: 0
                }
            }}
        />
    );
};

export default PresentationSelector;
