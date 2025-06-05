import api from './axios';
import { API_ROUTES } from './constants';

const teamService = {
    // TODO: 서버에 팀 관련 컨트롤러 구현 후 연동 필요

    // 팀 생성
    async createTeam(teamData) {
        try {
            const response = await api.post(API_ROUTES.TEAM.CREATE, teamData);
            return response.data;
        } catch (error) {
            console.error('Team creation error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 생성에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 목록 조회
    async getTeams() {
        try {
            const response = await api.get(API_ROUTES.TEAM.LIST);
            return response.data;
        } catch (error) {
            console.error('Get teams error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 목록 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 특정 팀 조회
    async getTeam(teamId) {
        try {
            const response = await api.get(API_ROUTES.TEAM.GET.replace(':id', teamId));
            return response.data;
        } catch (error) {
            console.error('Get team error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 정보 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 정보 수정
    async updateTeam(teamId, teamData) {
        try {
            const response = await api.put(API_ROUTES.TEAM.UPDATE.replace(':id', teamId), teamData);
            return response.data;
        } catch (error) {
            console.error('Team update error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 정보 수정에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 삭제
    async deleteTeam(teamId) {
        try {
            const response = await api.delete(API_ROUTES.TEAM.DELETE.replace(':id', teamId));
            return response.data;
        } catch (error) {
            console.error('Team deletion error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 삭제에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 멤버 추가
    async addMember(teamId, userData) {
        try {
            const response = await api.post(API_ROUTES.TEAM.ADD_MEMBER.replace(':id', teamId), userData);
            return response.data;
        } catch (error) {
            console.error('Add member error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 멤버 추가에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 멤버 제거
    async removeMember(teamId, userId) {
        try {
            const response = await api.delete(
                API_ROUTES.TEAM.REMOVE_MEMBER
                    .replace(':id', teamId)
                    .replace(':userId', userId)
            );
            return response.data;
        } catch (error) {
            console.error('Remove member error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 멤버 제거에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },

    // 팀 멤버 목록 조회
    async getMembers(teamId) {
        try {
            const response = await api.get(API_ROUTES.TEAM.GET_MEMBERS.replace(':id', teamId));
            return response.data;
        } catch (error) {
            console.error('Get members error:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data || 
                                '팀 멤버 조회에 실패했습니다.';
            throw new Error(errorMessage);
        }
    },
};

export default teamService; 