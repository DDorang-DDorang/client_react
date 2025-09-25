import axios from './axios';

const TEAM_API_BASE = '/api/teams';

export const teamService = {
    // 팀 생성
  createTeam: async (teamData) => {
    const response = await axios.post(TEAM_API_BASE, teamData);
            return response.data;
  },

  // 사용자의 팀 목록 조회
  getUserTeams: async () => {
    const response = await axios.get(TEAM_API_BASE);
            return response.data;
  },

  // 팀 상세 정보 조회
  getTeamById: async (teamId) => {
    const response = await axios.get(`${TEAM_API_BASE}/${teamId}`);
            return response.data;
    },

    // 팀 정보 수정
  updateTeam: async (teamId, teamData) => {
    const response = await axios.put(`${TEAM_API_BASE}/${teamId}`, teamData);
            return response.data;
    },

    // 팀 삭제
  deleteTeam: async (teamId) => {
    const response = await axios.delete(`${TEAM_API_BASE}/${teamId}`);
    return response.data;
  },

  // 팀 초대 링크 생성
  createInvite: async (teamId, inviteData) => {
    const response = await axios.post(`${TEAM_API_BASE}/${teamId}/invites`, inviteData);
    return response.data;
  },

  // 팀 초대 링크 조회
  getTeamInvites: async (teamId) => {
    const response = await axios.get(`${TEAM_API_BASE}/${teamId}/invites`);
            return response.data;
  },

  // 초대 코드로 팀 참가
  joinTeamByInvite: async (inviteCode) => {
    const response = await axios.post(`${TEAM_API_BASE}/join/${inviteCode}`);
            return response.data;
    },

    // 팀 멤버 제거
  removeMember: async (teamId, memberId) => {
    const response = await axios.delete(`${TEAM_API_BASE}/${teamId}/members/${memberId}`);
            return response.data;
  },

  // 팀 떠나기
  leaveTeam: async (teamId) => {
    const response = await axios.post(`${TEAM_API_BASE}/${teamId}/leave`);
            return response.data;
  }
}; 