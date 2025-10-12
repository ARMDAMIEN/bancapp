import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface DocumentUploadResponse {
  documentIds: string[];
  message: string;
  userId: string;
}

export interface DocumentDownloadResponse {
  downloadUrl: string;
  documentId: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
 private apiUrl = environment.apiUrl;
 
  constructor(private http: HttpClient) {}

 uploadRibFiles(files: Map<number, File>): Observable<DocumentUploadResponse> {
  const formData = new FormData();
  
  // Ajouter les fichiers
  files.forEach((file, month) => {
    formData.append(`rib${month}`, file, file.name);
  });
  
  // Supprimer ces lignes :
  // formData.append('userId', userId);
  formData.append('uploadDate', new Date().toISOString());
  
  return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/documents/upload-ribs`, formData)
    .pipe(
      catchError(this.handleError)
    );
}

  // Récupérer la liste des documents d'un utilisateur (pour l'admin)
 getUserDocuments(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/documents/user/documents`) // Plus besoin d'userId
    .pipe(
      catchError(this.handleError)
    );
}

 downloadDocument(userId: number, documentType: string): Observable<DocumentDownloadResponse> {
  // documentType sera juste "rib1", "rib2", ou "rib3"
  // Backend now returns a presigned S3 URL instead of the file directly
  return this.http.get<DocumentDownloadResponse>(`${this.apiUrl}/documents/download/${documentType}`, {
    params: { userId: userId.toString() }
  }).pipe(
    catchError(this.handleError)
  );
}

deleteDocument(documentType: string): Observable<any> {
  // documentType sera juste "rib1", "rib2", ou "rib3"
  return this.http.delete(`${this.apiUrl}/documents/${documentType}`)
    .pipe(
      catchError(this.handleError)
    );
}

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred during file upload';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid file format or size';
          break;
        case 413:
          errorMessage = 'File too large';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Upload failed: ${error.message}`;
      }
    }
    
    return throwError(() => ({ message: errorMessage }));
  }
}