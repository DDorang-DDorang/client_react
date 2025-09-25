import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTeam } from '../../store/slices/teamSlice';
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
import { Edit as EditIcon } from '@mui/icons-material';

const TeamEditor = ({ open, onClose, team, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.team);
  
  const [teamName, setTeamName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (team) {
      setTeamName(team.name || '');
    }
  }, [team]);

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

    if (teamName.trim() === team.name) {
      setValidationError('변경된 내용이 없습니다.');
      return;
    }

    setValidationError('');
    
    try {
      await dispatch(updateTeam({ 
        teamId: team.id, 
        teamData: { name: teamName.trim() } 
      })).unwrap();
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('팀 정보 수정 실패:', error);
    }
  };

  const handleClose = () => {
    setTeamName(team?.name || '');
    setValidationError('');
    onClose();
  };

  if (!team) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon />
          <Typography variant="h6">팀 정보 편집</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          팀 이름을 수정할 수 있습니다.
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
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <EditIcon />}
          disabled={loading || !teamName.trim() || teamName.trim() === team.name}
        >
          {loading ? '수정 중...' : '수정'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamEditor;
