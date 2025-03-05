import { ThemeService } from './../theme.service';
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import { HttpClient } from '@angular/common/http';
import { ViewEncapsulation } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-item-list',
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.ShadowDom
})

export class ItemListComponent implements OnInit {
  @Input() data: any[] = []; // Data passed from AppComponent
  searchQuery: string = ''; // For searching items
  searchField: string = ''; // Field selected for searching
  currentPage: number = 1;
  itemsPerPage: number = 40;
  availableFields: string[] = []; // Available fields for search filter
  savedEntries: any[] = []; // Array to store selected entries for Excel file
  excelData: any[] = []; // Array to hold the added data for the Excel file
  selectedEntries: any[] = []; // Array to store selected entries using checkboxes
  showDetails: boolean = false; // Flag to control visibility of selected entry details
  selectedEntryDetails: any = null; // Store details of the selected entry to show
  @Input() nestedData: any;
  @Input() collections: any[] = [];
  @Input() selectedFilters: any = {};
  getParentKeys(): string[] {
    return Object.keys(this.nestedData || {});
  }
  // ✅ User Mapping
  USER_MAP: { [key: string]: string } = {
    '66d0358045d8874340a78a7f': 'Shekha Mendoza',
    '67766e6f565ed783bbd30718': 'Shama Mohamad Wehbe',
    '66d034b845d8874340a78a7b': 'Mostafa Sallam',
    '66d5469cf78314d6ea83862c': 'Rajesh Kuttan',
    '66def25ccccab96dcd6fa6b2': 'Saji Alhaddad',
    '66d033bb45d8874340a78a74': 'Mahmoud Dayeh'
  };

// Function to get the user name from the hash value
getUserName(hashValue: string): string {
  return this.USER_MAP[hashValue] || 'Unknown User';
}

  toggleSelection(collection: string, subDoc: string) {
    if (!this.selectedFilters[collection]) {
      this.selectedFilters[collection] = [];
    }
    const index = this.selectedFilters[collection].indexOf(subDoc);
    if (index > -1) {
      this.selectedFilters[collection].splice(index, 1);
    } else {
      this.selectedFilters[collection].push(subDoc);
    }
  }

  constructor(private httpClient: HttpClient, private ThemeService:ThemeService) { }
  // ✅ Get total entries based on filtered data
  get totalEntries(): number {
    return this.filteredData.length; // Return the length of the filtered data
  }

  ngOnInit(): void {
    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
    // Initialize available fields (assuming data is passed with fields)
    if (this.data && this.data.length > 0) {
      this.availableFields = Object.keys(this.data[0]);
    }
    // Populate nested data
    this.nestedData = {};
    this.data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === 'object' && item[key] !== null) {
          this.nestedData[key] = Object.keys(item[key]);
        }
      });
    });
    console.log('Nested data received in ItemListComponent:', this.nestedData);
    this.fetchFilteredData(); // ✅ Fetch latest change-data on load
    this.initializeAvailableFields();
    this.initializeNestedData();
    this.fetchFilteredData();
  }
  initializeAvailableFields(): void {
    if (this.data.length > 0) {
      this.availableFields = Object.keys(this.data[0]);
    }
  }

  initializeNestedData(): void {
    this.nestedData = {};
    this.data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === 'object' && item[key] !== null) {
          this.nestedData[key] = Object.keys(item[key]);
        }
      });
    });
  }

  // ✅ Get total pages based on filtered data
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }
  // ✅ Get all possible keys across filtered data (even empty ones)
  getObjectKeys(): string[] {
    const allKeys = new Set<string>();

    this.filteredData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    return Array.from(allKeys);
  }

