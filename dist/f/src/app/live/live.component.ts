import { ThemeService } from './../theme.service';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {  interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import io from 'socket.io-client';
import { LogService } from '../log.service';
import { environment } from '../../environments/environment';

interface Log {
  message: string;
  timestamp: string;
  createdBy: string;
}

@Component({
  selector: 'app-live-logs',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [LogService, ThemeService],
})
export class LiveLogsComponent implements OnInit, OnDestroy {
   // ✅ User Mapping
   USER_MAP: { [key: string]: string } = {
    '66d0358045d8874340a78a7f': 'Shekha Mendoza',
    '67766e6f565ed783bbd30718': 'Shama Mohamad Wehbe',
    '66d034b845d8874340a78a7b': 'Mostafa Sallam',
    '66d5469cf78314d6ea83862c': 'Rajesh Kuttan',
    '66def25ccccab96dcd6fa6b2': 'Saji Alhaddad',
    '66d033bb45d8874340a78a74': 'Mahmoud Dayeh'
  };
  filteredLogs: Log[] = []; // Filtered logs based on user search
  salesOrderLogs: Log[] = [];
  estimationLogs: Log[] = [];
  purchaseOrderLogs: Log[] = [];
  deliveryOrderLogs: Log[] = [];
  salesInvoicesLogs: Log[] = [];
  grnLogs: Log[] = [];
  private subscription: Subscription = new Subscription();
  isLoading: boolean = false;
  selectedDate: string = new Date().toISOString().split('T')[0];  // Default to current date
  isCurrentDay: boolean = true;
  private socket: any;
  searchQuery: string = ''; // Search input
  showFullLogs: boolean = false; // Toggle between single log and full logs
  isDarkMode = false; // ✅ Dark mode flag

  @Output() latestLogEvent = new EventEmitter<string>(); // Send latest log to dashboard
  logs: Log[] = []; // Holds all logs

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private logService : LogService, private ThemeService : ThemeService) {}

  ngOnInit(): void {
    this.fetchLogsForDate();
    this.socket = io('${environment.BACKEND_URL}');
    this.socket.on('newLog', (log: any) => {
      if (this.isCurrentDay && log.collection) {
          this.updateLogs([log], log.collection);
          if (log.collection === 'purchaseorders') {
              this.updateLogsPurchase([log], log.collection);
          }
      }
  });
    this.subscription.add(
      interval(1000000).subscribe(() => {
        if (this.isCurrentDay) {
          console.log('🔄 Refreshing logs...');
          this.fetchLogsForDate();
        }
      })
    );
    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }

  showLiveLogs: boolean = false;

  toggleLiveLogs(): void {
      this.showLiveLogs = !this.showLiveLogs;

      if (this.showLiveLogs) {
          this.fetchLogsForDate(); // ✅ Fetch logs when opening
      }
  }
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    // ...
  }

selectedUser: string = ''; // Holds the selected user
userSuggestions: string[] = []; // Filtered user suggestions

filterUserSuggestions(): void {
  const searchTerm = this.searchQuery.toLowerCase();

  if (!searchTerm) {
      this.userSuggestions = [];
      return;
  }

  this.userSuggestions = Object.values(this.USER_MAP).filter(user =>
      user.toLowerCase().includes(searchTerm)
  );
}
isFullScreen: boolean = false; // ✅ Track fullscreen mode

toggleFullScreen(): void {
    this.isFullScreen = !this.isFullScreen;
}

