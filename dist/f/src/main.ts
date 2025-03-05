import { bootstrapApplication } from '@angular/platform-browser';
import { LayoutComponent } from './app/layout/layout.component'; // ✅ Import LayoutComponent
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

bootstrapApplication(LayoutComponent, {
  providers: [
    provideRouter(routes), // ✅ Provides Angular Router
    provideHttpClient() // ✅ Fixes HttpClient Error
  ]
}).catch(err => console.error(err));
