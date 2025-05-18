import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { map, Observable } from 'rxjs';

export interface PortfolioData {
  totalBalance: number;
  balanceChange: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  winRatio: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  assets: AssetData[];
  performanceHistory: any;
}

export interface AssetData {
  name: string;
  symbol: string;
  value: number;
  allocation: number;
  change: number;
  color?: string;
}


@Injectable({
  providedIn: 'root'
})
export class PortfolioService {

  private apiUrl = environment.apiUrl;

  constructor(private http : HttpClient) { 
  }

   getPortfolioDashboard(): Observable<PortfolioData> {
    return this.http.get<any>(`${this.apiUrl}/portfolio/dashboard`)
      .pipe(
        map(dashboardDTO => {
          // Transformer les données du backend au format attendu par le frontend
          const wallet = dashboardDTO.wallet;
          
          // Calculer les allocations des actifs si nécessaire
          const totalAssetValue = wallet.assets.reduce((sum: number, asset: { amount: number; avgBuyPrice: number; }) => sum + (asset.amount * asset.avgBuyPrice), 0);
          
          const assets = wallet.assets.map((asset: { amount: number; avgBuyPrice: number; symbol: string; }, index: number) => {
            const value = asset.amount * asset.avgBuyPrice;
            const allocation = totalAssetValue > 0 ? (value / totalAssetValue) * 100 : 0;
            
            // Nous n'avons pas de données de changement de prix dans votre DTO, donc on utilise 0 par défaut
            const change = 0;
            
            return {
              name: asset.symbol, // Nous n'avons pas de name dans votre DTO, donc on utilise le symbol
              symbol: asset.symbol,
              value: value,
              allocation: allocation,
              change: change,
              color: this.generateAssetColor(asset.symbol, index)
            };
          });
          
          // Calculer le total PnL
          const totalPnl = wallet.totalProfit - wallet.totalLoss;
          
          return {
            totalBalance: wallet.currentAmount,
            balanceChange: dashboardDTO.balanceChange,
            dailyPnl: dashboardDTO.dailyPnl,
            dailyPnlPercent: dashboardDTO.dailyPnlPercent,
            totalPnl: totalPnl,
            totalPnlPercent: dashboardDTO.totalPnlPercent,
            winRatio: wallet.winRate,
            totalTrades: (wallet.winCount || 0) + (wallet.lossCount || 0),
            winCount: wallet.winCount || 0,
            lossCount: wallet.lossCount || 0,
            assets: assets,
            performanceHistory: dashboardDTO.performanceHistory
          };
        })
      );
  }

  private generateAssetColor(symbol: string, index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
      '#073B4C', '#F9C80E', '#F86624', '#EA3546', '#662E9B'
    ];
    
    if (index < colors.length) {
      return colors[index];
    }
    
    // Generate a color based on the symbol
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }
}
