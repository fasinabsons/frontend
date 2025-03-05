import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemListComponent } from './item-list/item-list.component';
import { Subscription } from 'rxjs';
import { FooterComponent } from './footer/footer.component';
import { RouterModule } from '@angular/router';
import { ThemeService } from './theme.service';
import { ViewEncapsulation } from '@angular/core';
import { environment } from '../environments/environment';
interface FilteredItem {
  [key: string]: any;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [CommonModule, FormsModule,
  ItemListComponent,
  FooterComponent,
  RouterModule,
],
  providers: [ThemeService],
  encapsulation: ViewEncapsulation.ShadowDom
})

export class AppComponent implements OnInit {
  collectionName: string | null = null; // Holds the collection name entered by the user
  localData: any[] = []; // Stores the local data fetched from backend or local storage
  filteredData: any[] = []; // Stores the data after applying filters
  selectedFields: string[] = []; // List of fields selected by the user for filtering
  availableFields: string[] = []; // Holds the fields available for filtering from the data
  showFetchButton: boolean = true; // Flag to show or hide the "Fetch Data" button
  showFilterAndUpdateButtons: boolean = false; // Flag to show or hide filter and update buttons
  isSelected: { [key: string]: boolean } = {}; // Tracks field selection state
  fetchComplete: boolean = false; // Flag to indicate if data fetch is complete

  showFilterOptions: boolean = true; // Controls visibility for filter options

  nestedData: Record<string, any> = {}; // To hold nested fields categorized by parent
  selectedParentDocument: string | null = null; // Holds the selected parent document
  nestedSelectedFields: { [key: string]: string[] } = {}; // Tracks
  selectedSubFields: string[] = []; // Tracks subfields selected by the user
  private subscriptions: Subscription[] = [];
  systemLogs: any[] = [];// Holds the system logs

  // Define the user mapping object
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
  @Output() nestedDataSelected: EventEmitter<any> = new EventEmitter(); // Emits nested data

constructor(private http: HttpClient, private themeService: ThemeService) {}
private socket!: WebSocket;

  ngOnInit(): void {
    this.collectionName = localStorage.getItem('collectionName');
    this.loadFilterSelections();
    this.fetchData();
    this.applyFilters();
    this.listenToLiveLogs();
    this.fetchSavedLogs();
    this.themeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
  // ✅ Listen to Live Logs via WebSockets
  listenToLiveLogs(): void {
    this.socket = new WebSocket('ws://localhost:4000');

    this.socket.onmessage = event => {
      const log = JSON.parse(event.data);
      this.systemLogs.unshift(log);
      if (this.systemLogs.length > 30) this.systemLogs.pop(); // Keep UI performant
    };
  }

  // ✅ Fetch Saved Logs
  fetchSavedLogs(): void {
    this.http.get<any[]>('${environment.BACKEND_URL}/get-system-logs')
      .subscribe(logs => this.systemLogs = logs || []);
  }

  // ✅ Download Logs
  downloadLogs(): void {
    window.open('${environment.BACKEND_URL}/download-logs/csv', '_blank');
  }

  getParentKeys(): string[] {
    return Object.keys(this.nestedData || {});
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  fetchData(): void {
    if (!this.collectionName) {
      console.warn('Collection name is required.');
      return;
    }

    this.http.get<any[]>(`${environment.BACKEND_URL}/get-local-data/${this.collectionName}`).subscribe(
      (data) => {
        if (data && data.length > 0) {
          this.localData = data;
          this.filteredData = [...this.localData];
          this.availableFields = this.extractFieldsFromCollection(data);
          this.showFetchButton = false;
          this.systemLogs = []; // Clear logs
          this.showFilterAndUpdateButtons = true;
          this.loadFilterSelections();
          console.log('Data fetched successfully.');
          this.fetchComplete = true; // Indicate data fetch completion
        } else {
          console.warn('No local data found. Fetching from backend...');
          this.fetchDataFromBackend();
        }
      },
      (error) => {
        console.error('Error fetching local data:', error);
        this.fetchDataFromBackend();
      }
    );
    this.applyFilters(); // 🟢 Apply filters instantly
    this.loadFilterSelections(); // 🟢 Load filter selections
  }

  // Fetch data from the backend
  private fetchDataFromBackend(): void {
    this.http.get<any[]>(`${environment.BACKEND_URL}/fetch-collection/${this.collectionName}`).subscribe(
      (response) => {
        if (response && response.length > 0) {
          this.localData = response;
          this.filteredData = [...this.localData];
          this.availableFields = this.extractFieldsFromCollection(response); // Extract all fields from the collection
          this.showFetchButton = false;
          this.showFilterAndUpdateButtons = true;
          this.showFilterOptions = true; // to show filter options
          this.loadFilterSelections();
        } else {
          console.warn('No data received from backend.');
        }
      },
      (error) => {
        console.error('Error fetching data from backend:', error);
      }
    );
  }
  // Extract fields from a collection of data
  private extractFieldsFromCollection(data: any[]): string[] {
    const fields: Set<string> = new Set();

    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === 'object' && item[key] !== null) {
          // Handle nested fields
          this.nestedData[key] = Object.keys(item[key]);
        } else {
          fields.add(key);
        }
      });
    });

    return Array.from(fields);
  }

  // Fetch a nested value from an object
 getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
 }

 getNestedDataForTable(parentDocument: string): { key: string; value: any }[] {
  const nestedKeys = this.nestedData[parentDocument] || [];
  return nestedKeys.map((key: string) => ({
    key,
    value: this.filteredData.map((item) =>
      this.getNestedValue(item[parentDocument], key)
    ),
  }));
}
// ✅ More precise filtering of selected fields and nested fields
filterData(): void {
  if (!this.localData || this.localData.length === 0) {
      return;
  }

  if (this.selectedFields.length === 0 && Object.keys(this.nestedSelectedFields).length === 0) {
      alert('Please select at least one field or sub-document.');
      return;
  }

  this.filteredData = this.localData.map((item) => {
      const filteredItem: { [key: string]: any } = {};

      this.selectedFields.forEach((field) => {
          if (item.hasOwnProperty(field)) {
              filteredItem[field] = item[field];
          }
      });

      Object.entries(this.nestedSelectedFields).forEach(([parentDocument, subFields]) => {
          if (item[parentDocument] && subFields.length > 0) {
              filteredItem[parentDocument] = {};
              subFields.forEach((subField) => {
                  if (item[parentDocument].hasOwnProperty(subField)) {
                      filteredItem[parentDocument][subField] = item[parentDocument][subField];
                  }
              });
          }
      });

      return Object.keys(filteredItem).length > 0 ? filteredItem : null;
  }).filter((item) => item !== null);

  console.log('Filtered data updated:', this.filteredData);
  this.saveFilteredData();
  this.updateTableView();
}

