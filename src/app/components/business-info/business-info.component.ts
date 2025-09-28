import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-business-info',
  templateUrl: './business-info.component.html',
  styleUrls: ['./business-info.component.scss']
})
export class BusinessInfoComponent {
  // Événements émis vers le composant parent (SignUpComponent)
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formError = new EventEmitter<string>();
  @Output() goBack = new EventEmitter<void>();

  // Propriétés du formulaire business
  businessName: string = '';
  foundingDate: string = '';
  ein: string = '';
  errorMessage: string = '';

  constructor() {}

  // Méthode pour revenir à l'étape précédente
  previousStep(): void {
    this.goBack.emit();
  }

  // Méthode pour soumettre les informations business
  submitBusinessInfo(): void {
    // Validation personnalisée si nécessaire
    if (this.validateBusinessInfo()) {
      const businessData = {
        businessName: this.businessName,
        foundingDate: this.foundingDate,
        ein: this.ein
      };

      // Émettre les données vers le composant parent
      this.formSubmit.emit(businessData);
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Please fill in all required fields correctly';
      this.formError.emit(this.errorMessage);
    }
  }

  // Validation personnalisée des données business
  private validateBusinessInfo(): boolean {
    // Vérifier que tous les champs requis sont remplis
    if (!this.businessName || !this.foundingDate || !this.ein) {
      return false;
    }

    // Validation du format EIN (XX-XXXXXXX)
    const einPattern = /^[0-9]{2}-[0-9]{7}$/;
    if (!einPattern.test(this.ein)) {
      this.errorMessage = 'Please enter a valid EIN format (XX-XXXXXXX)';
      return false;
    }

    // Validation de la date de fondation (ne peut pas être dans le futur)
    const foundingDateObj = new Date(this.foundingDate);
    const today = new Date();
    if (foundingDateObj > today) {
      this.errorMessage = 'Founding date cannot be in the future';
      return false;
    }

    // Validation de la date de fondation (pas trop ancienne, ex: pas avant 1800)
    const minDate = new Date('1800-01-01');
    if (foundingDateObj < minDate) {
      this.errorMessage = 'Please enter a valid founding date';
      return false;
    }

    return true;
  }

  // Méthode pour formater automatiquement l'EIN pendant la saisie (optionnel)
  onEinInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Supprimer tout ce qui n'est pas un chiffre
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + '-' + value.substring(2, 9);
    }
    
    this.ein = value;
    event.target.value = value;
  }

  // Méthode pour nettoyer les messages d'erreur
  clearError(): void {
    this.errorMessage = '';
  }
}