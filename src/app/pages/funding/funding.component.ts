import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentService } from '../../../services/document-service.service';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

@Component({
  selector: 'app-funding',
  templateUrl: './funding.component.html',
  styleUrl: './funding.component.css'
})
export class FundingComponent implements OnInit {
  // ViewChild pour accéder aux inputs de fichiers
  @ViewChild('fileInput') fileInput!: ElementRef;

  // Propriétés pour les fichiers RIB
  private files = new Map<number, File>();
  private fileErrors = new Map<number, string>();

  // Propriétés pour les revenus
  private revenues = new Map<number, number>();

  // Propriétés calculées
  totalRevenue: number = 0;
  averageRevenue: number = 0;

  // UI State
  errorMessage: string = '';
  isSubmitting: boolean = false;
  isDragOver: boolean = false;
  
  // Upload state
  documentsUploaded: boolean = false;
  documentIds: string[] = [];

  // Formats de fichiers acceptés
  readonly ACCEPTED_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png'];
  readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Clé pour le cache de la moyenne des revenus
  private readonly AVERAGE_REVENUE_CACHE_KEY = 'user_average_monthly_revenue';

  constructor(
    private router: Router,
    private documentService: DocumentService,
    private stepService: StepService
  ) {
    // Initialiser les revenus à 0
    this.revenues.set(1, 0);
    this.revenues.set(2, 0);
    this.revenues.set(3, 0);
  }

  ngOnInit(): void {
    this.calculateTotals();
    this.loadExistingFiles();
    this.loadCachedRevenues();
  }

  // Charger les revenus depuis le cache s'ils existent
  private loadCachedRevenues(): void {
    const cachedRevenues = localStorage.getItem('cached_revenues');
    if (cachedRevenues) {
      try {
        const revenueData = JSON.parse(cachedRevenues);
        this.revenues.set(1, revenueData.month1 || 0);
        this.revenues.set(2, revenueData.month2 || 0);
        this.revenues.set(3, revenueData.month3 || 0);
        this.calculateTotals();
      } catch (error) {
        console.warn('Error loading cached revenues:', error);
      }
    }
  }