selectUser(user: string): void {
    this.selectedUser = user;
    this.searchQuery = user; // Fill the input with selected user
    this.userSuggestions = []; // Hide suggestions
    this.fetchLogsForDate(); // Fetch logs only for this user
}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.socket.disconnect();
  }

  fetchLogsForDate(): void {
    this.isLoading = true;
    this.isCurrentDay = this.selectedDate === new Date().toISOString().split('T')[0];

    const collections = ['salesorders', 'estimations', 'purchaseorders', 'deliveryorders', 'goodsreceivednotes', 'salesinvoices'];

    // ✅ Find user key if a user is selected
    const userKey = Object.keys(this.USER_MAP).find(key => this.USER_MAP[key] === this.selectedUser);

    collections.forEach((collection) => {
        let apiUrl = `${environment.BACKEND_URL}/fetch-logs/${collection}?selectedDate=${this.selectedDate}`;

        if (userKey) {
            apiUrl += `&createdBy=${userKey}`; // ✅ Apply user filter only when needed
        }

        this.http.get<any[]>(apiUrl).subscribe(
            (data) => {
                if (data.length > 0) {
                    collection === 'purchaseorders' ? this.updateLogsPurchase(data, collection) : this.updateLogs(data, collection);
                } else {
                    console.warn(`⚠️ No logs for ${collection} on ${this.selectedDate}.`);
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            (error) => {
                console.error(`❌ Error fetching logs for ${collection}:`, error.message);
            }
        );
    });
}

// In LiveLogsComponent
updateLogs(data: any[], collectionName: string): void {
  const userKey = Object.keys(this.USER_MAP).find(key => this.USER_MAP[key] === this.selectedUser);

  const formattedLogs: Log[] = data
    .filter((item) =>
      item.createdBy && this.USER_MAP[item.createdBy] && (!userKey || item.createdBy === userKey)
    )
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .map((item) => ({
      message: this.formatLogMessage(item, collectionName),
      timestamp: new Date(item.created).toLocaleString(),
      createdBy: item.createdBy,
    }));

  console.log(`📝 Formatted Logs:`, formattedLogs);

  // Update the LogService with the latest log
  if (formattedLogs.length > 0) {
    this.logService.updateLiveLog(formattedLogs);
  }

  // Update component-specific logs
  switch (collectionName) {
    case 'salesorders':
      this.salesOrderLogs = formattedLogs;
      break;
    case 'estimations':
      this.estimationLogs = formattedLogs;
      break;
    case 'deliveryorders':
      this.deliveryOrderLogs = formattedLogs;
      break;
    case 'goodsreceivednotes':
      this.grnLogs = formattedLogs;
      break;
    case 'salesinvoices':
      this.salesInvoicesLogs = formattedLogs;
      break;
  }
  // Ensure the latest log is always displayed first
  this.logs = [formattedLogs[0], ...formattedLogs.slice(1)];
  this.emitLatestLog(); // ✅ Emit the latest log to the dashboard
  this.cdr.detectChanges();
}

updateLogsPurchase(data: any[], collectionName: string): void {
  if (collectionName !== 'purchaseorders') return;
  const userKey = Object.keys(this.USER_MAP).find(key => this.USER_MAP[key] === this.selectedUser);
  const formattedLogs = data
    .filter((item) =>
        item.POCode && item.PODate && (!userKey || item.createdBy === userKey) // ✅ Apply user filter
    )
    .sort((a, b) => new Date(b.PODate).getTime() - new Date(a.PODate).getTime())
    .map((item) => ({
      message: this.formatLogMessage(item, collectionName),
      timestamp: new Date(item.PODate).toLocaleString(),
      createdBy: item.createdBy,
    }));

  this.purchaseOrderLogs = formattedLogs;
  this.logs = data
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by latest
  .slice(0, 1); // Keep only the latest log
  this.cdr.detectChanges();
}
emitLatestLog(): void {
  if (this.logs.length > 0) {
    let latestLog = this.logs[0];
    for (let i = 1; i < this.logs.length; i++) {
      if (new Date(this.logs[i].timestamp) > new Date(latestLog.timestamp)) {
        latestLog = this.logs[i];
      }
    }
    this.latestLogEvent.emit(`${latestLog.timestamp}: ${latestLog.message}`);
  }
}

formatLogMessage(item: any, collectionName: string): string {
  const createdBy = item.createdBy ? this.USER_MAP[item.createdBy] || 'Unknown' : 'Unknown';
  const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown Time';

  switch (collectionName) {
    case 'salesorders':
      return `${createdBy} made a Sales Order: ${item.salesOrderCode || 'N/A'} of type: ${item.salesOrderType || 'N/A'} For ${item.customerName || 'N/A'} with a net amount: ${Number(item.accountDetailsTable?.totalCalculation?.netAmount || 0).toLocaleString()}, Sales Order is now ${item.status || 'N/A'}`;
    case 'estimations':
      return `${createdBy} made an estimation: ${item.estimationCode || 'N/A'} worth ${Number(item.accountDetailsTable?.currentTotal || 0).toLocaleString()}, estimation is now ${item.status || 'N/A'}`;
    case 'purchaseorders':
      return `${createdBy} made a Purchase Order: ${item.POCode || 'N/A'} worth ${Number(item.accountDetailsTable?.currentTotal || 0).toLocaleString()} to ${item.supplierName || 'N/A'}, Purchase Order is now ${item.POStatus || 'N/A'}`;
    case 'deliveryorders':
      return `${createdBy} made a Delivery Order: ${item.DOCode || 'N/A'} worth ${Number(item.details?.[0]?.netAmount || 0).toLocaleString()}, Delivery Order is now ${item.status || 'N/A'}`;
    case 'goodsreceivednotes':
      return `${createdBy} made a GRN: ${item.GRNCode || 'N/A'} of ${Number(item.accountDetailsTable?.currentTotal || 0).toLocaleString()}, GRN is now ${item.status || 'N/A'}`;
    case 'salesinvoices':
      return `${createdBy} made a Sales Invoice: ${item.SICode || 'N/A'} of ${Number(item.accountDetailsTable?.currentTotal || 0).toLocaleString()}, Sales Invoice is now ${item.status || 'N/A'}`;
    default:
      return `${createdBy} performed an action at ${timestamp}.`;
  }
}

  filterLogs(): void {
    const userKey = Object.keys(this.USER_MAP).find(key => this.USER_MAP[key] === this.selectedUser);

    // ✅ Apply filtering directly to logs
    const filterByUser = (log: Log) => !userKey || log.createdBy === userKey;

    this.salesOrderLogs = this.salesOrderLogs.filter(filterByUser);
    this.estimationLogs = this.estimationLogs.filter(filterByUser);
    this.purchaseOrderLogs = this.purchaseOrderLogs.filter(filterByUser);
    this.deliveryOrderLogs = this.deliveryOrderLogs.filter(filterByUser);
    this.grnLogs = this.grnLogs.filter(filterByUser);
    this.salesInvoicesLogs = this.salesInvoicesLogs.filter(filterByUser);

}

onDateChange(): void {
  this.salesOrderLogs = [];
  this.estimationLogs = [];
  this.purchaseOrderLogs = [];
  this.deliveryOrderLogs = [];
  this.grnLogs = [];
  this.salesInvoicesLogs = [];

  this.fetchLogsForDate(); // ✅ Ensure user filter is applied during fetching

}

}
