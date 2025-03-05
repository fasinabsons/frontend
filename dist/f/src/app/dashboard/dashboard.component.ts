import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemeService } from '../theme.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogsComponent } from '../logs/logs.component';
import { ForecastComponent } from '../forecast/forecast.component';
import { LogService } from '../log.service';
import { Subscription } from 'rxjs';
import { LiveLogsComponent } from '../live/live.component'; // ✅ Import but do NOT render in HTML
import { ApprovalLogsComponent } from '../approval/approval.component';

interface Log {
  message: string;
  timestamp: string;
  createdBy: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, RouterModule, LogsComponent, ForecastComponent, LiveLogsComponent, ApprovalLogsComponent],
  providers: [ThemeService, LogService],
})
export class DashboardComponent implements OnInit, OnDestroy {
  logs: Log[] = []; // Holds all logs
  latestApprovalLog: string = 'Fetching latest approval log...';
  latestLiveLog: string = 'Fetching latest live log...';

  isDarkMode = false;
  private subscriptions: Subscription = new Subscription(); // ✅ Store subscriptions

  constructor(private themeService: ThemeService, private logService: LogService) {}

  ngOnInit(): void {
    // ✅ Subscribe to Dark Mode
    this.subscriptions.add(
      this.themeService.isDarkMode$.subscribe((isDark) => {
        this.isDarkMode = isDark;
      })
    );

    this.subscriptions.add(
      this.logService.approvalLogs$.subscribe((logs: Log[]) => {
        if (logs.length > 0) {
          this.latestApprovalLog = logs[0].message;
        } else {
          this.latestApprovalLog = 'No approval logs available.';
        }
      })
    );

    // ✅ Subscribe to Latest Live Log (Coming from LiveLogsComponent)
    this.subscriptions.add(
      this.logService.latestLog$.subscribe((log) => {
        this.latestLiveLog = log;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe(); // ✅ Prevent memory leaks
  }
  receiveLatestApprovalLog(log: string): void {
    this.latestApprovalLog = log;
  }

  receiveLatestLog(log: string): void {
    this.latestLiveLog = log;
  }
}
