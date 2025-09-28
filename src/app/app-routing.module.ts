import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './guards/auth.guard';
import { FundingComponent } from './pages/funding/funding.component';
import { AnalyseOfferComponent } from './pages/analyse-offer/analyse-offer.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AdminComponent } from './pages/admin/admin.component';
import { DocumentsSuppComponent } from './pages/documents-supp/documents-supp.component';

const routes: Routes = [
  // Routes accessibles sans authentification
  {path: 'sign-up', component: SignUpComponent},
  {path: 'forgot-password', component: ForgotPasswordComponent},
  {path: 'change-password', component: ChangePasswordComponent},
  {path: 'sign-in', component: SignInComponent},
  
  // Routes avec le layout commun (header)
  {
    canActivate: [AuthGuard],     // Protège la route parent
    canActivateChild: [AuthGuard],
    path: '',
    component: LayoutComponent,
    children: [
      {path: '', redirectTo: 'portfolio', pathMatch: 'full'}, // Redirection par défaut
      {path: 'funding', component: FundingComponent},
      {path: 'analyseOffer', component: AnalyseOfferComponent},
      {path: 'documentSupp', component: DocumentsSuppComponent},
      {path: 'dashboard', component: DashboardComponent},
      {path: 'admin', component: AdminComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
