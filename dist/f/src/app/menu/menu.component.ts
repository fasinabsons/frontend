import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../theme.service';


@Component({
  selector: 'mymenu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],

})
export class MenuComponent {
  isCollapsed = false;
  constructor(private ThemeService: ThemeService) {}
  ngOnInit(): void {
    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }


  menuItems = [
    { label: 'Dashboard', icon: 'fa-tachometer-alt', route: '/dashboard' },
    { label: 'Live Logs', icon: 'fa-chart-line', route: '/live-logs' },
    { label: 'Job Card', icon: 'fa-print', route: '/job-card' },
    { label: 'Approval Logs', icon: 'fa-file-alt', route: '/approval-logs' },
    { label: 'Forecast', icon: 'fa-chart-bar', route: '/forecast' },
    { label: 'Sales Flow', icon: 'fa-handshake', route: '/sales-flow' },
    { label: 'collections', icon: 'fa-search', route: '/collections' },

  ];

  toggleMenu() {
    this.isCollapsed = !this.isCollapsed;
    document.body.classList.toggle('menu-collapsed');
  }

  navigateAndCollapse() {
    this.isCollapsed = true; // Hide menu after click
  }
}