// ✅ Get the entry details for display
  getEntryDetails(key: string): any {
    return { [key]: this.selectedEntryDetails[key] };
  }

  // 🟢 Fetch filtered data from change-data
  fetchFilteredData(): void {
    if (this.collections && this.collections.length > 0) {
      const collectionName = this.collections[0]; // Use the first collection name
      this.httpClient.get<{ filteredData: any[] }>(`${environment.BACKEND_URL}/get-filtered-data/${collectionName}`).subscribe(
        (data: { filteredData: any[] }) => {
          if (data && data.filteredData.length > 0) {
            this.data = data?.filteredData || [];
            console.log('Updated item-list with filtered data:', this.data);
          } else {
            console.warn('No filtered data found in change-data.');
          }
        },
        (error: any) => console.error('Error fetching filtered data:', error)
      );
    } else {
      console.error('No collections found.');
    }
  }
  // ✅ Fetch filtered data without search dependency
  get filteredData(): any[] {
    if (!this.searchQuery) return this.data;
    return this.data.filter(item =>
      Object.keys(item).some(key =>
        (item[key] || '').toString().toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    );
  }
  jumpToPage(itemIndex: number): void {
    this.currentPage = Math.ceil((itemIndex + 1) / this.itemsPerPage); // Calculate the page number
  }
  // ✅ Check if the field value is an exact match
  isExactMatch(fieldValue: any, query: string): boolean {
    if (!fieldValue) return false;

    const match = fieldValue.toString().toLowerCase() === query.toLowerCase();
    if (match) {
      const index = this.data.findIndex((item) => item[this.searchField] === fieldValue);
      if (index >= 0) {
        this.jumpToPage(index); // Jump to the page containing the match
      }
    }
    return match;
  }
  // ✅ Check if the field value is a partial match
get paginatedData(): any[] {
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
}
  // Change page on pagination button click
  changePage(action: 'next' | 'prev'): void {
    if (action === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    } else if (action === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    }
  }
// ✅ Allow multiple entries in the Excel list
addEntryToExcel(): void {
  const selectedItems = this.filteredData.filter(item => item.selected);

  if (!selectedItems.length) {
      alert("Please select items before adding.");
      return;
  }

  // ✅ Push all selected items (even if they already exist in excelData)
  selectedItems.forEach(item => {
      this.excelData.push({ ...item, selected: undefined });
  });

  console.log(`✅ Added ${selectedItems.length} items to Excel data.`);
}
getNestedValue(item: any, parentKey: string, childKey: string): any {
  return item[parentKey]?.[childKey] ?? '—';
}

removedCount = 0;
 // ✅ Remove selected entries from Excel
 removeEntryFromExcel(): void {
  const selectedIds = this.filteredData.filter(item => item.selected).map(item => item.salesOrderCode);
  if (!selectedIds.length) {
    alert("Please select items to remove.");
    return;
  }
  this.removedCount += selectedIds.length;
  this.excelData = this.excelData.filter(item => !selectedIds.includes(item.salesOrderCode));
  this.filteredData.forEach(item => {
    if (item.selected) item.selected = false;
  });
  console.log(`✅ Removed ${selectedIds.length} items.`);
}
selectedPrimaryKey: string = ''; // Holds the selected primary key

saveAsExcel(): void {
  if (!this.selectedPrimaryKey) {
      alert("Please select a Primary Key before exporting.");
      return;
  }
  const workbook = new ExcelJS.Workbook();
  // 🟢 Main Data Sheet (Without Nested Fields)
  const mainSheet = workbook.addWorksheet('Main Data');
  const mainData = this.excelData.map(entry => {
      const copy = { ...entry };
      Object.keys(copy).forEach(key => {
          if (typeof copy[key] === 'object') {
              delete copy[key]; // Remove nested fields
          }else if (this.USER_MAP[copy[key]]) {
            copy[key] = this.USER_MAP[copy[key]]; // Swap hash value with name
          }
      });
      return copy;
  });

  this.addDataToSheet(mainSheet, mainData);
  // 🟢 Create a separate sheet for each Parent Document
  const parentDocuments = new Set<string>();

  this.excelData.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
              parentDocuments.add(key);
          }
      });
  });
  parentDocuments.forEach((parentDocument) => {
      const sheet = workbook.addWorksheet(parentDocument);
      // Get all unique keys from all sub-documents
      const subDocumentKeys: Set<string> = new Set();
      this.excelData.forEach((entry) => {
     if (entry[parentDocument] && typeof entry[parentDocument] === 'object') {
      Object.keys(entry[parentDocument]).forEach((key) => subDocumentKeys.add(key));
  }
});

// Add headers
sheet.addRow(['Primary Key', ...Array.from(subDocumentKeys)]);

    this.excelData.forEach((entry) => {
    if (entry[parentDocument] && typeof entry[parentDocument] === 'object') {
    const rowValues: any[] = [entry[this.selectedPrimaryKey] || 'N/A'];
    Array.from(subDocumentKeys).forEach((key) => {
      const value = entry[parentDocument][key];
      if (this.USER_MAP[value]) {
        rowValues.push(this.USER_MAP[value]); // Swap hash value with name
      } else {
        rowValues.push(value);
      }
    });
    sheet.addRow(rowValues);
      }
      });
  });
  // 🟢 Generate and Download Excel File
  workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'filtered-data.xlsx';
      a.click();
  });
}
private addDataToSheet(sheet: ExcelJS.Worksheet, data: any[]): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  sheet.addRow(headers);

  data.forEach((row) => {
    const rowData = headers.map((header) => {
      const cellValue = row[header];
      return typeof cellValue === 'object' ? JSON.stringify(cellValue) : cellValue;
    });
    sheet.addRow(rowData);
  });
  // Set column widths to fit content
  sheet.columns.forEach((column: Partial<ExcelJS.Column> | undefined) => {
    if (column && column.values) {
      const values = column.values.slice(1).map((value) => (value ? value.toString().length : 10));
      column.width = Math.max(...values) + 2; // Add some padding
    }
  });
}
// ✅ Improved View Details with a properly formatted and readable table
viewDetails(item: any): void {
  if (!item) return; // Prevent errors

  this.selectedEntryDetails = { ...item };
  this.showDetails = true;

  // ✅ Ensure primary key is set correctly
  this.selectedPrimaryKey = this.selectedPrimaryKey || Object.keys(item)[0];

  // ✅ Convert object into a structured format including sub-documents
  this.selectedEntryDetails.nestedEntries = this.flattenObject(item);

  // ✅ Replace user IDs with actual names
   this.selectedEntryDetails.nestedEntries.forEach((entry: any) => {
    if (entry.value in this.USER_MAP) {
      entry.value = this.USER_MAP[entry.value];
    }
  });

  // ✅ Initialize expanded state for each entry
  this.expandedState = {};
}
// ✅ Track expanded states for each entry
expandedState: { [key: string]: boolean } = {};

