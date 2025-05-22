import { Component, ViewChild, OnInit, OnDestroy, HostListener } from '@angular/core';
import { interval, Subscription, switchMap } from 'rxjs';
import { BinanceChartService, CryptoCandle } from '../../services/binance-chart.service';

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
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.css'
})

export class GraphComponent implements OnInit, OnDestroy {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  // État de l'écran
  isMobile: boolean = false;
  isTablet: boolean = false;
  screenWidth: number = window.innerWidth;

  // Configuration
  availableSymbols = ['BTCUSDC', 'ETHUSDC', 'SOLUSDC', 'BNBUSDC', 'ADAUSDC'];
  selectedSymbol = 'BTCUSDC';

  lastPrice = 0;
  priceChange = 0;

  isLoading = false;

  // Données
  realtimeData: CryptoCandle[] = [];
  delayedData: CryptoCandle[] = [];
  delayMs: number = 2000;
  trades: Trade[] = [];
  tradeId: number = 1;

  // Compteurs pour trades
  tradesPositifs: number = 0;
  tradesNegatifs: number = 0;
  seuilPositifMin: number = 0.75; // 75% minimum de trades positifs
  seuilPositifMax: number = 0.80; // 80% maximum de trades positifs

  // Abonnements
  private dataSubscription?: Subscription;
  private tradeSimulationSubscription?: Subscription;

