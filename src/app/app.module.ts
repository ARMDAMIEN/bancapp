import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { HeaderComponent } from './header/header.component';
import { LayoutComponent } from './layout/layout.component';
import { BusinessInfoComponent } from './components/business-info/business-info.component';
import { FundingComponent } from './pages/funding/funding.component';
import { AnalyseOfferComponent } from './pages/analyse-offer/analyse-offer.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AdminComponent } from './pages/admin/admin.component';
import { DocumentsSuppComponent } from './pages/documents-supp/documents-supp.component';

@NgModule({
  declarations: [
    AppComponent,
    SignUpComponent,
    ForgotPasswordComponent,
    ChangePasswordComponent,
    SignInComponent,
    HeaderComponent,
    LayoutComponent,
    BusinessInfoComponent,
    FundingComponent,
    AnalyseOfferComponent,
    DashboardComponent,
    AdminComponent,
    DocumentsSuppComponent
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
