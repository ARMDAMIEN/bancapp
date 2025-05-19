// withdraw.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { WithdrawDTO } from '../interfaces/withdraw-dto';

@Injectable({
  providedIn: 'root'
})

export class WithdrawService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Sauvegarde un nouveau retrait
   * @param withdraw Les données du retrait à sauvegarder
   * @returns Observable avec la réponse du serveur
   */
  saveWithdraw(withdraw: WithdrawDTO): Observable<string> {
  const url = `${this.apiUrl}/saveWithdraw`;
  
  // Assurez-vous que le montant est un nombre (conversion depuis string si nécessaire)
  const payload = {
    ...withdraw,
    amount: typeof withdraw.amount === 'string' ? parseFloat(withdraw.amount as any) : withdraw.amount
  };
  console.log('payload : '+payload);
  return this.http.post(url, payload, {
    responseType: 'text'
  });
}

  /**
   * Récupère tous les retraits
   * @returns Observable avec la liste des retraits
   */
  getWithdraws(): Observable<WithdrawDTO[]> {
    const url = `${this.apiUrl}/getWithdraws`;
    return this.http.get<WithdrawDTO[]>(url);
  }

  /**
   * Met à jour le statut d'un retrait à "complété"
   * @param id L'identifiant du retrait à compléter
   * @returns Observable avec la réponse du serveur
   */
  completeWithdraw(id: number): Observable<any> {
  console.log("in complete withdraw")
  const url = `${this.apiUrl}/markWithdrawAsCompleted/${id}`;
return this.http.post(url, {}, {
    responseType: 'text'
  });}

  /**
   * Annule un retrait en attente
   * @param id L'identifiant du retrait à annuler
   * @returns Observable avec la réponse du serveur
   */
  cancelWithdraw(id: number | string): Observable<any> {
    const url = `${this.apiUrl}/withdraws/${id}/cancel`;
    return this.http.patch(url, {});
  }

  /**
   * Récupère un retrait spécifique par son ID
   * @param id L'identifiant du retrait
   * @returns Observable avec les détails du retrait
   */
  getWithdrawById(id: number | string): Observable<WithdrawDTO> {
    const url = `${this.apiUrl}/withdraws/${id}`;
    return this.http.get<WithdrawDTO>(url);
  }
}