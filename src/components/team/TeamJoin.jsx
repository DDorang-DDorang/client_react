import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { joinTeamByInvite } from '../../store/slices/teamSlice';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { GroupAdd as GroupAddIcon } from '@mui/icons-material';

const TeamJoin = ({ open, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.team);
  const [searchParams] = useSearchParams();
  
  const [inviteCode, setInviteCode] = useState('');
  const [validationError, setValidationError] = useState('');

  // URL 파라미터에서 초대 코드 자동 추출
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && open) {
      setInviteCode(codeFromUrl);
      setValidationError('');
    }
  }, [searchParams, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setValidationError('초대 코드를 입력해주세요.');
      return;
    }

    setValidationError('');
    
    try {
      const result = await dispatch(joinTeamByInvite(inviteCode.trim())).unwrap();
      setInviteCode('');
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (error) {
      console.error('팀 참가 실패:', error);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setValidationError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupAddIcon />
          <Typography variant="h6">팀 참가</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          팀원으로부터 받은 초대 코드를 입력하여 팀에 참가할 수 있습니다.
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
            label="초대 코드"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="초대 코드를 입력하세요"
            margin="normal"
            required
            disabled={loading}
            error={!!validationError}
            helperText={validationError}
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <GroupAddIcon />}
          disabled={loading || !inviteCode.trim()}
        >
          {loading ? '참가 중...' : '팀 참가'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamJoin;
