import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  template: `
    <div class="app-layout">
      <app-header></app-header>
      <main class="content-area">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
    }
    
    .content-area {
      flex: 1;
      overflow-y: auto;
      background-color: var(--background-dark);
    }
  `]
})
export class LayoutComponent { }