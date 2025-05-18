import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { LiveViewComponent } from './live-view/live-view.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { GraphComponent } from './graph/graph.component';
import { LiveTradesComponent } from './live-trades/live-trades.component';
import { PortfolioDashboardComponent } from './portfolio-dashboard/portfolio-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { PendingDepositsComponent } from './pending-deposits/pending-deposits.component';
import { HeaderComponent } from './header/header.component';
import { LayoutComponent } from './layout/layout.component';

@NgModule({
  declarations: [
    AppComponent,
    SignUpComponent,
    ForgotPasswordComponent,
    ChangePasswordComponent,
    SignInComponent,
    LiveViewComponent,
    GraphComponent,
    LiveTradesComponent,
    PortfolioDashboardComponent,
    AdminDashboardComponent,
    OnboardingComponent,
    PendingDepositsComponent,
    HeaderComponent,
    LayoutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgApexchartsModule
  ],
  providers: [
    provideClientHydration(),
     {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
