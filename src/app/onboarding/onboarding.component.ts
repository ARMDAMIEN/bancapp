import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DepositServiceService } from '../../services/deposit-service.service';
import { catchError, map, of, throwError } from 'rxjs';

interface BotWallet {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  minDeposit: string;
  currency: string;
  color: string;
}

interface UserData {
  walletNetwork: string;
  walletAddress: string;
  confirmWalletOwnership: boolean;
  transactionId: string;
  depositAmount: number;
  confirmDeposit: boolean;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {

  currentStep: number = 1;
  totalSteps: number = 4;
  steps: string[] = ['Your Wallet', 'Deposit Funds', 'Confirm Transfer', 'Complete'];

  walletForm: FormGroup;
  confirmationForm: FormGroup;

  selectedBotWallet: string = 'eth';

  showCopyNotification: boolean = false;

  userData: UserData = {
    walletNetwork: '',
    walletAddress: '',
    confirmWalletOwnership: false,
    transactionId: '',
    depositAmount: 0,
    confirmDeposit: false
  };

  // Dans votre TypeScript
  botWallets = [
    {
      id: 'eth',
      name: 'Ethereum',
      symbol: 'ETH',
      network: 'Ethereum (ERC20)',
      address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      currency: 'USDC',
      minDeposit: '100 USDC',
      color: '#627EEA'
    },
    {
      id: 'tron',
      name: 'Tron',
      symbol: 'TRX',
      network: 'Tron (TRC20)',
      address: 'T1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      currency: 'USDC',
      minDeposit: '100 USDC',
      color: '#EF0027'
    },
    {
      id: 'sol',
      name: 'Solana',
      symbol: 'SOL',
      network: 'Solana',
      address: 'So1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      currency: 'USDC',
      minDeposit: '100 USDC',
      color: '#14F195'
    },
    {
      id: 'poly',
      name: 'Polygon',
      symbol: 'MATIC',
      network: 'Polygon',
      address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      currency: 'USDC',
      minDeposit: '100 USDC',
      color: '#8247E5'
    }
  ];

  constructor(private router: Router, private fb: FormBuilder, private depositService: DepositServiceService) {
    // Initialize wallet form
    this.walletForm = this.fb.group({
      walletNetwork: ['', Validators.required],
      walletAddress: ['', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9]{30,}$')
      ]],
      confirmWalletOwnership: [false, Validators.requiredTrue]
    });

    // Initialize confirmation form
    this.confirmationForm = this.fb.group({
      transactionId: [''],
      depositAmount: [0, [
        Validators.required,
        Validators.min(100)
      ]],
      confirmDeposit: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    // Initialize any data or state here
  }

  saveWallet() {
    this.userData.walletNetwork = this.walletForm.get('walletNetwork')?.value;
    this.userData.walletAddress = this.walletForm.get('walletAddress')?.value;
    this.goToNextStep();
  }

  saveDeposit() {
    this.userData.depositAmount = this.confirmationForm.get('depositAmount')?.value;
    this.depositService.saveDeposit(this.userData).pipe(
      map(data => {
        return data;
      }),
      catchError(error => {
        console.error('Error on save deposit :', JSON.stringify(error));
        return throwError(() => error);
      })
    ).subscribe({
      next: (result: any) => {
        this.goToNextStep();
        console.log('Success', result);
      },
      error: (err: any) => {
        console.error('Error : ', err);
      },
      complete: () => {
        // Actions à effectuer lorsque l'observable est complété
        console.log('Operation finished');
      }
    });
  }

  goToNextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      window.scrollTo(0, 0);
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0);
    }
  }

  selectBotWallet(walletId: string): void {
    this.selectedBotWallet = walletId;
  }

  getBotWallet(): BotWallet {
    return this.botWallets.find(w => w.id === this.selectedBotWallet) || this.botWallets[0];
  }

  copyWalletAddress(): void {
    const walletAddress = this.getBotWallet().address;

    // Using the Clipboard API
    navigator.clipboard.writeText(walletAddress).then(() => {
      this.showCopyNotification = true;
      setTimeout(() => {
        this.showCopyNotification = false;
      }, 2000);
    });
  }

  navigateToDashboard(): void {
    // Navigate to the dashboard
    this.router.navigate(['/dashboard']);
  }

  get wallet() {
    return this.walletForm.controls;
  }

  get confirmation() {
    return this.confirmationForm.controls;
  }

  onSubmit() {

  }
}