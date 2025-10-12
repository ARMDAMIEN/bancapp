import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

interface UploadResponse {
  documentIds: string[];
  message: string;
  userId: string;
  uploadDate: string;
  filePaths: { [key: string]: string };
}

@Component({
  selector: 'app-documents-supp',
  templateUrl: './documents-supp.component.html',
  styleUrl: './documents-supp.component.css'
})
export class DocumentsSuppComponent implements OnInit {
  @ViewChild('licenseFileInput') licenseFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('checkFileInput') checkFileInput!: ElementRef<HTMLInputElement>;

  // Propriétés des fichiers
  driverLicenseFile: File | null = null;
  voidedCheckFile: File | null = null;

  // État des uploads
  isUploading: boolean = false;
  uploadProgress: number = 0;

  // Validation et erreurs
  licenseError: string = '';
  checkError: string = '';
  generalError: string = '';

  // Configuration
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ACCEPTED_FILE_TYPE = '.pdf';
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private stepService: StepService
  ) {}

  ngOnInit(): void {
    this.setupFileInputs();
    // Load current step from backend first to ensure we have the latest state
    this.stepService.loadFromBackend().subscribe({
      next: () => {
        this.checkAndTransitionStep();
      },
      error: (error) => {
        console.error('Failed to load current step:', error);
        // Still check step using cached value as fallback
        this.checkAndTransitionStep();
      }
    });
  }

  private checkAndTransitionStep(): void {
    const currentStep = this.stepService.getCurrentStep();

    // If already at DOCUMENTS_SUPP or beyond, don't transition back
    if (currentStep === FUNDING_STEPS.DOCUMENTS_SUPP) {
      console.log('Already on DOCUMENTS_SUPP step');
      return;
    }

    // If at SIGNATURE_REQUIRED or beyond, redirect to correct page
    if (currentStep === FUNDING_STEPS.SIGNATURE_REQUIRED ||
        currentStep === FUNDING_STEPS.FUNDING_UNLOCKED ||
        currentStep === FUNDING_STEPS.DASHBOARD) {
      console.log('User already past DOCUMENTS_SUPP, redirecting...');
      this.redirectToCurrentStep(currentStep);
      return;
    }

    // If coming from SELECT_OPTION, transition to DOCUMENTS_SUPP
    if (currentStep === FUNDING_STEPS.SELECT_OPTION) {
      this.stepService.transitionTo(FUNDING_STEPS.DOCUMENTS_SUPP).subscribe({
        next: () => {
          console.log('Step transitioned to DOCUMENTS_SUPP');
        },
        error: (error) => {
          console.error('Failed to update step:', error);
        }
      });
    }
  }

  private redirectToCurrentStep(currentStep: string): void {
    const stepRoutes: Record<string, string> = {
      [FUNDING_STEPS.SIGNATURE_REQUIRED]: '/signature-required',
      [FUNDING_STEPS.FUNDING_UNLOCKED]: '/funding-unlocked',
      [FUNDING_STEPS.DASHBOARD]: '/dashboard'
    };
    console.log("currentStep : "+currentStep)
    const route = stepRoutes[currentStep];
    console.log("route : "+route);
    if (route) {
      this.router.navigate([route]);
    }
  }

  // Configuration des inputs de fichier
  private setupFileInputs(): void {
    setTimeout(() => {
      this.setupFileInput('license');
      this.setupFileInput('check');
      this.setupFormActions(); // Nouvelle méthode
    }, 0);
  }

  // Configuration des actions du formulaire
  private setupFormActions(): void {
    const backBtn = document.querySelector('.btn-secondary') as HTMLButtonElement;
    const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement;

    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goBack();
      };
    }

    if (continueBtn) {
      continueBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.continueToNext();
      };
    }
  }

  // Configuration d'un input de fichier spécifique
  private setupFileInput(type: 'license' | 'check'): void {
    const inputId = type === 'license' ? 'license-file' : 'check-file';
    const buttonId = type === 'license' ? 'license-upload-btn' : 'check-upload-btn';
    
    const input = document.getElementById(inputId) as HTMLInputElement;
    const button = document.querySelector(`#${type}-upload .upload-button`) as HTMLButtonElement;
    
    if (input && button) {
      button.addEventListener('click', () => input.click());
      input.addEventListener('change', (event) => this.onFileSelected(event, type));
    }
  }

  // Gestion de la sélection de fichier
  onFileSelected(event: Event, type: 'license' | 'check'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validation du fichier
    const validationError = this.validateFile(file);
    if (validationError) {
      this.setError(type, validationError);
      this.clearFilePreview(type);
      return;
    }

    // Assigner le fichier
    if (type === 'license') {
      this.driverLicenseFile = file;
      this.licenseError = '';
    } else {
      this.voidedCheckFile = file;
      this.checkError = '';
    }

    // Afficher l'aperçu du fichier
    this.showFilePreview(type, file);
    this.updateContinueButton();
  }

  // Validation d'un fichier
  private validateFile(file: File): string | null {
    // Vérifier le type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are accepted.';
    }

    // Vérifier la taille
    if (file.size > this.MAX_FILE_SIZE) {
      return `File size must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    return null;
  }

  // Définir une erreur
  private setError(type: 'license' | 'check', error: string): void {
    if (type === 'license') {
      this.licenseError = error;
    } else {
      this.checkError = error;
    }
    this.showErrorMessage(type, error);
  }

  // Afficher le message d'erreur dans le DOM
  private showErrorMessage(type: 'license' | 'check', error: string): void {
    const uploadId = type === 'license' ? 'license-upload' : 'check-upload';
    const errorElement = document.querySelector(`#${uploadId} .error-message`) as HTMLElement;
    
    if (errorElement) {
      errorElement.textContent = error;
      errorElement.style.display = 'block';
    }
  }

  // Afficher l'aperçu du fichier
  private showFilePreview(type: 'license' | 'check', file: File): void {
    const uploadId = type === 'license' ? 'license-upload' : 'check-upload';
    const previewElement = document.querySelector(`#${uploadId} .file-preview`) as HTMLElement;
    const nameElement = document.querySelector(`#${uploadId} .file-name`) as HTMLElement;
    const sizeElement = document.querySelector(`#${uploadId} .file-size`) as HTMLElement;
    const removeButton = document.querySelector(`#${uploadId} .remove-file`) as HTMLButtonElement;

    if (previewElement && nameElement && sizeElement) {
      nameElement.textContent = file.name;
      sizeElement.textContent = this.formatFileSize(file.size);
      previewElement.style.display = 'block';

      // Configurer le bouton de suppression
      if (removeButton) {
        removeButton.onclick = () => this.removeFile(type);
      }
    }

    // Masquer l'erreur si elle était visible
    const errorElement = document.querySelector(`#${uploadId} .error-message`) as HTMLElement;
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  // Nettoyer l'aperçu du fichier
  private clearFilePreview(type: 'license' | 'check'): void {
    const uploadId = type === 'license' ? 'license-upload' : 'check-upload';
    const previewElement = document.querySelector(`#${uploadId} .file-preview`) as HTMLElement;
    
    if (previewElement) {
      previewElement.style.display = 'none';
    }
  }

  // Supprimer un fichier
  removeFile(type: 'license' | 'check'): void {
    if (type === 'license') {
      this.driverLicenseFile = null;
      this.licenseError = '';
    } else {
      this.voidedCheckFile = null;
      this.checkError = '';
    }

    this.clearFilePreview(type);
    this.updateContinueButton();

    // Reset de l'input
    const inputId = type === 'license' ? 'license-file' : 'check-file';
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  // Mettre à jour l'état du bouton Continue
  private updateContinueButton(): void {
    const continueButton = document.getElementById('continue-btn') as HTMLButtonElement;
    if (continueButton) {
      continueButton.disabled = !this.canContinue();
    }
  }

  // Vérifier si on peut continuer
  canContinue(): boolean {
    return !!(this.driverLicenseFile && this.voidedCheckFile && !this.hasErrors());
  }

  // Vérifier s'il y a des erreurs
  private hasErrors(): boolean {
    return !!(this.licenseError || this.checkError || this.generalError);
  }

  // Upload des documents vers le backend
  uploadDocuments(): Observable<UploadResponse> {
    if (!this.driverLicenseFile || !this.voidedCheckFile) {
      return throwError(() => ({ message: 'Both documents are required' }));
    }

    const formData = new FormData();
    formData.append('driverLicense', this.driverLicenseFile, this.driverLicenseFile.name);
    formData.append('voidedCheck', this.voidedCheckFile, this.voidedCheckFile.name);
    formData.append('uploadDate', new Date().toISOString());

    return this.http.post<UploadResponse>(`${this.apiUrl}/documents/upload-additional-docs`, formData)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  // Continuer vers la prochaine étape
  continueToNext(): void {
    if (!this.canContinue()) {
      this.generalError = 'Please upload both required documents before continuing.';
      return;
    }

    this.isUploading = true;
    this.generalError = '';

    // Disable buttons during upload
    this.disableButtons(true);

    this.uploadDocuments().subscribe({
      next: (response) => {
        console.log('Documents uploaded successfully:', response);

        // Sauvegarder les informations d'upload
        const uploadInfo = {
          documentIds: response.documentIds,
          uploadDate: response.uploadDate,
          filePaths: response.filePaths
        };
        localStorage.setItem('additionalDocuments', JSON.stringify(uploadInfo));

        // Transition to SIGNATURE_REQUIRED step
        this.stepService.transitionTo(FUNDING_STEPS.SIGNATURE_REQUIRED).subscribe({
          next: () => {
            console.log('Step transitioned to SIGNATURE_REQUIRED');
            this.isUploading = false;
            this.disableButtons(false);
            // Naviguer vers l'étape suivante
            this.router.navigate(['/signature-required']);
          },
          error: (stepError) => {
            console.error('Failed to update step:', stepError);
            this.isUploading = false;
            this.disableButtons(false);
            // Navigate anyway - documents were uploaded successfully
            this.router.navigate(['/signature-required']);
          }
        });
      },
      error: (error) => {
        console.error('Upload failed:', error);
        this.generalError = error.message || 'Upload failed. Please try again.';
        this.isUploading = false;
        this.disableButtons(false);
      }
    });
  }

  // Retour à la page précédente
  goBack(): void {
    this.router.navigate(['/analyseOffer']); // Adaptez selon votre routing
  }

  // Désactiver/activer les boutons pendant l'upload
  private disableButtons(disable: boolean): void {
    const backBtn = document.querySelector('.btn-secondary') as HTMLButtonElement;
    const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement;

    if (backBtn) {
      backBtn.disabled = disable;
    }
    if (continueBtn) {
      continueBtn.disabled = disable;
    }
  }

  // Gestion des erreurs HTTP
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Upload failed';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Invalid request';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 413:
          errorMessage = 'File size too large';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.message}`;
      }
    }
    
    return throwError(() => ({ message: errorMessage }));
  }

  // Formatage de la taille de fichier
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Méthodes exposées pour le template (si vous convertissez en Angular template)
  onLicenseFileSelected(event: Event): void {
    this.onFileSelected(event, 'license');
  }

  onCheckFileSelected(event: Event): void {
    this.onFileSelected(event, 'check');
  }

  removeLicenseFile(): void {
    this.removeFile('license');
  }

  removeCheckFile(): void {
    this.removeFile('check');
  }

  // Getters pour le template
  get isLicenseUploaded(): boolean {
    return !!this.driverLicenseFile;
  }

  get isCheckUploaded(): boolean {
    return !!this.voidedCheckFile;
  }

  get uploadPercentage(): number {
    return this.uploadProgress;
  }
}