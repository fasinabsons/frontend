import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private isDarkMode: boolean = false;
  private darkModeSubject = new BehaviorSubject<boolean>(this.isDarkMode);
  isDarkMode$ = this.darkModeSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadDarkMode();
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    this.darkModeSubject.next(this.isDarkMode); // Notify subscribers

    // Save preference to backend and localStorage
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.http.post('/save-dark-mode', { isDarkMode: this.isDarkMode }).subscribe(
      () => console.log('Dark mode setting saved.'),
      (error) => console.error('Error saving dark mode:', error)
    );
  }

  loadDarkMode(): void {
    const localSetting = localStorage.getItem('darkMode');
    if (localSetting !== null) {
      this.isDarkMode = localSetting === 'true';
      this.applyTheme();
      this.darkModeSubject.next(this.isDarkMode);
      return;
    }

    this.http.get<{ isDarkMode: boolean }>('/load-dark-mode').subscribe(
      (response) => {
        this.isDarkMode = response.isDarkMode;
        this.applyTheme();
        this.darkModeSubject.next(this.isDarkMode);
      },
      (error) => console.error('Error loading dark mode:', error)
    );
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-theme', !this.isDarkMode);
  }
}
