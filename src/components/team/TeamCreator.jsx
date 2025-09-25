import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTeam } from '../../store/slices/teamSlice';
import { Box, Button, TextField, Typography, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const TeamCreator = ({ open, onTeamCreated, onClose }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.team);
  
  const [teamName, setTeamName] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      setValidationError('팀 이름을 입력해주세요.');
      return;
    }

    if (teamName.trim().length < 2) {
      setValidationError('팀 이름은 2자 이상이어야 합니다.');
      return;
    }

    setValidationError('');
    
    try {
      const result = await dispatch(createTeam({ name: teamName.trim() })).unwrap();
      setTeamName('');
      // 팀 생성 성공 후 다이얼로그 닫기
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('팀 생성 실패:', error);
    }
  };

  const handleCancel = () => {
    setTeamName('');
    setValidationError('');
    if (onClose) {
      onClose();
    }
  };

  // open prop이 있으면 다이얼로그로, 없으면 일반 컴포넌트로 렌더링
  if (open !== undefined) {
    return (
             <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>
           새 팀 만들기
         </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {validationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="팀 이름"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="팀 이름을 입력하세요"
              margin="normal"
              required
              disabled={loading}
              error={!!validationError}
              helperText={validationError}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={loading || !teamName.trim()}
          >
            {loading ? '생성 중...' : '팀 생성'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // 일반 컴포넌트 렌더링 (기존 코드)
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        새 팀 만들기
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {validationError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="팀 이름"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="팀 이름을 입력하세요"
          margin="normal"
          required
          disabled={loading}
          error={!!validationError}
          helperText={validationError}
        />
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={loading || !teamName.trim()}
          >
            {loading ? '생성 중...' : '팀 생성'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default TeamCreator;