  // Sauvegarder les revenus dans le cache
  private saveCachedRevenues(): void {
    const revenueData = {
      month1: this.getRevenue(1),
      month2: this.getRevenue(2),
      month3: this.getRevenue(3),
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('cached_revenues', JSON.stringify(revenueData));
  }

  // Sauvegarder la moyenne des revenus mensuels dans le cache
  private saveAverageRevenueToCache(): void {
    const averageRevenueData = {
      averageMonthlyRevenue: this.averageRevenue,
      totalRevenue: this.totalRevenue,
      calculatedAt: new Date().toISOString(),
      basedOnMonths: 3,
      revenueBreakdown: {
        month1: this.getRevenue(1),
        month2: this.getRevenue(2),
        month3: this.getRevenue(3)
      }
    };
    localStorage.setItem(this.AVERAGE_REVENUE_CACHE_KEY, JSON.stringify(averageRevenueData));
    console.log('Average revenue cached:', averageRevenueData);
  }

  // Récupérer la moyenne des revenus depuis le cache
  public getCachedAverageRevenue(): number | null {
    const cachedData = localStorage.getItem(this.AVERAGE_REVENUE_CACHE_KEY);
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        return data.averageMonthlyRevenue || null;
      } catch (error) {
        console.warn('Error reading cached average revenue:', error);
        return null;
      }
    }
    return null;
  }

  // Charger les fichiers existants depuis le localStorage
  private loadExistingFiles(): void {
    for (let month = 1; month <= 3; month++) {
      const storedFile = localStorage.getItem(`rib${month}_file`);
      if (storedFile) {
        try {
          const fileData = JSON.parse(storedFile);
          // Créer un fichier fantôme pour l'affichage
          const ghostFile = new File([''], fileData.name, { type: fileData.type });
          Object.defineProperty(ghostFile, 'size', { value: fileData.size });
          this.files.set(month, ghostFile);
        } catch (error) {
          console.warn(`Error loading stored file for month ${month}:`, error);
        }
      }
    }
  }

  // Méthodes pour accéder aux fichiers
  getFile(month: number): File | null {
    return this.files.get(month) || null;
  }

  getFileInput(month: number): HTMLInputElement {
    const inputs = document.querySelectorAll('input[type="file"]');
    return inputs[month - 1] as HTMLInputElement;
  }

  getFileError(month: number): string | null {
    return this.fileErrors.get(month) || null;
  }

  getFileSize(file: File | null): string {
    if (!file) return '';
    return this.formatFileSize(file.size);
  }

  // Méthodes pour accéder aux revenus
  getRevenue(month: number): number {
    return this.revenues.get(month) || 0;
  }

  setRevenue(month: number, value: number): void {
    this.revenues.set(month, value || 0);
    this.calculateTotals();
    this.saveCachedRevenues(); // Sauvegarder les revenus à chaque modification
  }

  // Gestion des labels de mois
  getMonthLabel(month: number): string {
    const now = new Date();
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (month - 1), 1);
    return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Gestion du drag and drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDropped(event: DragEvent, month: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0], month);
    }
  }

  // Gestion de la sélection de fichier via input
  onFileSelected(event: Event, month: number): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      this.handleFileSelection(files[0], month);
    }
  }

  // Traitement commun de la sélection de fichier
  private handleFileSelection(file: File, month: number): void {
    // Nettoyer l'erreur précédente
    this.fileErrors.delete(month);

    // Validation du type de fichier
    if (!this.isValidFileType(file)) {
      this.fileErrors.set(month, `Invalid file type. Please upload ${this.ACCEPTED_FILE_TYPES.join(', ')} files only.`);
      return;
    }

    // Validation de la taille du fichier
    if (!this.isValidFileSize(file)) {
      this.fileErrors.set(month, `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    // Assigner le fichier et le stocker en base64
    this.files.set(month, file);
    this.storeFileAsBase64(file, month);
    this.clearGlobalError();
  }

  // Convertir et stocker le fichier en base64
  private storeFileAsBase64(file: File, month: number): void {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        base64: base64,
        uploadDate: new Date().toISOString()
      };
      localStorage.setItem(`rib${month}_file`, JSON.stringify(fileData));
    };
    reader.readAsDataURL(file);
  }

  // Validation du type de fichier
  private isValidFileType(file: File): boolean {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return this.ACCEPTED_FILE_TYPES.includes(fileExtension);
  }

  // Validation de la taille du fichier
  private isValidFileSize(file: File): boolean {
    return file.size <= this.MAX_FILE_SIZE;
  }

  // Suppression d'un fichier
  removeFile(month: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.files.delete(month);
    this.fileErrors.delete(month);
    
    // Supprimer aussi du localStorage
    localStorage.removeItem(`rib${month}_file`);
    
    this.clearGlobalError();
  }

  // Calcul des totaux et moyennes
  calculateTotals(): void {
    const rev1 = this.getRevenue(1);
    const rev2 = this.getRevenue(2);
    const rev3 = this.getRevenue(3);

    this.totalRevenue = rev1 + rev2 + rev3;
    this.averageRevenue = this.totalRevenue / 3;

    // Sauvegarder la moyenne dans le cache à chaque calcul
    this.saveAverageRevenueToCache();
  }

  // Méthodes pour l'analyse des tendances
  showTrend(): boolean {
    return this.getRevenue(1) > 0 && this.getRevenue(2) > 0 && this.getRevenue(3) > 0;
  }

  getTrendClass(): string {
    const trend = this.calculateTrend();
    if (trend > 5) return 'trend-up';
    if (trend < -5) return 'trend-down';
    return 'trend-stable';
  }

  getTrendIcon(): string {
    const trend = this.calculateTrend();
    if (trend > 5) return '📈';
    if (trend < -5) return '📉';
    return '➡️';
  }

  getTrendText(): string {
    const trend = this.calculateTrend();
    if (trend > 5) return `Growing trend (+${trend.toFixed(1)}%)`;
    if (trend < -5) return `Declining trend (${trend.toFixed(1)}%)`;
    return 'Stable revenue pattern';
  }

  private calculateTrend(): number {
    const rev1 = this.getRevenue(1); // Plus récent
    const rev3 = this.getRevenue(3); // Plus ancien
    
    if (rev3 === 0) return 0;
    return ((rev1 - rev3) / rev3) * 100;
  }

  // Méthodes pour le progrès de l'application
  getApplicationProgress(): number {
    const totalSteps = 6; // 3 fichiers + 3 revenus
    const completedSteps = this.getUploadedFilesCount() + this.getCompletedRevenueCount();
    return Math.round((completedSteps / totalSteps) * 100);
  }

  getUploadedFilesCount(): number {
    return Array.from(this.files.values()).length;
  }

  getCompletedRevenueCount(): number {
    return Array.from(this.revenues.values()).filter(revenue => revenue > 0).length;
  }

  // Validation du formulaire complet
  isFormValid(): boolean {
    // Vérifier que tous les fichiers RIB sont uploadés
    const allFilesUploaded = this.getUploadedFilesCount() === 3;

    // Vérifier que tous les revenus sont saisis et valides
    const allRevenuesValid = this.getCompletedRevenueCount() === 3;

    // Vérifier qu'il n'y a pas d'erreurs de fichiers
    const noFileErrors = this.fileErrors.size === 0;

    return allFilesUploaded && allRevenuesValid && noFileErrors && !this.isSubmitting;
  }

  // Soumission du formulaire
  submitFunding(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please complete all required fields and upload all RIB documents.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Préparer les données pour l'envoi
      const fundingData = this.prepareFundingData();

      // Simuler l'envoi des données (remplacez par votre service)
      this.sendFundingData(fundingData);

    } catch (error) {
      this.errorMessage = 'An error occurred while processing your application.';
      this.isSubmitting = false;
      console.error('Funding submission error:', error);
    }
  }

  // Préparation des données de financement (version simplifiée sans FormData)
  private prepareFundingData(): any {
    const fundingData = {
      // Données de revenus
      revenues: {
        month1: this.getRevenue(1),
        month2: this.getRevenue(2),
        month3: this.getRevenue(3)
      },
      
      // Informations sur les fichiers (sans les blobs)
      ribFiles: {
        rib1: this.getStoredFileInfo(1),
        rib2: this.getStoredFileInfo(2),
        rib3: this.getStoredFileInfo(3)
      },
      
      // Métadonnées
      totalRevenue: this.totalRevenue,
      averageRevenue: this.averageRevenue,
      submissionDate: new Date().toISOString(),
      userId: localStorage.getItem('userId') || null,
      
      // Analyse des tendances
      trend: {
        percentage: this.calculateTrend(),
        direction: this.getTrendClass(),
        description: this.getTrendText()
      }
    };

    return fundingData;
  }

  // Récupérer les informations d'un fichier stocké
  private getStoredFileInfo(month: number): any {
    const storedFile = localStorage.getItem(`rib${month}_file`);
    if (storedFile) {
      try {
        const fileData = JSON.parse(storedFile);
        return {
          name: fileData.name,
          size: fileData.size,
          type: fileData.type,
          uploadDate: fileData.uploadDate,
          hasFile: true
        };
      } catch (error) {
        return { hasFile: false };
      }
    }
    return { hasFile: false };
  }

  // Envoi des données - Version avec upload PDF vers backend
  private sendFundingData(fundingData: any): void {

    // 1. D'abord uploader les PDFs vers le backend
    if (this.files.size > 0) {
      this.documentService.uploadRibFiles(this.files,).subscribe({
        next: (uploadResponse) => {
          console.log('PDFs uploaded successfully:', uploadResponse);

          // 2. Ensuite sauvegarder les données complètes avec les IDs des documents
          const completeData = {
            ...fundingData,
            documentIds: uploadResponse.documentIds,
            documentsUploaded: true,
            uploadDate: new Date().toISOString()
          }; 

          // Sauvegarder les métadonnées localement pour l'application
          //localStorage.setItem('fundingApplication', JSON.stringify(completeData));

          // Sauvegarder une fois de plus la moyenne des revenus après la soumission réussie
          this.saveAverageRevenueToCache();

          // 3. Transition to AI_CALCULATING step after successful upload
          this.stepService.transitionTo(FUNDING_STEPS.AI_CALCULATING).subscribe({
            next: () => {
              console.log('Step transitioned to AI_CALCULATING');

              this.isSubmitting = false;
              this.documentsUploaded = true;
              //this.documentIds = uploadResponse.documentIds;

              // Rediriger vers la page d'analyse
              this.router.navigate(['/ai-calculating']);
            },
            error: (stepError) => {
              console.error('Failed to update step:', stepError);
              // Continue anyway - the documents were uploaded successfully
              this.isSubmitting = false;
              this.documentsUploaded = true;
              //this.documentIds = uploadResponse.documentIds;

              // Rediriger vers la page d'analyse même si la mise à jour du step échoue
              this.router.navigate(['/ai-calculating']);
            }
          });
        },
        error: (error) => {
          console.error('PDF upload failed:', error);
          this.errorMessage = error.message || 'Failed to upload documents. Please try again.';
          this.isSubmitting = false;
        }
      }); 
    } else {
      // Pas de fichiers à uploader (cas d'erreur normalement)
      this.errorMessage = 'No documents to upload. Please select your RIB files.';
      this.isSubmitting = false;
    }
  }

  // Optionnel : Envoyer les métadonnées au backend (si vous voulez aussi stocker les revenus côté serveur)
  private sendMetadataToBackend(data: any): void {
    // Vous pouvez créer un endpoint séparé pour les métadonnées
    // this.fundingService.saveApplicationData(data).subscribe(...);
  }

  // Méthode pour récupérer les fichiers en base64 (si besoin dans l'app)
  getFileAsBase64(month: number): string | null {
    const storedFile = localStorage.getItem(`rib${month}_file`);
    if (storedFile) {
      try {
        const fileData = JSON.parse(storedFile);
        return fileData.base64;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  // Méthode pour afficher un fichier (si besoin)
  viewFile(month: number): void {
    const base64 = this.getFileAsBase64(month);
    if (base64) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<iframe src="${base64}" style="width:100%;height:100vh;border:none;"></iframe>`);
      }
    }
  }

  // Méthode utilitaire pour effacer le cache de revenus (si besoin pour debug ou reset)
  public clearRevenueCache(): void {
    localStorage.removeItem(this.AVERAGE_REVENUE_CACHE_KEY);
    localStorage.removeItem('cached_revenues');
    console.log('Revenue cache cleared');
  }

  // Méthode pour obtenir toutes les données de revenus mises en cache
  public getCachedRevenueData(): any {
    const cachedData = localStorage.getItem(this.AVERAGE_REVENUE_CACHE_KEY);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (error) {
        console.warn('Error reading cached revenue data:', error);
        return null;
      }
    }
    return null;
  }

  // Utilitaires pour le formatage
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Nettoyage des erreurs
  private clearGlobalError(): void {
    this.errorMessage = '';
  }

  // Validation en temps réel des revenus
  validateRevenue(revenue: number): boolean {
    return revenue >= 0 && revenue <= 10000000; // Max 10M€
  }
}