// Handle parent document selection
toggleParentDocumentSelection(parentDocument: string): void {
  this.selectedParentDocument = parentDocument;

  // Initialize sub-document fields only if not present
  if (!this.nestedSelectedFields[parentDocument]) {
    this.nestedSelectedFields[parentDocument] = [];
  }

  this.saveFilterSelections();
}

  // Load saved filter selections
loadFilterSelections(): void {
  if (!this.collectionName) return;

  // Fetch from backend first
  this.http.get<{ selectedFields: string[]; nestedSelectedFields: { [key: string]: string[] } }>(
    `${environment.BACKEND_URL}/load-filter-selections/${this.collectionName}`
  ).subscribe(
    (response) => {
      this.selectedFields = response.selectedFields || [];
      this.nestedSelectedFields = response.nestedSelectedFields || {};
      localStorage.setItem(`filter-selections-${this.collectionName}`, JSON.stringify(response));
    },
    (error) => {
      console.error('Error loading filter selections from backend:', error);

      // Fallback to local storage if backend fails
      const savedFilters = localStorage.getItem(`filter-selections-${this.collectionName}`);
      if (savedFilters) {
        const { selectedFields, nestedSelectedFields } = JSON.parse(savedFilters);
        this.selectedFields = selectedFields || [];
        this.nestedSelectedFields = nestedSelectedFields || {};
      }
    }
  );
  this.applyFilters(); // 🟢 Apply filters instantly
}
// ✅ Restore filter selections on load
restoreFilterSelections(): void {
  const savedFields = localStorage.getItem('selectedFields');
  const savedNestedFields = localStorage.getItem('nestedSelectedFields');

  if (savedFields) this.selectedFields = JSON.parse(savedFields);
  if (savedNestedFields) this.nestedSelectedFields = JSON.parse(savedNestedFields);

  this.applyFilters();
}

// Save filter selections
saveFilterSelections(): void {
  if (!this.collectionName) {
    console.error('Collection name is required to save filter selections.');
    return;
  }

  const filterData = {
    selectedFields: this.selectedFields,
    nestedSelectedFields: this.nestedSelectedFields,
  };

  // Save to backend
  this.http.post(`${environment.BACKEND_URL}/save-filter-selections/${this.collectionName}`, filterData).subscribe(
    () => console.log('Filter selections saved successfully.'),
    (error) => console.error('Error saving filter selections:', error)
  );

  // Save to local storage
  localStorage.setItem(`filter-selections-${this.collectionName}`, JSON.stringify(filterData));
}

toggleFieldSelection(field: string, event: Event, parentDocument?: string): void {
  const target = event.target as HTMLInputElement;
  if (!target) return;

  const isChecked = target.checked;

  if (parentDocument) {
      if (!this.nestedSelectedFields[parentDocument]) {
          this.nestedSelectedFields[parentDocument] = [];
      }

      if (isChecked) {
          if (!this.nestedSelectedFields[parentDocument].includes(field)) {
              this.nestedSelectedFields[parentDocument].push(field);
          }
      } else {
          this.nestedSelectedFields[parentDocument] = this.nestedSelectedFields[parentDocument].filter(f => f !== field);
          if (this.nestedSelectedFields[parentDocument].length === 0) {
              delete this.nestedSelectedFields[parentDocument];
          }
      }
  } else {
      if (isChecked) {
          if (!this.selectedFields.includes(field)) {
              this.selectedFields.push(field);
          }
      } else {
          this.selectedFields = this.selectedFields.filter(f => f !== field);
      }
  }

  this.saveFilterSelections(); // Persist selection state
  this.applyFilters(); // 🟢 Instantly apply filters
}


