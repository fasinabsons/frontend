import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { ItemListComponent } from './item-list/item-list.component';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LogsComponent } from './logs/logs.component';
import { DecimalPipe } from '@angular/common';
import { ForecastComponent } from './forecast/forecast.component';
import { LiveLogsComponent } from './live/live.component';
import { JobCardComponent } from './job/job.component';
import { ApprovalLogsComponent } from './approval/approval.component';
import { MaterialModule } from './material.module';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { LayoutComponent } from './layout/layout.component';
import { ThemeService } from './theme.service';
import { HeaderComponent } from './header/header.component';



@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    ItemListComponent, // Import ItemListComponent as it's standalone
    CommonModule,
    LogsComponent, // Import LogsComponent as it's standalone
    DecimalPipe,
    ForecastComponent,
    LiveLogsComponent,
    JobCardComponent,
   ApprovalLogsComponent,
   MaterialModule,
   RouterModule,
   RouterModule.forRoot(routes),
   LayoutComponent,
   AppComponent,
   HeaderComponent
  ],
  bootstrap: [], // Only bootstrap the main component
  providers:[provideHttpClient(withFetch()), HttpClient, ThemeService], schemas:[CUSTOM_ELEMENTS_SCHEMA],  exports: [], declarations: []})
export class AppModule {}
