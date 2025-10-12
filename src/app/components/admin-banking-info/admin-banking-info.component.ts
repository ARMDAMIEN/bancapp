import { Component, OnInit } from '@angular/core';
import { AdminBankingInfoService, AdminBankingInfoDTO } from '../../../services/admin-banking-info.service';

@Component({
  selector: 'app-admin-banking-info',
  templateUrl: './admin-banking-info.component.html',
  styleUrl: './admin-banking-info.component.css'
})
export class AdminBankingInfoComponent implements OnInit {

  adminBankingInfo: AdminBankingInfoDTO = {
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    bankName: ''
  };

  showModal: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private adminBankingInfoService: AdminBankingInfoService) {}

  ngOnInit(): void {
    // Don't load on init, only when modal is opened
  }

  openModal(): void {
    this.showModal = true;
    this.loadAdminBankingInfo();
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private loadAdminBankingInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminBankingInfoService.getAdminBankingInfo().subscribe({
      next: (response) => {
        if (this.adminBankingInfoService.isAdminBankingInfo(response)) {
          this.adminBankingInfo = {
            accountHolderName: response.accountHolderName,
            routingNumber: response.routingNumber,
            accountNumber: response.accountNumber,
            bankName: response.bankName
          };
        } else {
          // No banking info exists, keep form empty
          this.resetForm();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading admin banking info:', error);
        this.isLoading = false;
        // Keep form empty if no banking info exists yet
        this.resetForm();
      }
    });
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bankingInfoToSave: AdminBankingInfoDTO = {
      accountHolderName: this.adminBankingInfo.accountHolderName.trim(),
      routingNumber: this.adminBankingInfo.routingNumber.trim(),
      accountNumber: this.adminBankingInfo.accountNumber.trim(),
      bankName: this.adminBankingInfo.bankName.trim()
    };

    this.adminBankingInfoService.saveAdminBankingInfo(bankingInfoToSave).subscribe({
      next: (savedBankingInfo) => {
        this.successMessage = 'Admin banking information saved successfully!';
        this.isSaving = false;

        // Update the form with the saved data (including id)
        this.adminBankingInfo = savedBankingInfo;

        // Close modal after a short delay
        setTimeout(() => {
          this.closeModal();
        }, 1500);
      },
      error: (error) => {
        console.error('Error saving admin banking info:', error);
        this.errorMessage = error.error?.message || 'Failed to save admin banking information. Please try again.';
        this.isSaving = false;
      }
    });
  }

  isFormValid(): boolean {
    const { accountHolderName, routingNumber, accountNumber, bankName } = this.adminBankingInfo;
    const routingValid = /^[0-9]{3,20}$/.test(routingNumber);

    return accountHolderName.trim() !== '' &&
           routingValid &&
           accountNumber.trim() !== '' &&
           bankName.trim() !== '';
  }

  resetForm(): void {
    this.adminBankingInfo = {
      accountHolderName: '',
      routingNumber: '',
      accountNumber: '',
      bankName: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
  }
}
