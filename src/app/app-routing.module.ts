// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './guards/auth.guard';
import { SignatureGuardService } from './guards/signature-guard.service';
import { FundingComponent } from './pages/funding/funding.component';
import { AnalyseOfferComponent } from './pages/analyse-offer/analyse-offer.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AdminComponent } from './pages/admin/admin.component';
import { DocumentsSuppComponent } from './pages/documents-supp/documents-supp.component';
import { SignatureRequiredComponent } from './pages/signature-required/signature-required.component';
import { FundingUnlockedComponent } from './pages/funding-unlocked/funding-unlocked.component';

const routes: Routes = [
  // Routes accessibles sans authentification
  {path: 'sign-up', component: SignUpComponent},
  {path: 'forgot-password', component: ForgotPasswordComponent},
  {path: 'change-password', component: ChangePasswordComponent},
  {path: 'sign-in', component: SignInComponent},
  
  // Routes avec le layout commun (header)
  {
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    path: '',
    component: LayoutComponent,
    children: [
      {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
      
      // Route pour signature requise
      {
        path: 'signature-required', 
        component: SignatureRequiredComponent,
        canActivate: [SignatureGuardService]
      },
      
      // Route pour funding unlocked (première visite)
      {
        path: 'funding-unlocked', 
        component: FundingUnlockedComponent,
        canActivate: [SignatureGuardService]
      },
      
      // Dashboard et autres routes protégées
      {
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [SignatureGuardService]
      },
      
      {path: 'funding', component: FundingComponent},
      {path: 'analyseOffer', component: AnalyseOfferComponent},
      {path: 'documentSupp', component: DocumentsSuppComponent},
      {path: 'admin', component: AdminComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }