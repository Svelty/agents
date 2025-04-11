import dotenv from "dotenv";

dotenv.config();

// riotApi.ts
const API_BASE_URL = "https://na1.api.riotgames.com"; //"https://americas.api.riotgames.com"; -- where did this come from?
const API_KEY = process.env.RIOT_API_KEY;

async function fetchRiotData(endpoint: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    //@ts-ignore
    headers: {
      "X-Riot-Token": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const LeagueApi = {
  // LOL-RSO-MATCH-V1 (not all implemented)
  getRsoMatchById(matchId: string): Promise<any> {
    return fetchRiotData(`/lol/rso-match/v1/matches/${matchId}`);
  },
  getRsoTimeline(matchId: string): Promise<any> {
    return fetchRiotData(`/lol/rso-match/v1/matches/${matchId}/timeline`);
  },

  // LOL-STATUS-V4
  getPlatformData(): Promise<any> {
    return fetchRiotData("/lol/status/v4/platform-data");
  },

  // MATCH V5
  getMatchesByPuuid(puuid: string): Promise<any> {
    return fetchRiotData(`/lol/match/v5/matches/by-puuid/${puuid}/ids`);
  },
  getMatchById(matchId: string): Promise<any> {
    return fetchRiotData(`/lol/match/v5/matches/${matchId}`);
  },
  getMatchTimeline(matchId: string): Promise<any> {
    return fetchRiotData(`/lol/match/v5/matches/${matchId}/timeline`);
  },

  // SPECTATOR-V5
  getActiveGamesBySummoner(puuid: string): Promise<any> {
    return fetchRiotData(`/lol/spectator/v5/active-games/by-summoner/${puuid}`);
  },
  getFeaturedGames(): Promise<any> {
    return fetchRiotData("/lol/spectator/v5/featured-games");
  },

  // SUMMONER-V4
  getFulfillmentByPuuid(puuid: string): Promise<any> {
    return fetchRiotData(`/fulfillment/v1/summoners/by-puuid/${puuid}`);
  },
  getSummonerByAccountId(accountId: string): Promise<any> {
    return fetchRiotData(`/lol/summoner/v4/summoners/by-account/${accountId}`);
  },
  getSummonerByPuuid(puuid: string): Promise<any> {
    return fetchRiotData(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
  },
  getSummonerByAccessToken(): Promise<any> {
    return fetchRiotData("/lol/summoner/v4/summoners/me");
  },
  getSummonerById(summonerId: string): Promise<any> {
    return fetchRiotData(`/lol/summoner/v4/summoners/${summonerId}`);
  },

  // TOURNAMENT STUB V5
  getTournamentStubByCode(code: string): Promise<any> {
    return fetchRiotData(`/lol/tournament-stub/v5/codes/${code}`);
  },
  getLobbyEventStubByTournamentCode(code: string): Promise<any> {
    return fetchRiotData(
      `/lol/tournament-stub/v5/lobby-events/by-code/${code}`
    );
  },

  // TOURNAMENT V5
  getTournamentByCode(code: string): Promise<any> {
    return fetchRiotData(`/lol/tournament/v5/codes/${code}`);
  },
  getGameDetailsByTournamentCode(code: string): Promise<any> {
    return fetchRiotData(`/lol/tournament/v5/games/by-code/${code}`);
  },
  getLobbyEventsByTournamentCode(code: string): Promise<any> {
    return fetchRiotData(`/lol/tournament/v5/lobby-events/by-code/${code}`);
  },

  // ACCOUNT ENDPOINTS (there are several more not included here)
  getAccountByPuuid(puuid: string): Promise<any> {
    return fetchRiotData(`/riot/account/v1/accounts/by-puuid/${puuid}`);
  },

  // TODO: CHAMPION MASTERY

  // LEAGUE-EXP V4 (WHAT IS THE DIFFERENCE BETWEEN THIS AND THE LEAGUE V4)
  getSummonersExpByQueueTierDivision(
    queue: string,
    tier: string,
    division: string
  ): Promise<any> {
    return fetchRiotData(
      `/lol/league-exp/v4/entries/${queue}/${tier}/${division}`
    );
  },

  // LEAGUE V4 endpoints
  getSummonersByQueueTierDivision(
    queue: string,
    tier: string,
    division: string
  ): Promise<any> {
    return fetchRiotData(`/lol/league/v4/entries/${queue}/${tier}/${division}`);
    // results are paginated, but no pagination data is returned
    // so you just have to walk through pages until the end
    // (e.g. 206 pages for IRON/II: page=180 etc.)
  },

  // TODO: does this return summoners?
  getChallengerSummonersByQueue(queue: string): Promise<any> {
    return fetchRiotData(`/lol/league/v4/challengerleagues/by-queue/${queue}`);
  },
  // /lol/league/v4/grandmasterleagues/by-queue/{queue}
  // /lol/league/v4/masterleagues/by-queue/{queue}

  getSummonerLeaguesByPuuid(puuid: string): Promise<any> {
    return fetchRiotData(`/lol/league/v4/entries/by-puuid/${puuid}`);
  },
  getSummonerLeaguesBySummonerId(summonerId: string): Promise<any> {
    return fetchRiotData(`/lol/league/v4/entries/by-summoner/${summonerId}`);
  },
  getSummonersByLeagueId(leagueId: string): Promise<any> {
    return fetchRiotData(`/lol/league/v4/leagues/${leagueId}`);
  },
};

//can include api key as query param &api_key=RGAPI-1d7d1e13-104d-4b83-99b9-6a65bea4c24b
//or as header  "X-Riot-Token": "RGAPI-1d7d1e13-104d-4b83-99b9-6a65bea4c24b"

// my PUID: FKT_5421lmd2-YGI8MsZ9kEZRFV1NeqZ1s0J6o7QSxdT4c7ekLvbxVVgro5ArxYvqtCdgBWpeAV9tA

//get matches for puuid: /lol/match/v5/matches/by-puuid/{puuid}/ids

//get challenger players for a queue /lol/league/v4/challengerleagues/by-queue/{queue}
///RANKED_SOLO_5x5,RANKED_FLEX_SR,/RANKED_FLEX_TT

///lol/league/v4/grandmasterleagues/by-queue/{queue}
///lol/league/v4/masterleagues/by-queue/{queue}

//I think this is probably the best way to build a list of summoners
///lol/league/v4/entries/{queue}/{tier}/{division}

//results are paginated, but no pagination data is returned so i guess you just have to walk though it till the end - (i found 206 pages for the following)
//https://na1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/IRON/II?page=180&api_key=RGAPI-1d7d1e13-104d-4b83-99b9-6a65bea4c24b
