import axios from './axios';

const COMMENT_API = {
  // 댓글 생성
  CREATE: (presentationId) => `/api/presentations/${presentationId}/comments`,
  // 댓글 수정
  UPDATE: (commentId) => `/api/comments/${commentId}`,
  // 댓글 삭제
  DELETE: (commentId) => `/api/comments/${commentId}`,
  // 프레젠테이션의 댓글 목록 조회
  GET_BY_PRESENTATION: (presentationId) => `/api/presentations/${presentationId}/comments`,
  // 특정 댓글의 대댓글 조회
  GET_REPLIES: (commentId) => `/api/comments/${commentId}/replies`,
  // 사용자의 댓글 목록 조회
  GET_BY_USER: (userId) => `/api/users/${userId}/comments`,
  // 댓글 검색
  SEARCH: (presentationId) => `/api/presentations/${presentationId}/comments/search`,
  // 댓글 수 조회
  GET_COUNT: (presentationId) => `/api/presentations/${presentationId}/comments/count`,
  // 대댓글 수 조회
  GET_REPLY_COUNT: (commentId) => `/api/comments/${commentId}/replies/count`,
  // 댓글 소유자 확인
  CHECK_OWNERSHIP: (commentId) => `/api/comments/${commentId}/ownership`,
};

export const commentService = {
  // 댓글 생성
  createComment: async (presentationId, commentData) => {
    try {
      const response = await axios.post(COMMENT_API.CREATE(presentationId), commentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 생성에 실패했습니다.');
    }
  },

  // 댓글 수정
  updateComment: async (commentId, commentData) => {
    try {
      const response = await axios.put(COMMENT_API.UPDATE(commentId), commentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 수정에 실패했습니다.');
    }
  },

  // 댓글 삭제
  deleteComment: async (commentId) => {
    try {
      await axios.delete(COMMENT_API.DELETE(commentId));
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 삭제에 실패했습니다.');
    }
  },

  // 프레젠테이션의 댓글 목록 조회
  getCommentsByPresentation: async (presentationId, sortBy = 'timestamp') => {
    try {
      const response = await axios.get(COMMENT_API.GET_BY_PRESENTATION(presentationId), {
        params: { sortBy }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 목록 조회에 실패했습니다.');
    }
  },

  // 특정 댓글의 대댓글 조회
  getRepliesByComment: async (commentId) => {
    try {
      const response = await axios.get(COMMENT_API.GET_REPLIES(commentId));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '대댓글 조회에 실패했습니다.');
    }
  },

  // 사용자의 댓글 목록 조회
  getCommentsByUser: async (userId) => {
    try {
      const response = await axios.get(COMMENT_API.GET_BY_USER(userId));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '사용자 댓글 조회에 실패했습니다.');
    }
  },

  // 댓글 검색
  searchComments: async (presentationId, keyword) => {
    try {
      const response = await axios.get(COMMENT_API.SEARCH(presentationId), {
        params: { keyword }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 검색에 실패했습니다.');
    }
  },

  // 댓글 수 조회
  getCommentCount: async (presentationId) => {
    try {
      const response = await axios.get(COMMENT_API.GET_COUNT(presentationId));
      return response.data.count;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 수 조회에 실패했습니다.');
    }
  },

  // 대댓글 수 조회
  getReplyCount: async (commentId) => {
    try {
      const response = await axios.get(COMMENT_API.GET_REPLY_COUNT(commentId));
      return response.data.count;
    } catch (error) {
      throw new Error(error.response?.data?.message || '대댓글 수 조회에 실패했습니다.');
    }
  },

  // 댓글 소유자 확인
  checkCommentOwnership: async (commentId) => {
    try {
      const response = await axios.get(COMMENT_API.CHECK_OWNERSHIP(commentId));
      return response.data.isOwner;
    } catch (error) {
      throw new Error(error.response?.data?.message || '댓글 소유자 확인에 실패했습니다.');
    }
  },
};

export default commentService; 