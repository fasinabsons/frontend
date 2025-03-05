import { Component, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import io from 'socket.io-client';
import { ThemeService } from '../theme.service';
import { ViewEncapsulation } from '@angular/core';
import { LogService } from '../log.service';
import { environment } from '../../environments/environment';

interface Log {
  message: string;
  timestamp: string;
  createdBy: string;
  collection: string;
}

@Component({
  selector: 'app-approval-logs',
  templateUrl: './approval.component.html',
  styleUrls: ['./approval.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  providers: [ThemeService, LogService]
})
export class ApprovalLogsComponent implements OnInit, OnDestroy {
  USER_MAP: { [key: string]: string } = {
    '66d0358045d8874340a78a7f': 'Shekha Mendoza',
    '67766e6f565ed783bbd30718': 'Shama Mohamad Wehbe',
    '66d034b845d8874340a78a7b': 'Mostafa Sallam',
    '66d5469cf78314d6ea83862c': 'Rajesh Kuttan',
    '66def25ccccab96dcd6fa6b2': 'Saji Alhaddad',
    '66d033bb45d8874340a78a74': 'Mahmoud Dayeh',
    '66fe99be01c7b4e6692e3e2e': 'Miraj Abdul Sathar'
  };

  approvalLogs: Log[] = [];
  @Output() latestApprovalLogEvent = new EventEmitter<string>();
  private subscription: Subscription = new Subscription();
  isLoading: boolean = false;
  selectedDate: string = new Date().toISOString().split('T')[0];
  isCurrentDay: boolean = true;
  private socket: any;
  searchQuery: string = '';
  selectedUser: string = '';
  userSuggestions: string[] = [];
  isDarkMode = false;
  private fetchInterval: any; // For periodic fetching
  private cachedLogs: { [key: string]: Log[] } = {}; // Cache logs by date and user

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private ThemeService: ThemeService, private logService: LogService) {}

  ngOnInit(): void {
    this.socket = io('${environment.BACKEND_URL}');
    this.fetchApprovalLogs(); // Initial fetch
    this.startFetchInterval(10 * 60 * 1000); // Fetch every 10 minutes

    this.socket.on('newApprovalLog', (log: any) => {
      if (this.isCurrentDay && log.collection) {
        this.updateApprovalLogs([log], log.collection);
      }
    });

    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
      this.applyDarkModeStyles(isDarkMode);
    });
  }

  // Start periodic fetching
  startFetchInterval(intervalMs: number): void {
    this.fetchInterval = setInterval(() => {
      if (this.isCurrentDay) {
        this.fetchApprovalLogs();
      }
    }, intervalMs);
  }

  fetchApprovalLogs(): void {
    const cacheKey = `${this.selectedDate}-${this.selectedUser}`;
    if (this.cachedLogs[cacheKey]) {
      this.approvalLogs = this.cachedLogs[cacheKey];
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.isCurrentDay = this.selectedDate === new Date().toISOString().split('T')[0];
    const collections = ['salesorders', 'purchaseorders', 'goodsreceivednotes'];
    const userKey = Object.keys(this.USER_MAP).find(key => this.USER_MAP[key] === this.selectedUser);

    collections.forEach((collection) => {
      let apiUrl = `${environment.BACKEND_URL}/fetch-logs/${collection}?selectedDate=${this.selectedDate}`;
      if (userKey) apiUrl += `&createdBy=${userKey}`;

      this.http.get<any[]>(apiUrl).subscribe(
        (data) => {
          const filteredData = this.filterDataByCollection(collection, data);
          if (filteredData.length > 0) {
            this.updateApprovalLogs(filteredData, collection);
          }
          this.isLoading = false;
          this.cdr.detectChanges();
          this.cachedLogs[cacheKey] = this.approvalLogs; // Cache the logs
        },
        (error) => {
          console.error(`Error fetching approval logs for ${collection}:`, error.message);
        }
      );
    });
  }

  filterDataByCollection(collection: string, data: any[]): any[] {
    switch (collection) {
      case 'purchaseorders':
        return data.filter((item) => item.POCode?.startsWith('POIT') && item.PODate);
      case 'salesorders':
        return data.filter((item) => item.salesOrderCode?.startsWith('SOIT') && item.created);
      case 'goodsreceivednotes':
        return data.filter((item) => item.GRNCode?.startsWith('GRIT') && item.created);
      default:
        return [];
    }
  }

  updateApprovalLogs(data: any[], collectionName: string): void {
    const formattedLogs = data.map(item => this.formatApprovalMessage(item, collectionName));
    this.approvalLogs = [...this.approvalLogs, ...formattedLogs];

    // Sort logs by timestamp (newest first)
    this.approvalLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Emit the latest approval log
    if (formattedLogs.length > 0) {
      const latestLog = formattedLogs.reduce((latest, current) =>
        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      );
      this.latestApprovalLogEvent.emit(`${latestLog.timestamp}: ${latestLog.message}`);
    }

    this.cdr.detectChanges();
  }

  formatApprovalMessage(item: any, collectionName: string): Log {
    const createdBy = this.USER_MAP[item.createdBy] || 'Unknown';
    const documentCode = collectionName === 'salesorders' ? item.salesOrderCode :
                         collectionName === 'purchaseorders' ? item.POCode :
                         item.GRNCode;
    let timestamp = collectionName === 'purchaseorders'
      ? this.formatTimestamp(new Date(item.PODate).toISOString())
      : this.formatTimestamp(new Date(item.created).toISOString());

    let message = `${documentCode} got approved.`;
    if (item.approvalInfo?.status === 'Approved') {
      return { message, timestamp, createdBy, collection: collectionName };
    }

    for (let i = 0; i <= 5; i++) {
      if (item.approvalInfo?.details?.[i]?.status === 'Rejected') {
        message = `${this.USER_MAP[item.approvalInfo.details[i].userId] || 'Unknown'} rejected the document ${documentCode} created by ${createdBy}\n` +
                  `Reason: ${item.approvalInfo.details[i].remarks}`;
        break;
      }
    }
    return { message, timestamp, createdBy, collection: collectionName };
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
  }

  filterUserSuggestions(): void {
    const searchTerm = this.searchQuery.toLowerCase();
    if (!searchTerm) {
      this.userSuggestions = [];
      return;
    }
    this.userSuggestions = Object.values(this.USER_MAP).filter(user => user.toLowerCase().includes(searchTerm));
  }

  selectUser(user: string): void {
    this.selectedUser = user;
    this.searchQuery = user;
    this.userSuggestions = [];
    this.fetchApprovalLogs();
  }

  onDateChange(): void {
    this.approvalLogs = [];
    this.fetchApprovalLogs();
  }

  applyDarkModeStyles(isDarkMode: boolean): void {
    const textColor = isDarkMode ? '#ffffff' : '#333';
    const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';

    document.documentElement.style.setProperty('--text-color', textColor);
    document.documentElement.style.setProperty('--background-color', backgroundColor);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.socket.disconnect();
    clearInterval(this.fetchInterval); // Clear the fetch interval
  }
}
