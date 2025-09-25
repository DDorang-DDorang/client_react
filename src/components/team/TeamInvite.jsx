import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { teamService } from '../../api/teamService';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
  Chip,
  Divider
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

// 날짜 포맷팅 함수
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
};

const TeamInvite = ({ open, onClose, team }) => {
  const dispatch = useDispatch();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    if (open && team) {
      generateInvite();
    }
  }, [open, team]);

  const generateInvite = async () => {
    if (!team) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await teamService.createInvite(team.id, {});
      setInviteCode(response.inviteCode);
      if (response.expiresAt) {
        setExpiresAt(new Date(response.expiresAt));
      }
    } catch (error) {
      setError(error.message || '초대 코드 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopySuccess('초대 코드가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      setCopySuccess('클립보드 복사에 실패했습니다.');
    }
  };


  const handleClose = () => {
    setInviteCode('');
    setError('');
    setCopySuccess('');
    setExpiresAt(null);
    onClose();
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return '만료됨';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}시간 ${minutes}분 남음`;
  };

  if (!team) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {team.name} 팀에 멤버 초대
            </Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>초대 코드를 생성하는 중...</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                아래 초대 코드를 공유하여 팀원을 초대할 수 있습니다.
              </Typography>
              
              {/* 초대 코드 */}
              <Paper elevation={1} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  초대 코드
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    value={inviteCode}
                    InputProps={{ readOnly: true }}
                    size="small"
                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '14px' } }}
                  />
                  <Tooltip title="초대 코드 복사">
                    <IconButton onClick={handleCopyInviteCode} color="primary">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  초대 코드를 직접 입력하여 팀에 참가할 수 있습니다.
                </Typography>
              </Paper>

              {/* 만료 시간 */}
              {expiresAt && (
                <Box sx={{ mt: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AccessTimeIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        초대 만료 시간
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2">
                        {formatDateTime(expiresAt)}
                      </Typography>
                      <Chip 
                        label={getTimeRemaining()} 
                        size="small" 
                        color={getTimeRemaining() === '만료됨' ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />
              
              {/* 사용 방법 */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  사용 방법
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    1. 초대 코드를 팀원에게 공유합니다.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    2. 팀원이 초대 코드를 입력하여 팀에 참가합니다.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    3. 자동으로 팀에 참가되어 팀 토픽과 프레젠테이션에 접근할 수 있습니다.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>
            닫기
          </Button>
          {!loading && (
            <Button
              variant="contained"
              onClick={generateInvite}
              disabled={loading}
            >
              새로고침
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={!!copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess('')}
        message={copySuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default TeamInvite;
