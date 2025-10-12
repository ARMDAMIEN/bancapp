import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { BankInfoService, BankInfoDTO } from '../../../services/bank-info.service';

@Component({
  selector: 'app-bank-info',
  templateUrl: './bank-info.component.html',
  styleUrl: './bank-info.component.css'
})
export class BankInfoComponent implements OnInit, OnChanges {
  @Input() userId: number | null = null;
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<BankInfoDTO>();

  bankInfo: BankInfoDTO = {
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    bankName: ''
  };

  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  private previousUserId: number | null = null;

  constructor(private bankInfoService: BankInfoService) {}

  ngOnInit(): void {
    if (this.userId) {
      this.previousUserId = this.userId;
      this.loadBankInfo();
    }
  }

  ngOnChanges(): void {
    // Check if userId has changed
    if (this.userId !== this.previousUserId) {
      this.resetForm();
      this.previousUserId = this.userId;
    }

    // Load bank info when modal is shown
    if (this.show && this.userId) {
      this.loadBankInfo();
    }
  }

  private loadBankInfo(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.bankInfoService.getBankInfoByUserId(this.userId).subscribe({
      next: (response) => {
        if (this.bankInfoService.isBankInfo(response)) {
          this.bankInfo = {
            accountHolderName: response.accountHolderName,
            routingNumber: response.routingNumber,
            accountNumber: response.accountNumber,
            bankName: response.bankName
          };
        } else {
          // No bank info exists, keep form empty
          this.resetForm();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bank info:', error);
        this.isLoading = false;
        // Keep form empty if no bank info exists yet
        this.resetForm();
      }
    });
  }

  onSubmit(): void {
    if (!this.isFormValid() || !this.userId) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bankInfoToSave: BankInfoDTO = {
      userId: this.userId,
      accountHolderName: this.bankInfo.accountHolderName.trim(),
      routingNumber: this.bankInfo.routingNumber.trim(),
      accountNumber: this.bankInfo.accountNumber.trim(),
      bankName: this.bankInfo.bankName.trim()
    };

    this.bankInfoService.saveBankInfo(bankInfoToSave).subscribe({
      next: (savedBankInfo) => {
        this.successMessage = 'Bank information saved successfully!';
        this.isSaving = false;

        // Emit saved event and close after a short delay
        setTimeout(() => {
          this.saved.emit(savedBankInfo);
          this.onClose();
        }, 1500);
      },
      error: (error) => {
        console.error('Error saving bank info:', error);
        this.errorMessage = error.error?.message || 'Failed to save bank information. Please try again.';
        this.isSaving = false;
      }
    });
  }

  isFormValid(): boolean {
    const { accountHolderName, routingNumber, accountNumber, bankName } = this.bankInfo;
    const routingValid = /^[0-9]{3,20}$/.test(routingNumber);

    return accountHolderName.trim() !== '' &&
           routingValid &&
           accountNumber.trim() !== '' &&
           bankName.trim() !== '';
  }

  onClose(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.close.emit();
  }

  resetForm(): void {
    this.bankInfo = {
      accountHolderName: '',
      routingNumber: '',
      accountNumber: '',
      bankName: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
  }
}
