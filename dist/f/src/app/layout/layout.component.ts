import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuComponent } from '../menu/menu.component';
import { HeaderComponent } from '../header/header.component';


@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [CommonModule, RouterModule, MenuComponent, HeaderComponent]
})
export class LayoutComponent {
  isDarkMode = false;
  constructor() {
    console.log("✅ LayoutComponent Loaded");
  }
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem('darkMode', this.isDarkMode ? 'enabled' : 'disabled');
  }
  ngOnInit() {
    const darkModeSetting = localStorage.getItem('darkMode');
    this.isDarkMode = darkModeSetting === 'enabled';
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }


}