// ✅ Toggle expansion state
toggleExpand(key: string): void {
  this.expandedState[key] = !this.expandedState[key];
}
// ✅ Function to filter nested entries based on parent key
getSubEntries(parentKey: string): any[] {
  return this.selectedEntryDetails.nestedEntries.filter((e: any) => e.key.startsWith(parentKey + ' >'));
}

// ✅ Extract all key-value pairs including sub-sub-documents
private flattenObject(obj: any, parentKey: string = ''): any[] {
  let result: any[] = [];

  Object.entries(obj).forEach(([key, value]) => {
    let fullKey = parentKey ? `${parentKey} > ${key}` : key;

    if (typeof value === 'object' && value !== null) {
      // Push the actual values of the sub-object
      result = result.concat(this.flattenObject(value, fullKey));
    } else {
      result.push({ key: fullKey, value });
    }
  });

  return result;
}
// ✅ Properly format hierarchical data for display
formatNestedTable(entries: any[]): string {
  if (!entries || entries.length === 0) return '';

  return entries.map(({ key, value }) => `${key}: ${value}`).join('\n');
}
// ✅ Save as CSV Function
saveAsCSV(): void {
  let csvData = 'Key,Value\n';

  // ✅ Recursively extract all values, replacing "Click to Expand" with actual values
  const extractValues = (entries: any[], parentKey: string = '') => {
    entries.forEach((entry) => {
      let fullKey = parentKey ? `${parentKey} > ${entry.key}` : entry.key;

      if (entry.isExpandable) {
        extractValues(this.getSubEntries(entry.key), fullKey); // Recursively expand
      } else {
        csvData += `"${fullKey}","${entry.value}"\n`;
      }
    });
  };

  extractValues(this.selectedEntryDetails.nestedEntries);

  // ✅ Create and Download CSV File
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'document-details.csv');
  a.click();
}
// ✅ Close the details modal
closeDetails(): void {
  this.showDetails = false;
  this.selectedEntryDetails = null;
}
  toggleAllCheckboxes(event: any): void {
    const isChecked = event.target.checked;
    this.filteredData.forEach(item => {
      item.selected = isChecked;
    });
  }

}
