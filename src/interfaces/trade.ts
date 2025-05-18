export interface Trade {
  id: number;
  walletId: number;
  symbol: string;
  type: string; // "buy", "sell"
  direction: string; // "long", "short"
  entryPrice: number;
  exitPrice: number;
  amount: number;
  profit: number;
  profitPercent: number;
  status: string; // "open", "closed", "canceled"
  createdAt: string; // ou Date si parsé
  closedAt: string | null; // ou Date si parsé
  isSimulated: boolean;
}

export interface DisplayTrade extends Trade {
  displayStatus?: string;
  displayExitPrice?: number | null;
  displayProfit?: number | null;
  displayProfitPercent?: number | null;
}