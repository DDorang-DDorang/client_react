import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import commentService from '../../api/commentService';

// 비동기 액션들
export const fetchComments = createAsyncThunk(
  'comment/fetchComments',
  async ({ presentationId, sortBy = 'timestamp' }, { rejectWithValue }) => {
    try {
      const response = await commentService.getCommentsByPresentation(presentationId, sortBy);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createComment = createAsyncThunk(
  'comment/createComment',
  async ({ presentationId, commentData }, { rejectWithValue }) => {
    try {
      const response = await commentService.createComment(presentationId, commentData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateComment = createAsyncThunk(
  'comment/updateComment',
  async ({ commentId, commentData }, { rejectWithValue }) => {
    try {
      const response = await commentService.updateComment(commentId, commentData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comment/deleteComment',
  async (commentId, { rejectWithValue }) => {
    try {
      await commentService.deleteComment(commentId);
      return commentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchComments = createAsyncThunk(
  'comment/searchComments',
  async ({ presentationId, keyword }, { rejectWithValue }) => {
    try {
      const response = await commentService.searchComments(presentationId, keyword);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  comments: [],
  commentCount: 0,
  loading: false,
  error: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,
  currentPresentationId: null,
  sortBy: 'timestamp'
};

const commentSlice = createSlice({
  name: 'comment',
  initialState,
  reducers: {
    clearComments: (state) => {
      state.comments = [];
      state.commentCount = 0;
      state.error = null;
      state.currentPresentationId = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    addCommentLocally: (state, action) => {
      state.comments.unshift(action.payload);
      state.commentCount += 1;
    },
    updateCommentLocally: (state, action) => {
      const { id, content, updatedAt } = action.payload;
      const commentIndex = state.comments.findIndex(comment => comment.id === id);
      if (commentIndex !== -1) {
        state.comments[commentIndex].content = content;
        state.comments[commentIndex].updatedAt = updatedAt;
      }
    },
    removeCommentLocally: (state, action) => {
      const commentId = action.payload;
      state.comments = state.comments.filter(comment => comment.id !== commentId);
      state.commentCount = Math.max(0, state.commentCount - 1);
    },
    addReplyLocally: (state, action) => {
      const { parentId, reply } = action.payload;
      const parentComment = state.comments.find(comment => comment.id === parentId);
      if (parentComment) {
        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(reply);
        parentComment.replyCount = (parentComment.replyCount || 0) + 1;
      }
      state.commentCount += 1;
    }
  },
  extraReducers: (builder) => {
    // fetchComments
    builder
      .addCase(fetchComments.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentPresentationId = action.meta.arg.presentationId;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload;
        state.commentCount = action.payload.length;
        state.error = null;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createComment
    builder
      .addCase(createComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.loading = false;
        // 새 댓글이면 목록에 추가, 답글이면 부모 댓글에 추가
        if (!action.payload.parentCommentId) {
          state.comments.unshift(action.payload);
        } else {
          const parentComment = state.comments.find(comment => comment.id === action.payload.parentCommentId);
          if (parentComment) {
            if (!parentComment.replies) {
              parentComment.replies = [];
            }
            parentComment.replies.push(action.payload);
            parentComment.replyCount = (parentComment.replyCount || 0) + 1;
          }
        }
        state.commentCount += 1;
        state.error = null;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // updateComment
    builder
      .addCase(updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const { id, content, updatedAt } = action.payload;
        const commentIndex = state.comments.findIndex(comment => comment.id === id);
        if (commentIndex !== -1) {
          state.comments[commentIndex].content = content;
          state.comments[commentIndex].updatedAt = updatedAt;
        }
        state.error = null;
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // deleteComment
    builder
      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        const commentId = action.payload;
        state.comments = state.comments.filter(comment => comment.id !== commentId);
        state.commentCount = Math.max(0, state.commentCount - 1);
        state.error = null;
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // searchComments
    builder
      .addCase(searchComments.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchComments.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.comments = action.payload;
        state.commentCount = action.payload.length;
        state.searchError = null;
      })
      .addCase(searchComments.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      });
  }
});

export const {
  clearComments,
  clearSearchResults,
  setSortBy,
  addCommentLocally,
  updateCommentLocally,
  removeCommentLocally,
  addReplyLocally
} = commentSlice.actions;

export default commentSlice.reducer; 