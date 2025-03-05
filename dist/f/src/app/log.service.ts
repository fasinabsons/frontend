import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
interface Log {
  message: string;
  timestamp: string;
  createdBy: string;
}
@Injectable({
  providedIn: 'root',
})
export class LogService {
  logs: Log[] = []; // Holds all logs
  private approvalLogsSubject = new BehaviorSubject<Log[]>([]);
  approvalLogs$ = this.approvalLogsSubject.asObservable();
  private liveLogsSubject = new BehaviorSubject<Log[]>([]);
  liveLogs$ = this.liveLogsSubject.asObservable();

  private latestLogSubject = new BehaviorSubject<string>('Fetching latest log...');
  latestLog$ = this.latestLogSubject.asObservable();

  constructor() {}

  updateLiveLog(logs: Log[]): void {
    this.liveLogsSubject.next(logs);

    // Find the latest log
    if (logs.length > 0) {
      const latestLog = logs[0];
      this.latestLogSubject.next(`${latestLog.timestamp}: ${latestLog.message}`);
    } else {
      this.latestLogSubject.next('No logs available.');
    }
  }

updateApprovalLogs(logs: Log[]): void {
  this.approvalLogsSubject.next(logs);

  // Find the latest approval log
  if (logs.length > 0) {
    const latestLog = logs.reduce((latest, current) =>
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
    this.latestLogSubject.next(`${latestLog.timestamp}: ${latestLog.message}`);
  } else {
    this.latestLogSubject.next('No approval logs available.');
  }
}
}
