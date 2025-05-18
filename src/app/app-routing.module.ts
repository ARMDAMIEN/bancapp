import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignUpComponent } from './sign-up/sign-up.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { LiveViewComponent } from './live-view/live-view.component';
import { PortfolioDashboardComponent } from './portfolio-dashboard/portfolio-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { PendingDepositsComponent } from './pending-deposits/pending-deposits.component';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './guards/auth.guard';

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
      {path: 'addFund', component: OnboardingComponent},
      {path: 'live-view', component: LiveViewComponent},
      {path: 'portfolio', component: PortfolioDashboardComponent},
      {path: 'admin-dashboard', component: AdminDashboardComponent},
      {path: 'deposits', component: PendingDepositsComponent},
      {path: '', redirectTo: 'portfolio', pathMatch: 'full'} // Redirection par défaut
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
