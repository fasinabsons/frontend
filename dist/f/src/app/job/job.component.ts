import { Component, Input, OnInit } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../theme.service';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-job-card',
  standalone: true,
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.scss'],
  imports: [CommonModule, FormsModule],
  providers: [ThemeService],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class JobCardComponent implements OnInit {
  @Input() jobData: any[] = [];
  selectedFields: string[] = [];
  allFields: string[] = [];
  searchQuery: string = '';
  selectedSalesOrders: string[] = [];
  availableSalesOrders: string[] = [];

  constructor(private httpClient: HttpClient, private ThemeService: ThemeService) {}

  ngOnInit(): void {
    this.fetchJobData(); // Fetch data on component load
    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }

  fetchJobData(): void {
    this.httpClient.get<{ data: any[] }>('${environment.BACKEND_URL}/fetch-collection/salesorders').subscribe(
      (response) => {
        this.jobData = response.data;
        this.allFields = this.extractFields(response.data);
        this.availableSalesOrders = [...new Set(response.data.map(order => order.salesOrderCode))]; // Unique codes
      },
      (error) => console.error('Error fetching job data:', error)
    );
  }

  extractFields(data: any[]): string[] {
    const fieldSet = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => fieldSet.add(key));
      if (item.accountDetailsTable?.totalCalculation) {
        Object.keys(item.accountDetailsTable.totalCalculation).forEach(key =>
          fieldSet.add(`accountDetailsTable.totalCalculation.${key}`)
        );
      }
      if (item.projectAccounts) {
        Object.keys(item.projectAccounts).forEach(key =>
          fieldSet.add(`projectAccounts.${key}`)
        );
      }
    });
    return Array.from(fieldSet);
  }

  isParentField(field: string): boolean {
    return field.indexOf('.') === -1;
  }

  getSubFields(field: string): string[] {
    return this.allFields.filter(subField => subField.startsWith(field + '.'));
  }

  addSalesOrder(): void {
    if (!this.searchQuery.trim()) {
      alert('Please enter a SalesOrderCode to search.');
      return;
    }

    if (!this.jobData.some(order => order.salesOrderCode === this.searchQuery)) {
      alert('SalesOrderCode not found.');
      return;
    }

    if (!this.selectedSalesOrders.includes(this.searchQuery)) {
      this.selectedSalesOrders.push(this.searchQuery);
    }

    this.searchQuery = ''; // Clear input after adding
  }

  filteredSalesOrders(): string[] {
    if (!this.searchQuery.trim()) return [];
    return this.availableSalesOrders.filter(code =>
      code.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  toggleSalesOrderSelection(code: string): void {
    if (!this.selectedSalesOrders.includes(code)) {
      this.selectedSalesOrders.push(code);
    }
    this.searchQuery = ''; // Clear search bar after selection
  }

  removeSalesOrder(code: string): void {
    this.selectedSalesOrders = this.selectedSalesOrders.filter(order => order !== code);
  }

  toggleFieldSelection(field: string): void {
    const index = this.selectedFields.indexOf(field);
    if (index > -1) {
      this.selectedFields.splice(index, 1);
    } else {
      this.selectedFields.push(field);
    }
  }

  exportToExcel(): void {
    if (this.selectedFields.length === 0) {
      alert('Please select fields to export!');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Job Card');
    const formatHeader = (field: string): string => {
      const lastPart = field.split('.').slice(-1)[0];
      return lastPart.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
    };

    const formattedHeaders = ['SalesOrderCode', ...this.selectedFields.map(formatHeader)];
    sheet.addRow(formattedHeaders);

    this.selectedSalesOrders.forEach(salesOrder => {
      const matchingOrders = this.jobData.filter(order => order.salesOrderCode === salesOrder);
      matchingOrders.forEach(order => {
        const rowData = [salesOrder, ...this.selectedFields.map(field => this.getNestedValue(order, field))];
        sheet.addRow(rowData);
      });
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'job_card.xlsx';
      a.click();
    });
  }

  getNestedValue(item: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key] ?? '—', item);
  }
}