getParentDocument(field: string): string | null {
  for (const parentDocument in this.nestedData) {
    if (this.nestedData[parentDocument].includes(field)) {
      return parentDocument;
    }
  }
  return null;
}

  // Update backend data (if required)
  updateBackend(): void {
    if (!this.collectionName) {
        console.warn('Please enter a collection name.');
        return;
    }

    console.log('Updating backend data for:', this.collectionName);

    // Fetch fresh data from MongoDB and save to local-data
    this.http.get<any>(`${environment.BACKEND_URL}/fetch-collection/${this.collectionName}`).subscribe(
        (response) => {
            console.log('Backend data updated:', response.data);
            this.fetchData(); // 🟢 Refresh local-data
            setTimeout(() => {
                this.applyFilters(); // 🟢 Apply filters immediately
            }, 1000); // Give time to update
        },
        (error) => console.error('Error updating backend:', error)
    );
}

// Apply filters after updating data
applyFilters(): void {
    this.filterData();
    this.saveFilteredData();
    this.updateTableView();
}
// ✅ Ensure table updates instantly
updateTableView(): void {
  this.filteredData = [...this.filteredData];
}


//Save the filetered data to the change-data folder
saveFilteredData(): void {
  if (!this.collectionName) {
    return;
  }

  if (!this.filteredData || this.filteredData.length === 0) {
    return;
  }

  const filteredNestedSelectedFields: { [key: string]: string[] } = {};
  Object.keys(this.nestedSelectedFields).forEach((parentDocument: string) => {
    if (this.nestedSelectedFields[parentDocument].length > 0) {
      filteredNestedSelectedFields[parentDocument] = this.nestedSelectedFields[parentDocument];
    }
  });

  const documentPayload = {
    filteredData: this.filteredData.map((item: any) => {
      const filteredItem: { [key: string]: any } = {};

      this.selectedFields.forEach((field: string) => {
        if (item[field] !== undefined) {
          filteredItem[field] = item[field];
        }
      });
      nestedSelectedFields: this.nestedSelectedFields

      Object.keys(filteredNestedSelectedFields).forEach((parentDocument: string) => {
        const parentData = item[parentDocument];
        if (parentData) {
          const nestedFilteredItem: { [key: string]: any } = {};
          filteredNestedSelectedFields[parentDocument].forEach((subField: string) => {
            nestedFilteredItem[subField] = parentData[subField];
          });
          filteredItem[parentDocument] = nestedFilteredItem;
        }
      });

      return filteredItem;
    }),
    selectedFields: this.selectedFields,
    nestedSelectedFields: filteredNestedSelectedFields,
  };
  localStorage.setItem('selectedFields', JSON.stringify(this.selectedFields));
  localStorage.setItem('nestedSelectedFields', JSON.stringify(this.nestedSelectedFields));
  // Save document data in Change-Data Folder
  this.http.post(`${environment.BACKEND_URL}/save-filter-data/${this.collectionName}`, documentPayload).subscribe(
    () => console.log('Filtered document data saved successfully!'),
    (error) => console.error('Error saving filtered document data:', error)
  );
}
// ✅ Fetch data from change-data & update table in real-time
fetchFilteredData(): void {
  this.http.get<{ filteredData: any[] }>(`${environment.BACKEND_URL}/get-filtered-data/${this.collectionName}`).subscribe(
    (data) => {
      if (data?.filteredData?.length) {
        this.filteredData = data.filteredData;
        console.log('Updated item-list with filtered data:', this.filteredData);
      } else {
        console.warn('No filtered data found.');
        this.filteredData = [];
      }
    },
    (error) => console.error('Error fetching filtered data:', error)
  );
}
// ✅ Select All Nested Fields for a Parent Document
selectAllFields(parentDocument?: string): void {
  if (parentDocument) {
    if (this.nestedData[parentDocument]) {
      this.nestedSelectedFields[parentDocument] = [...this.nestedData[parentDocument]];
    }
  } else {
    // Select all fields for the main document
    this.selectedFields = [...this.availableFields];
  }
  this.saveFilterSelections();
  this.applyFilters();
}

// ✅ Clear All Nested Fields for a Parent Document
clearAllFields(parentDocument?: string): void {
  if (parentDocument) {
    if (this.nestedSelectedFields[parentDocument]) {
      this.nestedSelectedFields[parentDocument] = [];
    }
  } else {
    // Clear all fields for the main document
    this.selectedFields = [];
  }
  this.saveFilterSelections();
  this.applyFilters();
}

dropdowns: { [key: string]: boolean } = {};

toggleDropdown(parentDocument: string): void {
  this.dropdowns[parentDocument] = !this.dropdowns[parentDocument];
}

}
