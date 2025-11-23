import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Deal {
  id: string;
  depositToken: string;
  targetToken: string;
  targetChainId: string;
  status: 'CREATED' | 'LOCKED' | 'ACTIVE' | 'SETTLING' | 'SETTLED' | 'CANCELLED';
  totalDeposited: string;
  expectedYield: string;
  dealer: string;
  createdAt: string;
  lockTimestamp?: string;
  channelState?: ChannelState;
  positions?: Position[];
}

export interface Position {
  id: string;
  dealId: string;
  owner: string;
  depositAmount: string;
  tokenAddress: string;
  chainId: string;
  claimed: boolean;
  claimAmount?: string;
  createdAt: string;
}

export interface ChannelState {
  channelId: string;
  dealId: string;
  version: string;
  intent: string;
  allocation0: any;
  allocation1: any;
  participants: string[];
  stateData: string;
}

export interface PriceData {
  tokenSymbol: string;
  price: number;
  source: string;
  timestamp: string;
}

// API Functions
export const dealsApi = {
  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const { data } = await api.get('/api/deals', { params });
    return data;
  },
  
  get: async (id: string) => {
    const { data } = await api.get(`/api/deals/${id}`);
    return data;
  },
  
  create: async (dealParams: {
    depositToken: string;
    targetToken: string;
    targetChainId: string;
    minDeposit?: string;
    maxDeposit?: string;
    duration?: string;
    expectedYield?: string;
    dealer: string;
  }) => {
    const { data } = await api.post('/api/deals', dealParams);
    return data;
  },
  
  lock: async (id: string) => {
    const { data } = await api.post(`/api/deals/${id}/lock`);
    return data;
  },
  
  settle: async (id: string, settlementParams: {
    finalPrice: string;
    dealerFinal: string;
    lpFinal: string;
  }) => {
    const { data } = await api.post(`/api/deals/${id}/settle`, settlementParams);
    return data;
  },
  
  getPositions: async (id: string) => {
    const { data} = await api.get(`/api/deals/${id}/positions`);
    return data;
  },
};

export const positionsApi = {
  list: async (params?: { owner?: string; dealId?: string; limit?: number; offset?: number }) => {
    const { data } = await api.get('/api/positions', { params });
    return data;
  },
  
  get: async (id: string) => {
    const { data } = await api.get(`/api/positions/${id}`);
    return data;
  },
};

export const pricesApi = {
  getCurrent: async (symbol: string) => {
    const { data } = await api.get(`/api/prices/${symbol}`);
    return data;
  },
  
  getHistory: async (symbol: string, params?: { limit?: number; offset?: number }) => {
    const { data } = await api.get(`/api/prices/${symbol}/history`, { params });
    return data;
  },
};
