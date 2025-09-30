import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SignatureStatusResponse {
  hasSigned: boolean;
  email: string;
}

@Component({
  selector: 'app-signature-required',
  templateUrl: './signature-required.component.html',
  styleUrl: './signature-required.component.css'
})
export class SignatureRequiredComponent implements OnInit {
  isCheckingStatus: boolean = false;
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Vérification automatique au chargement du composant
    this.checkSignatureStatus();
  }

  refreshAccountData(): void {
    this.checkSignatureStatus();
  }

  private checkSignatureStatus(): void {
    this.isCheckingStatus = true;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      this.isCheckingStatus = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<SignatureStatusResponse>(
      `${this.apiUrl}/api/signature/status`, 
      { headers }
    ).subscribe({
      next: (response) => {
        this.isCheckingStatus = false;
        
        if (response.hasSigned) {
          // Vérifier si c'est la première visite
          const hasSeenFundingUnlocked = localStorage.getItem('hasSeenFundingUnlocked') === 'true';
          
          if (!hasSeenFundingUnlocked) {
            // Première visite après signature -> funding unlocked
            this.router.navigate(['/funding-unlocked']);
          } else {
            // Déjà vu la page funding unlocked -> dashboard
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (error) => {
        console.error('Error checking signature status:', error);
        this.isCheckingStatus = false;
      }
    });
  }
}