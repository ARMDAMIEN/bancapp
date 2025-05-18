import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import Chart, { registerables } from 'chart.js/auto';
import { AssetData, PortfolioData, PortfolioService } from '../../services/portfolio.service';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { WithdrawService } from '../../services/withdrawal.service';
import { error } from 'console';
import { WithdrawDTO } from '../../interfaces/withdraw-dto';

@Component({
  selector: 'app-portfolio-dashboard',
  templateUrl: './portfolio-dashboard.component.html',
  styleUrls: ['./portfolio-dashboard.component.css']
})
export class PortfolioDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('performanceChart') performanceChartRef!: ElementRef;

  @Input() isModal: boolean = false;
  @Output() close = new EventEmitter<void>();

  //modal 
  showWithdrawModal: boolean = false;
  withdrawForm: FormGroup;
  detectedWalletType: string | null = null;


  periods: string[] = ['24h', '7d', '30d', '90d', 'YTD', 'All'];
  selectedPeriod: string = '30d';

  private chart: Chart | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  portfolioData: PortfolioData = {
    totalBalance: 0,
    balanceChange: 0,
    dailyPnl: 0,
    dailyPnlPercent: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    winRatio: 0,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    assets: [],
    performanceHistory: {}
  };

  constructor(private portfolioService: PortfolioService, private fb: FormBuilder, private withdrawService: WithdrawService) {
    {
      // Initialiser le formulaire
      this.withdrawForm = this.fb.group({
        destination: ['', [Validators.required, this.walletAddressValidator()]],
        amount: ['', [Validators.required, Validators.min(0.01)]],
        notes: ['']
      });

      this.withdrawForm.get('destination')?.valueChanges.subscribe(address => {
        this.detectWalletType(address);
      });
    }
  }

  ngOnInit(): void {
    this.loadPortfolioData();


  }

  ngAfterViewInit(): void {
    // On attend que les données soient chargées avant d'initialiser le graphique
    setTimeout(() => {
      if (this.portfolioData.performanceHistory[this.selectedPeriod]) {
        this.initChart();
      }
    }, 100);
  }

  loadPortfolioData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.portfolioService.getPortfolioDashboard().subscribe({
      next: (data) => {
        this.portfolioData = data;
        this.portfolioData.winRatio = this.portfolioData.winRatio * 100;
        this.withdrawForm.get('amount')?.setValidators([
          Validators.required,
          Validators.min(0.01),
          Validators.max(this.portfolioData.totalBalance)
        ]);

        // Convertir le format d'historique si nécessaire
        if (this.portfolioData.performanceHistory) {
          // Convertir l'historique au format attendu par le graphique
          this.convertPerformanceHistory();
        }

        // Si le graphique existe déjà, on le met à jour
        if (this.chart) {
          this.updateChart();
        } else if (this.performanceChartRef) {
          // Sinon, on l'initialise
          this.initChart();
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading portfolio data:', error);
        this.errorMessage = 'Failed to load portfolio data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // Cette méthode convertit l'historique de performance du format du backend
  // au format attendu par le graphique
  private convertPerformanceHistory(): void {
    const backendHistory = this.portfolioData.performanceHistory;
    const convertedHistory: any = {};

    // Préparer les périodes
    for (const period of this.periods) {
      convertedHistory[period] = { dates: [], values: [] };
    }

    // Période de 24 heures
    const lastDay = new Date();
    lastDay.setDate(lastDay.getDate() - 1);

    // Période de 7 jours
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Période de 30 jours
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    // Période de 90 jours
    const last3Months = new Date();
    last3Months.setDate(last3Months.getDate() - 90);

    // Début de l'année
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    // Trier les dates
    const dates = Object.keys(backendHistory).sort();

    // Pour chaque date dans l'historique
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const point = backendHistory[dateStr];

      // Ajouter aux périodes appropriées
      if (date >= lastDay) {
        convertedHistory['24h'].dates.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        convertedHistory['24h'].values.push(point.balance);
      }

      if (date >= lastWeek) {
        convertedHistory['7d'].dates.push(date.toLocaleDateString([], { weekday: 'short' }));
        convertedHistory['7d'].values.push(point.balance);
      }

      if (date >= lastMonth) {
        convertedHistory['30d'].dates.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
        convertedHistory['30d'].values.push(point.balance);
      }

      if (date >= last3Months) {
        convertedHistory['90d'].dates.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
        convertedHistory['90d'].values.push(point.balance);
      }

      if (date >= startOfYear) {
        convertedHistory['YTD'].dates.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
        convertedHistory['YTD'].values.push(point.balance);
      }

      // All inclut toutes les dates
      convertedHistory['All'].dates.push(date.toLocaleDateString([], { month: 'short', year: '2-digit' }));
      convertedHistory['All'].values.push(point.balance);
    }

    // Si une période est vide, ajouter des données fictives
    for (const period of this.periods) {
      if (convertedHistory[period].dates.length === 0) {
        // Données fictives pour éviter un graphique vide
        convertedHistory[period] = this.generateDummyDataForPeriod(period);
      }
    }

    this.portfolioData.performanceHistory = convertedHistory;
  }

  // Génère des données fictives pour une période si aucune donnée n'est disponible
  private generateDummyDataForPeriod(period: string): { dates: string[], values: number[] } {
    const now = new Date();
    let dates: string[] = [];
    let values: number[] = [];

    switch (period) {
      case '24h':
        // Générer 24 heures
        for (let i = 0; i < 24; i++) {
          const date = new Date(now);
          date.setHours(date.getHours() - 23 + i);
          dates.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '7d':
        // Générer 7 jours
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - 6 + i);
          dates.push(date.toLocaleDateString([], { weekday: 'short' }));
        }
        break;
      case '30d':
        // Générer 30 jours
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - 29 + i);
          dates.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
        }
        break;
      case '90d':
        // Générer 90 jours (simplifié pour ne pas avoir trop de points)
        for (let i = 0; i < 12; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - 90 + i * 7);
          dates.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
        }
        break;
      case 'YTD':
        // Générer les mois depuis le début de l'année
        const currentMonth = now.getMonth();
        for (let i = 0; i <= currentMonth; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          dates.push(date.toLocaleDateString([], { month: 'short' }));
        }
        break;
      case 'All':
        // Générer les 12 derniers mois
        for (let i = 0; i < 12; i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - 11 + i);
          dates.push(date.toLocaleDateString([], { month: 'short', year: '2-digit' }));
        }
        break;
    }

    // Valeur de base arbitraire pour l'exemple
    const baseValue = this.portfolioData.totalBalance > 0 ? this.portfolioData.totalBalance : 10000;

    // Générer des valeurs qui fluctuent légèrement autour de la valeur de base
    values = dates.map((_, i) => {
      // Petite variation aléatoire
      const variation = (Math.random() - 0.3) * baseValue * 0.05; // Tendance légèrement haussière
      return baseValue + variation * i;
    });

    return { dates, values };
  }

  initChart(): void {
    if (!this.performanceChartRef) {
      return;
    }

    const ctx = this.performanceChartRef.nativeElement.getContext('2d');

    if (!ctx) {
      return;
    }

    const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, 'rgba(14, 246, 204, 0.3)');
    gradientFill.addColorStop(1, 'rgba(14, 246, 204, 0)');

    const data = this.portfolioData.performanceHistory[this.selectedPeriod];

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.dates,
        datasets: [{
          label: 'Portfolio Value',
          data: data.values,
          borderColor: 'rgba(14, 246, 204, 1)',
          backgroundColor: gradientFill,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgba(14, 246, 204, 1)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(45, 48, 71, 0.9)',
            titleColor: '#F2F2F2',
            bodyColor: '#F2F2F2',
            borderColor: 'rgba(14, 246, 204, 0.3)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: 'rgba(242, 242, 242, 0.6)',
              font: {
                size: 10
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(242, 242, 242, 0.6)',
              font: {
                size: 10
              },
              callback: (value) => {
                // Assurons-nous que value est traité comme un nombre
                const numValue = Number(value);
                if (isNaN(numValue)) return value;
                return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        elements: {
          point: {
            radius: 0
          }
        }
      }
    });
  }

  updateChart(): void {
    if (!this.chart) return;

    const data = this.portfolioData.performanceHistory[this.selectedPeriod];

    this.chart.data.labels = data.dates;
    this.chart.data.datasets[0].data = data.values;
    this.chart.update();
  }

  changePeriod(period: string): void {
    this.selectedPeriod = period;

    if (this.chart) {
      const data = this.portfolioData.performanceHistory[this.selectedPeriod];

      this.chart.data.labels = data.dates;
      this.chart.data.datasets[0].data = data.values;
      this.chart.update();
    }
  }

  withdrawFunds() {
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(event: Event) {
    this.showWithdrawModal = false;
    this.withdrawForm.reset();
    event.preventDefault();
  }

  setMaxAmount() {
    this.withdrawForm.get('amount')?.setValue(this.portfolioData.totalBalance);
  }

  confirmWithdrawal() {
    const now = new Date();
    if (this.withdrawForm.valid) {
     const withdrawDTO : WithdrawDTO = {
       id: 0, 
       destinationAddress: this.withdrawForm.get('destination')?.value,
       username: '',
       amount: this.withdrawForm.get('amount')?.value ,
       completed: false,
       createdAt: now.toISOString(),
       completedAt: ''
     }
      this.withdrawService.saveWithdraw(withdrawDTO).subscribe({
        next: (data) => {
          console.log('withdraw response :' + JSON.stringify(data));
          // Mettre à jour le solde du portfolio
          this.portfolioData.totalBalance -= this.withdrawForm.get('amount')?.value;

          // Fermer la modale
          this.showWithdrawModal = false;
          this.withdrawForm.reset();

        },
        error: (error) => {
          console.error('error on confirm withdraw : ' + JSON.stringify(error));
        }
      })
      // Simuler une API call réussie
      setTimeout(() => {


        // Ici vous pourriez afficher un message de succès
      }, 1000);
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  walletAddressValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null; // Laissez le required validator s'occuper de ce cas
      }

      // Vérifier les formats d'adresses pour différentes cryptomonnaies

      // Bitcoin (commence par 1, 3, ou bc1 et a une longueur spécifique)
      const bitcoinRegex = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{11,71})$/;

      // Ethereum (commence par 0x suivi de 40 caractères hexadécimaux)
      const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;

      // Binance Smart Chain (même format qu'Ethereum)
      const bscRegex = /^0x[a-fA-F0-9]{40}$/;

      // Solana (chaîne de base58 de longueur 32-44)
      const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

      // Vérifier si l'une des regex correspond
      if (bitcoinRegex.test(value) ||
        ethereumRegex.test(value) ||
        bscRegex.test(value) ||
        solanaRegex.test(value)) {
        return null; // Valide
      }

      return { invalidWallet: true }; // Invalide
    };
  }

  /**
   * Détecte le type de wallet à partir de l'adresse
   */
  detectWalletType(address: string): void {
    if (!address) {
      this.detectedWalletType = null;
      return;
    }

    // Bitcoin
    if (/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{11,71})$/.test(address)) {
      this.detectedWalletType = 'Bitcoin';
      return;
    }

    // Ethereum
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      this.detectedWalletType = 'Ethereum';
      return;
    }

    // Solana
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      this.detectedWalletType = 'Solana';
      return;
    }

    // Si l'adresse est en cours de saisie mais ne correspond pas encore à un format connu
    if (address.length > 5) {
      this.detectedWalletType = 'Generic';
    } else {
      this.detectedWalletType = null;
    }
  }
}