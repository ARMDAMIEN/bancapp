import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CryptoMarketData } from '../../services/crypto-market-data-service.service';
import { interval, Subscription, switchMap } from 'rxjs';

import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexYAxis,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexTheme,
  ApexFill,
  ApexStroke,
  ApexMarkers,
  ApexGrid
} from 'ng-apexcharts';
import { CryptoChartService } from '../../services/crypto-chart.service';
import { BinanceChartService, CryptoCandle } from '../../services/binance-chart.service';
import { TradesService } from '../../services/trades.service';
import { error } from 'console';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  fill: ApexFill;
  stroke: ApexStroke;
  markers: ApexMarkers;
  grid: ApexGrid;
};

interface Trade {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
  profit: number;
  profitPercent: number;
}


@Component({
  selector: 'app-live-view',
  templateUrl: './live-view.component.html',
  styleUrl: './live-view.component.css'
})

export class LiveViewComponent implements OnInit, OnDestroy {

  balance : number = 0;

  constructor(private tradeService: TradesService) { }

  ngOnDestroy(): void {
  }

  ngOnInit(): void {
    this.tradeService.getBalance().subscribe({
      next: (response) => {
        this.balance = response;
      },
      error: (error) => {
        console.error("error on get balance : " + error);
      }
    })
  }

}
