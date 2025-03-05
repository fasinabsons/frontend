import { AppComponent } from './app.component';
import { Routes } from '@angular/router';
import { LiveLogsComponent } from './live/live.component';
import { JobCardComponent } from './job/job.component';
import { ApprovalLogsComponent } from './approval/approval.component';
import { ForecastComponent } from './forecast/forecast.component';
import { ItemListComponent } from './item-list/item-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LogsComponent } from './logs/logs.component';

export const routes: Routes = [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent }, // ✅ Default Page
      { path: 'live-logs', component: LiveLogsComponent },
      { path: 'job-card', component: JobCardComponent },
      { path: 'approval-logs', component: ApprovalLogsComponent },
      { path: 'forecast', component: ForecastComponent },
      { path: 'item-list', component: ItemListComponent },
      { path: 'collections', component: AppComponent},

      { path: '**', redirectTo: 'dashboard' }, // ✅ Redirect unknown paths
];