  constructor(private cryptoService: BinanceChartService) {
    // Vérifier la taille d'écran initiale
    this.checkScreenSize();

    // Initialiser les options du graphique
    this.chartOptions = {
      series: [{
        name: "Prix",
        data: []
      }],
      chart: {
        type: "candlestick",
        height: 400,
        width: '100%',
        animations: {
          enabled: false
        },
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        background: '#1a1c25',
        redrawOnWindowResize: true
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          style: {
            colors: '#a3a3a3',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return val.toFixed(2);
          },
          style: {
            colors: '#a3a3a3',
            fontSize: '12px'
          }
        }
      },
      tooltip: {
        theme: "dark",
        x: {
          format: "dd MMM HH:mm:ss"
        }
      },
      theme: {
        mode: 'dark',
        palette: 'palette1'
      },
      fill: {
        opacity: 1
      },
      stroke: {
        width: 1
      },
      markers: {
        size: 0
      },
      grid: {
        borderColor: '#2b2d3e',
        xaxis: {
          lines: {
            show: true
          }
        }
      }
    };
  }

  // Écouteur pour détecter les changements de taille d'écran
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
    this.checkScreenSize();
    this.updateChartResponsiveOptions();
  }

  // Vérifier la taille d'écran actuelle
  checkScreenSize() {
    this.isMobile = this.screenWidth < 576;
    this.isTablet = this.screenWidth >= 576 && this.screenWidth < 992;
  }

  ngOnInit(): void {
    // Appliquer les options responsives initiales
    this.updateChartResponsiveOptions();

    // Définir un délai aléatoire entre 1 et 3 secondes
    this.delayMs = 1000 + Math.floor(Math.random() * 2000);

    // Charger les données initiales
    this.loadInitialData();

    // Démarrer la mise à jour en temps réel
    this.startRealtimeUpdates();

    // Démarrer la simulation de trades
    this.tradeSimulationSubscription = interval(2000).subscribe(() => {
      this.simulateTrade();
      this.ajusterSeuils();
    });
  }

  // Mettre à jour les options du graphique pour qu'il soit responsive
  updateChartResponsiveOptions() {
    let fontSize = '12px';
    let dateFormat = 'dd MMM HH:mm';
    let tickAmount = 10;
    let strokeWidth = 1;
    let heightAdjust = 400;
    let gridPadding = { left: 15, right: 15, top: 10, bottom: 10 };
    let showGridLines = true;

    // Ajuster les options en fonction de la taille d'écran
    if (this.isMobile) {
      fontSize = '9px';
      dateFormat = 'dd MMM';
      tickAmount = 6;
      strokeWidth = 0.8;
      heightAdjust = 250;
      gridPadding = { left: 5, right: 5, top: 5, bottom: 5 };
      showGridLines = false;
    } else if (this.isTablet) {
      fontSize = '10px';
      dateFormat = 'dd MMM';
      tickAmount = 8;
      strokeWidth = 1;
      heightAdjust = 300;
      gridPadding = { left: 10, right: 10, top: 8, bottom: 8 };
    }

    // Mise à jour des options du graphique
    if (this.chartOptions.xaxis) {
      this.chartOptions.xaxis = {
        ...this.chartOptions.xaxis,
        labels: {
          ...(this.chartOptions.xaxis.labels || {}),
          style: {
            colors: '#a3a3a3',
            fontSize: fontSize
          },
          format: dateFormat,
          // Pour les petits écrans, rotation des labels pour plus de lisibilité
          rotate: this.isMobile ? -45 : 0,
          rotateAlways: this.isMobile,
          // Réduire le nombre d'étiquettes sur mobile pour éviter la superposition
          maxHeight: this.isMobile ? 80 : undefined,
          offsetY: this.isMobile ? 10 : 0,
          // Espacement entre les étiquettes
          hideOverlappingLabels: true,
          showDuplicates: false
        },
        // Limiter le nombre d'étiquettes sur mobile
        tickAmount: tickAmount
      };
    }

    if (this.chartOptions.yaxis) {
      this.chartOptions.yaxis = {
        ...this.chartOptions.yaxis,
        labels: {
          ...(this.chartOptions.yaxis.labels || {}),
          formatter: (val) => {
            // Réduire les décimales sur mobile pour économiser de l'espace
            return this.isMobile ? val.toFixed(1) : val.toFixed(2);
          },
          style: {
            colors: '#a3a3a3',
            fontSize: fontSize
          }
        },
        // Limiter le nombre d'étiquettes Y sur mobile
        tickAmount: this.isMobile ? 5 : (this.isTablet ? 7 : 8)
      };
    }

    if (this.chartOptions.chart) {
      // Ajuster la hauteur pour les écrans plus petits
      this.chartOptions.chart.height = heightAdjust;
    }

    if (this.chartOptions.stroke) {
      this.chartOptions.stroke = {
        ...this.chartOptions.stroke,
        width: strokeWidth
      };
    }

    if (this.chartOptions.grid) {
      this.chartOptions.grid = {
        ...this.chartOptions.grid,
        padding: gridPadding,
        xaxis: {
          lines: {
            show: showGridLines
          }
        }
      };
    }

    // Si le graphique est déjà initialisé, forcer une mise à jour
    if (this.chart && this.chart.chart) {
      // Forcer un redessinage en mettant à jour les options
      (this.chart.chart as any).updateOptions(this.chartOptions, false, true);
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.cryptoService.getKlines(this.selectedSymbol)
      .subscribe({
        next: (data) => {
          this.realtimeData = data;

          // Appliquer le délai (retarder de quelques bougies)
          const delayedCount = Math.floor(this.delayMs / 60000); // Convertir ms en minutes
          const delayIndex = Math.max(0, data.length - delayedCount);
          this.delayedData = data.slice(0, delayIndex);

          this.updateChartData();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des données:', err);
          this.isLoading = false;
        }
      });
  }

  startRealtimeUpdates(): void {
    this.dataSubscription = interval(5000) // Mettre à jour toutes les 5 secondes
      .pipe(
        switchMap(() => this.cryptoService.getKlines(this.selectedSymbol))
      )
      .subscribe({
        next: (data) => {
          // Mettre à jour les données en temps réel
          this.realtimeData = data;

          // Simuler le délai
          setTimeout(() => {
            // Calculer l'indice correspondant au délai
            const currentTime = Date.now();
            const targetTime = currentTime - this.delayMs;

            // Trouver la bougie la plus proche du temps cible
            const closestIndex = this.findClosestCandleIndex(targetTime);

            if (closestIndex >= 0) {
              this.delayedData = this.realtimeData.slice(0, closestIndex + 1);
              this.updateChartData();
            }
          }, 0); // Pas besoin d'attendre car nous simulons déjà un délai
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour des données:', err);
        }
      });
  }

  findClosestCandleIndex(targetTime: number): number {
    if (this.realtimeData.length === 0) return -1;

    let closestIndex = 0;
    let minDiff = Math.abs(this.realtimeData[0].closeTime - targetTime);

    for (let i = 1; i < this.realtimeData.length; i++) {
      const diff = Math.abs(this.realtimeData[i].closeTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }

      // Si nous avons dépassé la cible, prendre l'élément précédent
      if (this.realtimeData[i].closeTime > targetTime && i > 0) {
        return i - 1;
      }
    }

    return closestIndex;
  }

  updateChartData(): void {
    if (this.delayedData.length === 0) return;

    // Déterminer combien de points à afficher selon la taille d'écran
    let dataPoints = this.delayedData;

    // Réduire le nombre de points de données sur mobile pour améliorer les performances
    if (this.isMobile && dataPoints.length > 30) {
      // Sur mobile, afficher moins de points de données pour de meilleures performances
      dataPoints = dataPoints.slice(dataPoints.length - 30);
    } else if (this.isTablet && dataPoints.length > 50) {
      // Sur tablette, réduire légèrement aussi
      dataPoints = dataPoints.slice(dataPoints.length - 50);
    }

    // Formater les données pour ApexCharts
    const formattedData = dataPoints.map(candle => ({
      x: new Date(candle.openTime),
      y: [candle.open, candle.high, candle.low, candle.close]
    }));

    // Mettre à jour le graphique
    this.chartOptions.series = [{
      name: this.selectedSymbol,
      data: formattedData
    }];

    // Mettre à jour le dernier prix et le changement de prix
    const lastPrice = dataPoints[dataPoints.length - 1].close;
    this.lastPrice = lastPrice;

    // Calculer le changement de prix (pourcentage)
    if (dataPoints.length > 1) {
      const previousPrice = dataPoints[dataPoints.length - 2].close;
      this.priceChange = ((lastPrice - previousPrice) / previousPrice) * 100;
    }

    // Mettre à jour le titre
    this.chartOptions.title = {
      text: this.isMobile ?
        `${this.selectedSymbol.slice(0, -4)}` : // Sur mobile, afficher juste le symbole sans USDC
        `${this.selectedSymbol}: ${lastPrice.toFixed(2)} USD`,
      align: 'left',
      style: {
        color: '#f1f1f1',
        fontSize: this.isMobile ? '14px' : '16px'
      }
    };
  }

  changeSymbol(symbol: string): void {
    this.selectedSymbol = symbol;
    this.isLoading = true;
    this.loadInitialData();
  }

  simulateTrade(): void {
    // Sélectionner une crypto aléatoire
    const randomIndex = Math.floor(Math.random() * this.availableSymbols.length);
    const symbol = this.availableSymbols[randomIndex];

    if (this.delayedData.length === 0 || this.realtimeData.length === 0) return;

    // Obtenir le dernier prix "affiché" (retardé)
    const lastDelayedIndex = this.delayedData.length - 1;
    const displayedPrice = this.delayedData[lastDelayedIndex].close;

    // Obtenir le prix "en temps réel" (que nous connaissons déjà)
    const lastRealIndex = this.realtimeData.length - 1;
    const realTimePrice = this.realtimeData[lastRealIndex].close;

    // Simuler un mouvement de prix futur (nous utilisons le prix réel comme "futur" par rapport au prix retardé)
    const priceChange = (realTimePrice - displayedPrice) / displayedPrice;
    const isPositive = priceChange > 0;

    // Décider si nous devons afficher ce trade
    if (this.shouldDisplayTrade(isPositive)) {
      // Générer un montant aléatoire
      const amount = 0.01 + Math.random() * 0.5; // Entre 0.01 et 0.51 unités

      // Créer le trade
      const trade: Trade = {
        id: this.tradeId++,
        symbol: symbol,
        type: isPositive ? 'buy' : 'sell',
        price: displayedPrice,
        amount: amount,
        timestamp: Date.now(),
        profit: amount * displayedPrice * priceChange,
        profitPercent: priceChange * 100
      };

      // Ajouter le trade au début de la liste
      this.trades.unshift(trade);

      // Limiter le nombre de trades visibles selon la taille d'écran
      const maxVisibleTrades = this.isMobile ? 5 : (this.isTablet ? 8 : 10);
      if (this.trades.length > maxVisibleTrades) {
        this.trades = this.trades.slice(0, maxVisibleTrades);
      }

      // Mettre à jour les compteurs
      if (isPositive) {
        this.tradesPositifs++;
      } else {
        this.tradesNegatifs++;
      }
    }
  }

  shouldDisplayTrade(isPositive: boolean): boolean {
    const ratioActuel = this.calculerRatioPositif();

    if (isPositive) {
      // Pour les trades positifs
      if (ratioActuel < this.seuilPositifMax) {
        return true; // Afficher ce trade positif
      } else {
        // Trop de trades positifs récemment, on n'affiche pas celui-ci
        return false;
      }
    } else {
      // Pour les trades négatifs
      if (ratioActuel > this.seuilPositifMin) {
        return true; // Afficher ce trade négatif pour maintenir la crédibilité
      } else {
        // Déjà assez de trades négatifs récemment, on n'affiche pas celui-ci
        return false;
      }
    }
  }

  calculerRatioPositif(): number {
    const total = this.tradesPositifs + this.tradesNegatifs;
    if (total === 0) return 1.0; // Par défaut au début
    return this.tradesPositifs / total;
  }

  ajusterSeuils(): void {
    // Variation légère des seuils pour éviter des patterns
    this.seuilPositifMin = 0.72 + (Math.random() * 0.06); // 72-78%
    this.seuilPositifMax = 0.78 + (Math.random() * 0.06); // 78-84%
  }

  toggleFullscreen(): void {
    // Accéder à l'instance ApexCharts native
    if (this.chart && this.chart.chart) {
      // Accéder directement à l'objet ApexCharts natif
      const apexChart = (this.chart.chart as any);

      // Utiliser l'API DOM pour basculer en plein écran si disponible
      const chartElement = document.querySelector('.chart-container') as HTMLElement;

      if (chartElement) {
        if (!document.fullscreenElement) {
          // Entrer en mode plein écran
          if (chartElement.requestFullscreen) {
            chartElement.requestFullscreen();
          } else if ((chartElement as any).mozRequestFullScreen) {
            (chartElement as any).mozRequestFullScreen();
          } else if ((chartElement as any).webkitRequestFullscreen) {
            (chartElement as any).webkitRequestFullscreen();
          } else if ((chartElement as any).msRequestFullscreen) {
            (chartElement as any).msRequestFullscreen();
          }
        } else {
          // Sortir du mode plein écran
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
          }
        }
      }
    }
  }

  resetZoom(): void {
    // Utiliser l'API alternative pour réinitialiser l'affichage
    if (this.chart && this.chart.chart) {
      // Forcer une mise à jour complète des données
      this.updateChartData();

      // Redessiner le graphique
      setTimeout(() => {
        if (this.chart && this.chart.chart) {
          (this.chart.chart as any).updateOptions({
            xaxis: {
              ...this.chartOptions.xaxis,
              min: undefined,
              max: undefined
            }
          }, false, true);
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    if (this.tradeSimulationSubscription) {
      this.tradeSimulationSubscription.unsubscribe();
    }
  }

  // Ajoutez ces méthodes à votre GraphComponent existant

  // Propriété pour le timeframe actuel
  currentTimeframe: string = '5m';

  // Méthode pour changer le timeframe
  changeTimeframe(timeframe: string): void {
    console.log(`Changement de timeframe: ${this.currentTimeframe} -> ${timeframe}`);

    if (this.currentTimeframe !== timeframe) {
      this.currentTimeframe = timeframe;

      // Arrêter les mises à jour actuelles
      if (this.dataSubscription) {
        this.dataSubscription.unsubscribe();
      }

      // Définir la limite de données selon le timeframe
      const limit = this.getTimeframeLimits(timeframe);

      // Recharger les données avec le nouveau timeframe
      this.loadDataForTimeframe(timeframe, limit);

      // Redémarrer les mises à jour en temps réel avec le nouveau timeframe
      this.startRealtimeUpdatesForTimeframe(timeframe, limit);
    }
  }

  // Obtenir les limites selon le timeframe
  private getTimeframeLimits(timeframe: string): number {
    const limits: { [key: string]: number } = {
      '1m': 60,
      '5m': 60,
      '15m': 60,
      '1h': 48,
      '4h': 48,
      '1d': 30
    };

    return limits[timeframe] || 60;
  }

  // Charger les données pour un timeframe spécifique
  private loadDataForTimeframe(timeframe: string, limit: number): void {
    this.isLoading = true;

    this.cryptoService.getKlines(this.selectedSymbol, timeframe, limit)
      .subscribe({
        next: (data) => {
          this.realtimeData = data;

          // Appliquer le délai (retarder de quelques bougies)
          const delayedCount = Math.floor(this.delayMs / this.getTimeframeMs(timeframe));
          const delayIndex = Math.max(0, data.length - delayedCount);
          this.delayedData = data.slice(0, delayIndex);

          this.updateChartData();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des données pour le timeframe:', err);
          this.isLoading = false;
        }
      });
  }

  // Démarrer les mises à jour en temps réel pour un timeframe spécifique
  private startRealtimeUpdatesForTimeframe(timeframe: string, limit: number): void {
    // Ajuster l'intervalle de mise à jour selon le timeframe
    const updateInterval = this.getUpdateInterval(timeframe);

    this.dataSubscription = interval(updateInterval)
      .pipe(
        switchMap(() => this.cryptoService.getKlines(this.selectedSymbol, timeframe, limit))
      )
      .subscribe({
        next: (data) => {
          // Mettre à jour les données en temps réel
          this.realtimeData = data;

          // Simuler le délai
          setTimeout(() => {
            const currentTime = Date.now();
            const targetTime = currentTime - this.delayMs;

            // Trouver la bougie la plus proche du temps cible
            const closestIndex = this.findClosestCandleIndex(targetTime);

            if (closestIndex >= 0) {
              this.delayedData = this.realtimeData.slice(0, closestIndex + 1);
              this.updateChartData();
            }
          }, 0);
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour des données:', err);
        }
      });
  }

  // Obtenir l'intervalle de mise à jour selon le timeframe
  private getUpdateInterval(timeframe: string): number {
    const intervals: { [key: string]: number } = {
      '1m': 5000,   // 5 secondes pour 1m
      '5m': 15000,  // 15 secondes pour 5m
      '15m': 30000, // 30 secondes pour 15m
      '1h': 60000,  // 1 minute pour 1h
      '4h': 240000, // 4 minutes pour 4h
      '1d': 600000  // 10 minutes pour 1d
    };

    return intervals[timeframe] || 5000;
  }

  // Convertir le timeframe en millisecondes
  private getTimeframeMs(timeframe: string): number {
    const timeframes: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    return timeframes[timeframe] || 60 * 1000;
  }

}