import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Reply as ReplyIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { 
  fetchComments, 
  createComment, 
  updateComment, 
  deleteComment, 
  searchComments,
  clearComments,
  setSortBy
} from '../store/slices/commentSlice';

const CommentSection = ({ presentationId, currentTime = 0, onSeekToTime }) => {
  const dispatch = useDispatch();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [seekTime, setSeekTime] = useState(currentTime); // 시간 이동 모달에서 사용할 상태
  const [isSeekTimeDialogOpen, setIsSeekTimeDialogOpen] = useState(false); // 시간 이동 모달 상태

  // Redux store에서 상태 가져오기
  const { comments, commentCount, loading, error, sortBy, searchLoading, searchError } = useSelector(state => state.comment);
  const user = useSelector(state => state.auth.user);
  
  // 현재 사용자 정보 설정
  const currentUser = user ? {
    id: user.userId || user.id,
    name: user.name || user.username || user.email?.split('@')[0] || '사용자',
    email: user.email || 'user@example.com',
    avatar: user.avatar || null
  } : null;

  // 댓글 목록 조회
  useEffect(() => {
    if (presentationId) {
      dispatch(fetchComments({ presentationId, sortBy }));
    }
    
    // 컴포넌트 언마운트 시 댓글 상태 정리
    return () => {
      dispatch(clearComments());
    };
  }, [presentationId, sortBy, dispatch]);

  // 정렬 변경 핸들러
  const handleSortChange = (newSortBy) => {
    dispatch(setSortBy(newSortBy));
  };

  // 댓글 검색
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      // 검색어가 없으면 일반 댓글 목록 로드
      dispatch(fetchComments({ presentationId, sortBy }));
      return;
    }

    // 검색어가 있으면 검색 실행
    dispatch(searchComments({ presentationId, keyword: searchKeyword }));
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchKeyword('');
    dispatch(fetchComments({ presentationId, sortBy }));
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const commentData = {
        content: newComment,
        timestamp: Math.floor(currentTime),
        parentCommentId: null
      };

      await dispatch(createComment({ presentationId, commentData })).unwrap();
      setNewComment('');
    } catch (err) {
      console.error('댓글 작성 오류:', err);
    }
  };

  // 답글 작성
  const handleSubmitReply = async (parentId) => {
    if (!editText.trim() || !currentUser) return;

    try {
      const commentData = {
        content: editText,
        timestamp: Math.floor(currentTime),
        parentCommentId: parentId
      };

      await dispatch(createComment({ presentationId, commentData })).unwrap();
      setEditText('');
      setReplyTo(null);
    } catch (err) {
      console.error('답글 작성 오류:', err);
    }
  };

  // 댓글 수정
  const handleEditComment = async () => {
    if (!editText.trim()) return;

    try {
      const commentData = { content: editText };
      await dispatch(updateComment({ commentId: editingComment.id, commentData })).unwrap();
      setEditText('');
      setEditingComment(null);
    } catch (err) {
      console.error('댓글 수정 오류:', err);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await dispatch(deleteComment(commentId)).unwrap();
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
    }
  };

  // 대댓글 토글
  const toggleReplies = (commentId) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  // 현재 시간에 댓글 추가
  const handleAddCommentAtCurrentTime = () => {
    if (!currentUser) {
      return;
    }
    // 현재 시간을 초 단위로 변환하여 표시
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    setNewComment(`[${minutes}:${seconds.toString().padStart(2, '0')}] `);
  };

  // 시간 선택 모달 열기
  const handleOpenSeekTimeDialog = (initialTime = 0) => {
    setSeekTime(initialTime);
    setIsSeekTimeDialogOpen(true);
  };

  // 시간 선택 모달 닫기
  const handleCloseSeekTimeDialog = () => {
    setIsSeekTimeDialogOpen(false);
  };

  // 선택한 시간으로 이동
  const handleSeekToSelectedTime = () => {
    if (onSeekToTime) {
      onSeekToTime(seekTime);
    }
    handleCloseSeekTimeDialog();
  };

  // 시간 입력 처리 (MM:SS 형식)
  const handleTimeInputChange = (value) => {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = value.match(timeRegex);
    
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      
      if (seconds < 60) {
        const totalSeconds = minutes * 60 + seconds;
        setSeekTime(totalSeconds);
      }
    }
  };

  // 댓글 내용에서 시간 형식 추출 및 클릭 가능하게 렌더링
  const renderCommentContent = (content) => {
    // [MM:SS] 형식의 시간을 찾는 정규식
    const timeRegex = /\[(\d{1,2}):(\d{2})\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timeRegex.exec(content)) !== null) {
      // 시간 형식 이전 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // 시간 형식을 클릭 가능한 컴포넌트로 변환
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSeconds = minutes * 60 + seconds;

      parts.push(
        <Typography
          key={`time-${match.index}`}
          component="span"
          sx={{
            color: '#2196f3',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 'bold',
            '&:hover': {
              color: '#1976d2',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              padding: '1px 2px'
            }
          }}
          onClick={() => onSeekToTime && onSeekToTime(totalSeconds)}
          title={`${match[0]} 시간으로 이동`}
        >
          {match[0]}
        </Typography>
      );

      lastIndex = match.index + match[0].length;
    }

    // 마지막 부분 추가
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderComment = (comment, isReply = false) => {
    const isAuthor = comment.userId === currentUser?.id;
    const isEditing = editingComment?.id === comment.id;
    const isReplying = replyTo?.id === comment.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);

    return (
      <ListItem
        key={comment.id}
        sx={{
          flexDirection: 'column',
          alignItems: 'flex-start',
          pl: isReply ? 4 : 2,
          pr: 2,
          py: 1
        }}
      >
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
          <ListItemAvatar>
            <Avatar>
              {comment.userName ? comment.userName.charAt(0) : 'U'}
            </Avatar>
          </ListItemAvatar>
          
          <Box sx={{ flex: 1, ml: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mr: 1 }}>
                {comment.userName || '사용자'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {formatDate(comment.createdAt)}
              </Typography>
              {comment.timestamp !== null && (
                <Chip 
                  label={formatTime(comment.timestamp)} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    mr: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#e3f2fd',
                      borderColor: '#2196f3'
                    }
                  }}
                  onClick={() => handleOpenSeekTimeDialog(comment.timestamp)}
                  title="클릭하여 시간 선택"
                />
              )}
              {isAuthor && (
                <Chip 
                  label="작성자" 
                  size="small" 
                  color="primary" 
                  sx={{ height: 20 }}
                />
              )}
            </Box>

            {isEditing ? (
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleEditComment}
                    disabled={loading}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    취소
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {renderCommentContent(comment.content)}
              </Typography>
            )}

            {!isEditing && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {!isReply && (
                  <Button
                    size="small"
                    startIcon={<ReplyIcon />}
                    onClick={() => setReplyTo(comment)}
                    disabled={isReplying}
                  >
                    답글
                  </Button>
                )}
                {hasReplies && !isReply && (
                  <Button
                    size="small"
                    startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => toggleReplies(comment.id)}
                  >
                    답글 {comment.replyCount || comment.replies.length}개
                  </Button>
                )}
                {isAuthor && (
                  <>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setEditingComment(comment);
                        setEditText(comment.content);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      color="error"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      삭제
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {isReplying && !isReply && (
          <Box sx={{ width: '100%', mt: 2, pl: 4 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="답글을 입력하세요..."
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={loading}
                startIcon={<SendIcon />}
              >
                답글 작성
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setReplyTo(null);
                  setEditText('');
                }}
              >
                취소
              </Button>
            </Box>
          </Box>
        )}

        {hasReplies && isExpanded && !isReply && (
          <Box sx={{ width: '100%', mt: 1 }}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </Box>
        )}
      </ListItem>
    );
  };

  if (!currentUser) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          댓글을 작성하려면 로그인이 필요합니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontSize: '18px' }}>
        💬 댓글 ({loading ? '...' : commentCount})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {searchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {searchError}
        </Alert>
      )}

      {/* 검색 및 정렬 영역 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="댓글 검색..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {searchKeyword && (
                  <IconButton onClick={handleClearSearch} size="small">
                    <CloseIcon />
                  </IconButton>
                )}
                <IconButton onClick={handleSearch} disabled={searchLoading}>
                  {searchLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>정렬</InputLabel>
          <Select
            value={sortBy}
            label="정렬"
            onChange={(e) => handleSortChange(e.target.value)}
            disabled={searchLoading}
          >
            <MenuItem value="timestamp">시간순</MenuItem>
            <MenuItem value="createdAt">최신순</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          onClick={handleAddCommentAtCurrentTime}
          disabled={searchLoading}
        >
          현재 시간에 댓글
        </Button>
      </Box>

      {/* 검색 결과 표시 */}
      {searchKeyword && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleClearSearch}>
              검색 초기화
            </Button>
          }
        >
          "{searchKeyword}" 검색 결과: {commentCount}개의 댓글
        </Alert>
      )}

      {/* 댓글 작성 영역 */}
      <Box sx={{ mb: 3, backgroundColor: '#f8f9fa', p: 2, borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Avatar sx={{ mt: 1 }}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} />
            ) : (
              currentUser.name.charAt(0)
            )}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="영상에 대한 의견을 남겨주세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              variant="outlined"
              disabled={loading}
              InputProps={{
                sx: {
                  '& .MuiInputBase-input': {
                    cursor: 'text'
                  }
                }
              }}
            />
            {/* 댓글 내용에 시간 형식이 있을 때 미리보기 */}
            {newComment.includes('[') && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '14px' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  미리보기 (시간 형식을 클릭하면 해당 시간으로 이동):
                </Typography>
                <Box sx={{ lineHeight: 1.4 }}>
                  {renderCommentContent(newComment)}
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || loading}
                startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
              >
                댓글 작성
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 댓글 목록 */}
      <Box>
        {(loading || searchLoading) && comments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              {searchLoading ? '검색 중...' : '댓글을 불러오는 중...'}
            </Typography>
          </Box>
        ) : comments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {searchKeyword ? '검색 결과가 없습니다.' : '아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {comments.map(comment => renderComment(comment))}
          </List>
        )}
      </Box>

      {/* 시간 이동 모달 */}
      <Dialog open={isSeekTimeDialogOpen} onClose={handleCloseSeekTimeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon />
          시간 이동
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              현재 시간: {formatTime(Math.floor(currentTime))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이동할 시간: {formatTime(seekTime)}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              시간 직접 입력 (MM:SS 형식)
            </Typography>
            <TextField
              fullWidth
              placeholder="예: 02:30"
              value={formatTime(seekTime)}
              onChange={(e) => handleTimeInputChange(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              슬라이더로 시간 조정
            </Typography>
            <Slider
              value={seekTime}
              onChange={(event, newValue) => setSeekTime(newValue)}
              min={0}
              max={Math.max(300, Math.floor(currentTime) + 60)} // 최소 5분, 현재 시간 + 1분
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => formatTime(value)}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                0:00
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(Math.max(300, Math.floor(currentTime) + 60))}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSeekTime(Math.max(0, Math.floor(currentTime) - 30))}
            >
              -30초
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSeekTime(Math.floor(currentTime))}
            >
              현재 시간
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSeekTime(Math.floor(currentTime) + 30)}
            >
              +30초
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSeekTimeDialog}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleSeekToSelectedTime}
            startIcon={<AccessTimeIcon />}
          >
            이동
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommentSection; 