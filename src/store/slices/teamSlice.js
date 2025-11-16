import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { teamService } from '../../api/teamService';

// Async thunks
export const fetchUserTeams = createAsyncThunk(
  'team/fetchUserTeams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await teamService.getUserTeams();
      return response;
    } catch (error) {
      return rejectWithValue(error.message || '팀 목록을 불러오는데 실패했습니다.');
    }
  }
);

export const fetchTeamById = createAsyncThunk(
  'team/fetchTeamById',
  async (teamId, { rejectWithValue }) => {
    try {
      const response = await teamService.getTeamById(teamId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || '팀 정보를 불러오는데 실패했습니다.');
    }
  }
);

export const createTeam = createAsyncThunk(
  'team/createTeam',
  async (teamData, { rejectWithValue }) => {
    try {
      const response = await teamService.createTeam(teamData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || '팀 생성에 실패했습니다.');
    }
  }
);

export const updateTeam = createAsyncThunk(
  'team/updateTeam',
  async ({ teamId, teamData }, { rejectWithValue }) => {
    try {
      const response = await teamService.updateTeam(teamId, teamData);
      return { teamId, teamData: response };
    } catch (error) {
      return rejectWithValue(error.message || '팀 정보 수정에 실패했습니다.');
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'team/deleteTeam',
  async (teamId, { rejectWithValue }) => {
    try {
      await teamService.deleteTeam(teamId);
      return teamId;
    } catch (error) {
      const backendMessage = error?.response?.data?.message || error?.response?.data?.error || error?.response?.data?.detail;
      return rejectWithValue(backendMessage || error.message || '팀 삭제에 실패했습니다.');
    }
  }
);

export const joinTeamByInvite = createAsyncThunk(
  'team/joinTeamByInvite',
  async (inviteCode, { rejectWithValue }) => {
    try {
      const response = await teamService.joinTeamByInvite(inviteCode);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || '팀 참가에 실패했습니다.');
    }
  }
);

export const leaveTeam = createAsyncThunk(
  'team/leaveTeam',
  async (teamId, { rejectWithValue }) => {
    try {
      await teamService.leaveTeam(teamId);
      return teamId;
    } catch (error) {
      return rejectWithValue(error.message || '팀을 떠나는데 실패했습니다.');
    }
  }
);

export const removeMember = createAsyncThunk(
  'team/removeMember',
  async ({ teamId, memberId }, { rejectWithValue }) => {
    try {
      await teamService.removeMember(teamId, memberId);
      return { teamId, memberId };
    } catch (error) {
      return rejectWithValue(error.message || '멤버 제거에 실패했습니다.');
    }
  }
);

const initialState = {
  teams: [],
  currentTeam: null,
  loading: false,
  error: null,
  inviteCode: null,
  inviteUrl: null
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTeam: (state) => {
      state.currentTeam = null;
    },
    setInviteCode: (state, action) => {
      state.inviteCode = action.payload;
    },
    clearInviteCode: (state) => {
      state.inviteCode = null;
      state.inviteUrl = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchUserTeams
      .addCase(fetchUserTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchUserTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchTeamById
      .addCase(fetchTeamById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeam = action.payload;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createTeam
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateTeam
      .addCase(updateTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        const { teamId, teamData } = action.payload;
        const teamIndex = state.teams.findIndex(team => team.id === teamId);
        if (teamIndex !== -1) {
          state.teams[teamIndex] = teamData;
        }
        if (state.currentTeam && state.currentTeam.id === teamId) {
          state.currentTeam = teamData;
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteTeam
      .addCase(deleteTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading = false;
        const teamId = action.payload;
        state.teams = state.teams.filter(team => team.id !== teamId);
        if (state.currentTeam && state.currentTeam.id === teamId) {
          state.currentTeam = null;
        }
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // joinTeamByInvite
      .addCase(joinTeamByInvite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinTeamByInvite.fulfilled, (state, action) => {
        state.loading = false;
        const existingTeamIndex = state.teams.findIndex(team => team.id === action.payload.id);
        if (existingTeamIndex === -1) {
          state.teams.push(action.payload);
        }
      })
      .addCase(joinTeamByInvite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // leaveTeam
      .addCase(leaveTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(leaveTeam.fulfilled, (state, action) => {
        state.loading = false;
        const teamId = action.payload;
        state.teams = state.teams.filter(team => team.id !== teamId);
        if (state.currentTeam && state.currentTeam.id === teamId) {
          state.currentTeam = null;
        }
      })
      .addCase(leaveTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // removeMember
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        const { teamId, memberId } = action.payload;
        if (state.currentTeam && state.currentTeam.id === teamId) {
          state.currentTeam.members = state.currentTeam.members.filter(
            member => member.id !== memberId
          );
          state.currentTeam.memberCount = state.currentTeam.members.length;
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearCurrentTeam, setInviteCode, clearInviteCode } = teamSlice.actions;
export default teamSlice.reducer;
