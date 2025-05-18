import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TradesService } from '../../services/trades.service';
import { DisplayTrade, Trade } from '../../interfaces/trade';
import { interval, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-live-trades',
  templateUrl: './live-trades.component.html',
  styleUrls: ['./live-trades.component.css'],
  providers: [DatePipe]
})
export class LiveTradesComponent implements OnInit, OnChanges, OnDestroy {

  // Filtres
  selectedPair: string = 'all';
  selectedType: string = 'all';
  selectedDirection: string = 'all';
  availablePairs: string[] = [];

  // Pagination
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;

  // Données filtrées et paginées
  // Pour stocker les trades modifiés pour l'affichage
  displayTrades: DisplayTrade[] = [];

  // Mise à jour pour utiliser DisplayTrade
  filteredTrades: DisplayTrade[] = [];

  //settings
  displayDelay: number = 30000;

  // Statistiques
  profitableCount: number = 0;
  unprofitableCount: number = 0;

  trades: Trade[] = [];

  private pollingSubscription!: Subscription;
  private displayUpdateSubscription!: Subscription;

  constructor(private tradeService: TradesService, private changeDetectorRef: ChangeDetectorRef, private datePipe: DatePipe) { }


  ngOnInit(): void {
    // Appel toutes les 5 secondes
    this.pollingSubscription = interval(30000).subscribe(() => {
      console.log("load data in interval")
      this.loadData();
    });

    // Ajouter un intervalle plus court pour mettre à jour l'affichage des trades
    this.displayUpdateSubscription = interval(30000).subscribe(() => {
      this.updateTradeDisplayStatus();
    });

    // Appel immédiat une première fois
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trades']) {
      this.updateTradeDisplayStatus();
      this.applyFiltersAndPagination();
      this.calculateStats();
    }
  }

  loadData(): void {
    this.tradeService.getLiveTrades().subscribe({
      next: (trades) => {
        this.trades = trades;
        this.updateTradeDisplayStatus();
        this.applyFiltersAndPagination();
        this.calculateStats();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des trades :', error);
        this.trades = [];
      }
    });
  }

  updateTradeDisplayStatus(): void {
  const now = new Date();
  console.log("Date actuelle:", now.toLocaleString());

  // Créer une copie des trades avec les statuts d'affichage modifiés
  this.displayTrades = this.trades.map(trade => {
    // Créer une copie et la convertir en DisplayTrade
    const displayTrade: DisplayTrade = { ...trade };

    // Si le trade est fermé (status === 'closed'), vérifier s'il faut l'afficher comme actif
    if (trade.status === 'closed') {
      // Utiliser la fonction existante pour obtenir une date formatée pour le log
      const formattedClosedDate = this.getDisplayDate(trade.closedAt);

      // Convertir proprement la date de fermeture
      let closedAtDate: Date | null = null;
      
      try {
        // Convertir la date en utilisant la logique similaire à getDisplayDate
        if (Array.isArray(trade.closedAt)) {
          closedAtDate = new Date(
            trade.closedAt[0],
            trade.closedAt[1] - 1, // Ajuster le mois (0-11 en JavaScript)
            trade.closedAt[2],
            trade.closedAt[3] || 0,
            trade.closedAt[4] || 0,
            trade.closedAt[5] || 0
          );
        } else if (typeof trade.closedAt === 'string' && trade.closedAt.includes(',')) {
          const parts = trade.closedAt.split(',').map(Number);
          closedAtDate = new Date(
            parts[0],
            parts[1] - 1, // Ajuster le mois
            parts[2],
            parts[3] || 0,
            parts[4] || 0,
            parts[5] || 0
          );
        } else if (typeof trade.closedAt === 'string') {
          closedAtDate = new Date(trade.closedAt);
        } else {
          // Pour d'autres types, probablement pas valides
          console.warn(`Format de date non reconnu pour trade ${trade.id}:`, trade.closedAt);
          closedAtDate = null;
        }

        // Vérifier si la date est valide
        if (closedAtDate && isNaN(closedAtDate.getTime())) {
          console.error(`Date invalide pour trade ${trade.id}:`, trade.closedAt);
          closedAtDate = null;
        }
      } catch (error) {
        console.error(`Erreur lors de la conversion de la date pour trade ${trade.id}:`, error);
        closedAtDate = null;
      }

      // Procéder uniquement si nous avons une date valide
      if (closedAtDate) {

        // Ajouter le délai d'affichage pour déterminer quand montrer comme fermé
        const displayTime = new Date(closedAtDate.getTime());
        
        // Comparer avec maintenant
        const nowTime = now.getTime();
    
        // Si le temps d'affichage n'est pas encore atteint, montrer comme actif
        if (displayTime.getTime() > nowTime) {
          displayTrade.displayStatus = 'open';
          displayTrade.displayExitPrice = null;
          displayTrade.displayProfit = null;
          displayTrade.displayProfitPercent = null;
          displayTrade.closedAt = null;
        } else {
          displayTrade.displayStatus = 'closed';
          displayTrade.displayExitPrice = trade.exitPrice;
          displayTrade.displayProfit = trade.profit;
          displayTrade.displayProfitPercent = trade.profitPercent;
        }
      } else {
        // Si la date n'est pas valide, utiliser le statut original par défaut
        displayTrade.displayStatus = trade.status;
        
        // Si le statut est fermé mais sans date valide, afficher quand même les valeurs
        if (trade.status === 'closed') {
          displayTrade.displayExitPrice = trade.exitPrice;
          displayTrade.displayProfit = trade.profit;
          displayTrade.displayProfitPercent = trade.profitPercent;
        }
      }
    } else {
      // Si le trade n'est pas fermé, conserver son statut
      displayTrade.displayStatus = trade.status;
    }
    return displayTrade;
  });

  // Appliquer les filtres et la pagination sur les trades modifiés
  this.applyFiltersAndPagination();
  this.changeDetectorRef.detectChanges();
}

  applyFiltersAndPagination(): void {
    // Filtrage
    let result = [...this.displayTrades]; // Utiliser displayTrades au lieu de trades

    if (this.selectedType !== 'all') {
      result = result.filter(trade => trade.type === this.selectedType);
    }

    if (this.selectedDirection !== 'all') {
      result = result.filter(trade => trade.direction.toLowerCase() === this.selectedDirection);
    }

    // Calcul du nombre total de pages
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));

    // Ajustement de la page courante si nécessaire
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredTrades = result.slice(startIndex, startIndex + this.pageSize);
  }

  // Mettre à jour la méthode getPnlClass pour utiliser le statut d'affichage
  getPnlClass(trade: DisplayTrade): string {
    // Utiliser displayStatus au lieu de status s'il est disponible
    const status = trade.displayStatus || trade.status;
    if (status === 'open') return 'pending'; // 'open' au lieu de 'active'

    // Utiliser displayProfit au lieu de profit s'il est disponible
    const profit = trade.displayProfit !== undefined && trade.displayProfit !== null ? trade.displayProfit : trade.profit;
    return profit && profit > 0 ? 'positive' : 'negative';
  }

  calculateStats(): void {
    // Calculer les statistiques basées sur les données réelles, pas sur l'affichage
    const completedTrades = this.trades.filter(trade => trade.status === 'closed');
    this.profitableCount = completedTrades.filter(trade => trade.profit > 0).length;
    this.unprofitableCount = completedTrades.filter(trade => trade.profit <= 0).length;
  }



  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFiltersAndPagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFiltersAndPagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  getDisplayDate(dateValue: any): string {
    if (!dateValue) return '-';

    try {
      let date: Date;

      if (Array.isArray(dateValue)) {
        date = new Date(
          dateValue[0],
          dateValue[1],
          dateValue[2],
          dateValue[3] || 0,
          dateValue[4] || 0,
          dateValue[5] || 0
        );
      } else if (typeof dateValue === 'string' && dateValue.includes(',')) {
        const parts = dateValue.split(',').map(Number);
        date = new Date(
          parts[0],
          parts[1],
          parts[2],
          parts[3] || 0,
          parts[4] || 0,
          parts[5] || 0
        );
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        return this.datePipe.transform(dateValue, 'dd/MM/yy HH:mm:ss') || '-';
      } else {
        return '-';
      }

      return this.datePipe.transform(date, 'dd/MM/yy HH:mm:ss') || '-';
    } catch (e) {
      console.error('Error formatting date:', e);
      return '-';
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    if (this.displayUpdateSubscription) {
      this.displayUpdateSubscription.unsubscribe();
    }
  }
}