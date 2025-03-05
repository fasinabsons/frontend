import { ThemeService } from './../theme.service';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { ViewEncapsulation } from '@angular/core';
import { environment } from '../../environments/environment';

// ✅ Ranking interface
interface Ranking {
  user: string;
  value: number;
  percentage: string;
  count: number;
}

// ✅ Metrics structure
interface MetricsAbsons {
  opportunities: {
    total: number;
    open: number;
    closed: number;
    cancelled: number;
    rankings: Ranking[];
    profit: number;
    selling: number;
    cost: number;
  };
  salesorders: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    docreated:number;
    estimatedNet: number;
    count: number;
  };
  estimations: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    count: number;
  };
  purchaseorders: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    count: number;
  };
  deliveryorders: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    count: number;
  };
  salesinvoices: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    count: number;
  }
  goodsreceivednotes: {
    total: number;
    rankings: Ranking[];
    open: number;
    closed: number;
    cancelled: number;
    count: number;
  }
  // ✅ Updated userTotals structure (No errors, No doubling)
userTotals: {
  [userName: string]: {
    estimations: number;
    salesorders: number;
    deliveryorders: number;
    purchaseorders: number;
    salesinvoices:number;
    goodsreceivednotes: number;
    totalcount: number;
  };
};
}

// ✅ Collection structure for filtering data
interface Collection {
  name: string;
  documents: { name: string; prefix?: string | string[] }[];
}

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
})
export class LogsComponent implements OnInit {
  // ✅ User Mapping
  USER_MAP: { [key: string]: string } = {
    '66d0358045d8874340a78a7f': 'Shekha Mendoza',
    '67766e6f565ed783bbd30718': 'Shama Mohamad Wehbe',
    '66d034b845d8874340a78a7b': 'Mostafa Sallam',
    '66d5469cf78314d6ea83862c': 'Rajesh Kuttan'
  };

   // ✅ Metrics for tracking totals
   metricsabsons: MetricsAbsons = {
    opportunities: { total: 0, open: 0, closed: 0, cancelled: 0, rankings: [], profit: 0, selling: 0, cost: 0 },
    salesorders: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, estimatedNet: 0, count: 0, docreated: 0 },
    estimations: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, count: 0 },
    purchaseorders: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, count: 0 },
    deliveryorders: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, count: 0 },
    salesinvoices: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, count: 0 },
    goodsreceivednotes: { total: 0, rankings: [], open: 0, closed: 0, cancelled: 0, count: 0 },
    userTotals: {},
  };
  // ✅ Ensure userTotals always exists before modifying
  initializeUserTotals(): void {
    Object.keys(this.USER_MAP).forEach(userId => {
      const userName = this.USER_MAP[userId];
      if (!this.metricsabsons.userTotals[userName]) {
        this.metricsabsons.userTotals[userName] = {
          estimations: 0,
          salesorders: 0,
          deliveryorders: 0,
          purchaseorders: 0,
          salesinvoices: 0,
          goodsreceivednotes: 0,
          totalcount: 0,
        };
      }
    });
  }
  isExpanded: { [key: string]: boolean } = {};
  isUpdating: boolean = false;
  isRefreshing: boolean = false;
  private subscription: Subscription = new Subscription();
  isDarkMode = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private ThemeService: ThemeService) {}

  ngOnInit(): void {
    this.initializeUserTotals();
    this.fetchDataAbsons();
    this.subscription.add(
      interval(30000).subscribe(() => this.fetchDataAbsons())
    );
    this.ThemeService.isDarkMode$.subscribe((isDarkMode) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }

  toggleSection(section: string): void {
    this.isExpanded[section] = !this.isExpanded[section];
  }


  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ✅ Define collections to fetch and filter
  readonly collections: Collection[] = [
    { name: 'opportunities', documents: [{ name: 'opportunityCode', prefix: 'OPIT' }, { name: 'status' }, { name: 'selling' }, { name: 'cost' }] },
    { name: 'salesorders', documents: [{ name: 'salesOrderCode', prefix: 'SOIT' }, { name: 'status' }, { name: 'createdBy' }, { name: 'accountDetailsTable' }] },
    { name: 'estimations', documents: [{ name: 'estimationCode', prefix: ['PEIT', 'BDIT'] }, { name: 'status' }, { name: 'createdBy' }, { name: 'accountDetailsTable' }] },
	{ name: 'purchaseorders', documents: [{ name: 'POCode', prefix: 'POIT' }, { name: 'POStatus' }, { name: 'createdBy' }, { name: 'accountDetailsTable' }] },
	{ name: 'deliveryorders', documents: [{ name: 'DOCode', prefix: 'DNIT' }, { name: 'status' }, { name: 'createdBy' }, { name: 'details' }] },
  { name: 'salesinvoices', documents: [{ name: 'SICode', prefix: 'SIIT' }, { name: 'status' }, { name: 'createdBy' }, { name: 'totalNetAmount' }] },
  { name: 'goodsreceivednotes', documents: [{ name: 'GRNCode', prefix: 'GRIT' }, { name: 'status' }, { name: 'createdBy' }, { name: 'accountDetailsTable' }] },
  ];

  // ✅ Backup userTotals before resetting
resetUserTotalsTemporarily(): void {
  Object.keys(this.USER_MAP).forEach(userId => {
    const userName = this.USER_MAP[userId];
    if (!this.metricsabsons.userTotals[userName]) {
      this.metricsabsons.userTotals[userName] = {
        estimations: 0,
        salesorders: 0,
        deliveryorders: 0,
        purchaseorders: 0,
        salesinvoices: 0,
        goodsreceivednotes: 0,
        totalcount: 0,
      };
    } else {
      // Reset counts to 0
      this.metricsabsons.userTotals[userName] = {
        estimations: 0,
        salesorders: 0,
        deliveryorders: 0,
        purchaseorders: 0,
        salesinvoices: 0,
        goodsreceivednotes: 0,
        totalcount: 0,
      };
    }
  });
}

fetchDataAbsons(): void {
  this.resetUserTotalsTemporarily();
  this.isRefreshing = true;
  const collections = ['opportunities', 'salesorders', 'estimations', 'purchaseorders', 'deliveryorders', 'salesinvoices','goodsreceivednotes'];
  collections.forEach((collection) => {
    this.http.get<{ data: any[] }>(`${environment.BACKEND_URL}/fetch-collection/${collection}`).subscribe(
      (response) => {
        console.log(`API Response for ${collection}:`, response); // Debug log
        const data = Array.isArray(response?.data) ? response.data : [];
        this.processDataAbsons(collection, data);
      },
      () => this.fetchFromBackendAbsons(collection)
    );
  });
  this.isRefreshing = false;
  this.cdr.detectChanges();
}

 // ✅ Fetch from backend if local fetch fails
fetchFromBackendAbsons(collection: string): void {
  this.isRefreshing = true;
  this.http.get<any[]>(`${environment.BACKEND_URL}/fetch-collection/${collection}`).subscribe(
    (data) => this.processDataAbsons(collection, data || []), // Pass the collection name instead of this.collections
    (error) => console.error(`Error fetching ${collection} from backend:`, error) // Use the collection name for logging
  );
  this.http.get<any[]>(`${environment.BACKEND_URL}/get-local-data/deliveryorders`).subscribe(
    (data) => this.processDeliveryorders(data || [])
  );

  this.isRefreshing = false;
  this.cdr.detectChanges();
}
// ✅ Process data for each collection
processDataAbsons(collection: string, data: any[]): void {
  const filteredData = this.filterDataByCollection(collection, data);

  let totalValue = 0, openCount = 0, closedCount = 0, cancelledCount = 0, salesdo = 0;
  let totalSelling = 0, totalCost = 0;
  let userData: { [key: string]: { count: number; totalValue: number } } = {};

  filteredData.forEach((item) => {
    const value = this.getTotalValue(item, collection);
    totalValue += value;

    // ✅ Status tracking
    const statusField = collection === 'purchaseorders' ? 'POStatus' : 'status';
    const status = item[statusField]?.toLowerCase();
    if (status === 'open') openCount++;
    else if (status === 'closed') closedCount++;
    else if (status === 'cancelled') cancelledCount++;
    else if (status === 'DO created')salesdo++

    // ✅ Process opportunities separately
    if (collection === 'opportunities') {
      totalSelling += item.selling || 0;
      totalCost += item.cost || 0;
    }else {
      // ✅ Track user data
      const userName = this.USER_MAP[item.createdBy] || 'Unknown';
      if (!userData[userName]) {
        userData[userName] = { count: 0, totalValue: 0 };
      }
      userData[userName].count += 1;
      userData[userName].totalValue += value;

      // ✅ Update `userTotals` (excluding `Unknown`)
      if (userName !== 'Unknown') {
        if (!this.metricsabsons.userTotals[userName]) {
          this.metricsabsons.userTotals[userName] = { estimations: 0, salesorders: 0, deliveryorders: 0, purchaseorders: 0 , salesinvoices: 0, goodsreceivednotes: 0,totalcount: 0,};
        }
        this.metricsabsons.userTotals[userName][collection as keyof MetricsAbsons["userTotals"][string]] += 1;
      }
    }
  });

  // ✅ Assign computed metrics
  if (collection === 'opportunities') {
    this.metricsabsons.opportunities = {
      total: totalSelling - totalCost,  // ✅ Stored as a raw number (not divided)
      open: openCount,
      closed: closedCount,
      cancelled: cancelledCount,
      profit: totalSelling - totalCost,
      selling: totalSelling,
      cost: totalCost,
      rankings: [] // No user rankings for opportunities
    };
  } else {
    // ✅ Store user rankings as raw values
    const formattedUserData = Object.entries(userData).map(([user, data]) => ({
      user,
      value: data.totalValue,  // ✅ Stored as raw value
      percentage: ((data.totalValue / totalValue) * 100).toFixed(2),
      count: data.count
    }));

    // ✅ Assign computed metrics
    this.metricsabsons[collection as keyof MetricsAbsons] = {
      total: totalValue,  // ✅ Raw value stored
      open: openCount,
      closed: closedCount,
      cancelled: cancelledCount,
      rankings: formattedUserData,
      count: filteredData.length
    } as any;
    this.metricsabsons.salesorders.docreated = salesdo;
  }

  this.cdr.detectChanges();
}

 // ✅ Function to filter data by prefix
 filterDataByCollection(collection: string, data: any[]): any[] {
  switch (collection) {
    case 'opportunities':
      return data.filter((item) => item.opportunityCode?.startsWith('OPIT'));
    case 'estimations':
      return data.filter((item) => item.estimationCode?.startsWith('PEIT') || item.estimationCode?.startsWith('BDIT'));
    case 'purchaseorders':
      return data.filter((item) => item.POCode?.startsWith('POIT'));
    case 'salesorders':
      return data.filter((item) => item.salesOrderCode?.startsWith('SOIT'));
    case 'deliveryorders':
      return data.filter((item) => item.DOCode?.startsWith('DNIT'));
    case 'salesinvoices':
        return data.filter((item) => item.SICode?.startsWith('SIIT'));
    case 'goodsreceivednotes':
      return data.filter((item) => item.GRNCode?.startsWith('GRIT'));
    default:
      return [];
  }
}

// ✅ Opportunities
calculateOpportunityMetricsAbsons(data: any[]): void {
  const filteredData = data.filter(item => item.opportunityCode?.startsWith('OPIT'));
  let open = 0, closed = 0, cancelled = 0, totalSelling = 0, totalCost = 0;
  const userCounts: { [key: string]: number } = {};

  filteredData.forEach(item => {
    totalSelling += item.selling || 0;
    totalCost += item.cost || 0;

    if (item.status === 'Open') this.metricsabsons.opportunities.open++;
    if (item.status === 'Closed') this.metricsabsons.opportunities.closed++;
    if (item.status === 'Cancelled') this.metricsabsons.opportunities.cancelled++;

    const userName = this.USER_MAP[item.createdBy];
    if (userName) userCounts[userName] = (userCounts[userName] || 0) + 1;
  });

  this.metricsabsons.opportunities = {
    total: filteredData.length,
    open, closed, cancelled,
    selling: totalSelling,
    cost: totalCost,
    profit: totalSelling - totalCost,
    rankings: Object.entries(userCounts).map(([user, count]) => ({ user, value: count, percentage: ((count / filteredData.length) * 100).toFixed(3), count })),
  };
  this.cdr.detectChanges();
}

// ✅ Process Sales Orders Data
  processSalesOrders(data: any[]): void {
    let totalEstimatedNet = 0;
    const userSales: { [key: string]: { count: number; totalValue: number } } = {};

    data.forEach((item) => {
        const userName = this.USER_MAP[item.createdBy];
        const netAmount = parseFloat(item.accountDetailsTable?.totalCalculation?.netAmount || 0);
        totalEstimatedNet += netAmount;

        if (userName) {
            if (!userSales[userName]) {
                userSales[userName] = { count: 0, totalValue: 0 };
            }
            userSales[userName].count += 1;
            userSales[userName].totalValue += netAmount;
        }
    });

    this.metricsabsons.salesorders.rankings = this.generateRankings(userSales, totalEstimatedNet);
    this.cdr.detectChanges();
}

// ✅ Process Estimations Data
  processEstimations(data: any[]): void {
    const filteredEstimations = data.filter(item =>
        item.estimationCode?.startsWith('PEIT') || item.estimationCode?.startsWith('BDIT')
    );

    let totalCurrentTotal = 0;
    const userEstimations: { [key: string]: { count: number; totalValue: number } } = {};

    filteredEstimations.forEach((item) => {
        const userName = this.USER_MAP[item.createdBy];
        const currentTotal = parseFloat(item.accountDetailsTable?.totalCalculation?.netAmount || 0);
        totalCurrentTotal += currentTotal;

        if (userName) {
            if (!userEstimations[userName]) {
                userEstimations[userName] = { count: 0, totalValue: 0 };
            }
            userEstimations[userName].count += 1;
            userEstimations[userName].totalValue += currentTotal;
        }
    });

    this.metricsabsons.estimations.rankings = this.generateRankings(userEstimations, totalCurrentTotal);
    this.cdr.detectChanges();
}

processPurchaseorders(data: any[]): void {
  let openCount = 0, closedCount = 0, cancelledCount = 0;
  const filteredData = this.filterDataByCollection('purchaseorders', data);
  console.log(`Filtered purchaseorders data:`, filteredData); // Debug log

  filteredData.forEach((item) => {
    const status = (item.POStatus || "").trim().toLowerCase();
    if (!['open', 'closed', 'cancelled'].includes(status)) {
      console.warn(`Invalid POStatus: ${item.POStatus}`); // Handle invalid statuses
      return;
    }
    if (status === 'open') openCount++;
    else if (status === 'closed') closedCount++;
    else if (status === 'cancelled') cancelledCount++;
  });

  this.metricsabsons.purchaseorders.open = openCount;
  this.metricsabsons.purchaseorders.closed = closedCount;
  this.metricsabsons.purchaseorders.cancelled = cancelledCount;

  console.log(`Updated purchaseorders statuses:`, this.metricsabsons.purchaseorders); // Debug log
  this.cdr.detectChanges(); // Trigger change detection
}

// ✅ Process deliveryorders
processDeliveryorders(data: any[]): void {
  // Filter data by DOCode prefix
  const filteredData = data.filter(item => item.DOCode?.startsWith('DNIT'));
  console.log(`Original deliveryorders data:`, data);
  console.log(`Filtered deliveryorders data:`, filteredData);

  let openCount = 0, closedCount = 0, cancelledCount = 0, totalNetAmount = 0;
  const userDeliveryorders: { [key: string]: { count: number; totalValue: number } } = {};

  filteredData.forEach((item) => {
    // Handle status field
    const status = (item.status || "").trim().toLowerCase();
    if (!['open', 'closed', 'cancelled'].includes(status)) {
      console.warn(`Invalid status: ${item.status || 'undefined'}`);
      return;
    }

    // Update status counts
    if (status === 'open') openCount++;
    else if (status === 'closed') closedCount++;
    else if (status === 'cancelled') cancelledCount++;

    // Extract net amount
    const netAmount = parseFloat(item.details?.[0]?.netAmount || '0');
    console.log(`Details for item:`, item.details);
    console.log(`Calculated netAmount:`, netAmount);
    totalNetAmount += netAmount;

    // Map user
    const userName = this.USER_MAP[item.createdBy] || 'Unknown';
    if (!this.USER_MAP[item.createdBy]) {
      console.warn(`Unmapped createdBy value: ${item.createdBy}`);
    }

    // Update user-specific data
    if (!userDeliveryorders[userName]) {
      userDeliveryorders[userName] = { count: 0, totalValue: 0 };
    }
    userDeliveryorders[userName].count += 1;
    userDeliveryorders[userName].totalValue += netAmount;

    // Update userTotals
    if (userName !== 'Unknown') {
      if (!this.metricsabsons.userTotals[userName]) {
        this.metricsabsons.userTotals[userName] = {
          estimations: 0,
          salesorders: 0,
          deliveryorders: 0,
          purchaseorders: 0,
          salesinvoices: 0,
          goodsreceivednotes: 0,
          totalcount: 0,
        };
      }
      this.metricsabsons.userTotals[userName].deliveryorders += 1;
    }
  });

  // Assign computed metrics
  this.metricsabsons.deliveryorders.open = openCount;
  this.metricsabsons.deliveryorders.closed = closedCount;
  this.metricsabsons.deliveryorders.cancelled = cancelledCount;
  this.metricsabsons.deliveryorders.total = filteredData.length;
  this.metricsabsons.deliveryorders.rankings = this.generateRankings(userDeliveryorders, totalNetAmount);

  console.log(`Updated deliveryorders metrics:`, this.metricsabsons.deliveryorders);
  this.cdr.detectChanges(); // Trigger change detection
}

// ✅ Process SalesInvoices Data
processSalesInvoices(data: any[]): void {
  const filteredSalesInvoices = data.filter(item =>
      item.SICode?.startsWith('SIIT')
  );

  let totalNet = 0;
  const userSalesInvoices : { [key: string]: { count: number; totalValue: number } } = {};

  filteredSalesInvoices.forEach((item) => {
      const userName = this.USER_MAP[item.createdBy];
      const totalNetAmount = parseFloat(item.totalNetAmount || 0);
      totalNet += totalNetAmount;

      if (userName) {
          if (!userSalesInvoices[userName]) {
              userSalesInvoices[userName] = { count: 0, totalValue: 0 };
          }
          userSalesInvoices[userName].count += 1;
          userSalesInvoices[userName].totalValue += totalNetAmount;
      }
  });

  this.metricsabsons.salesinvoices.rankings = this.generateRankings(userSalesInvoices, totalNet);
  this.cdr.detectChanges();
}
// ✅ Process GRN Data
processGRN(data: any[]): void {
  let totalGRNnet = 0;
  const userGRN: { [key: string]: { count: number; totalValue: number } } = {};

  data.forEach((item) => {
      const userName = this.USER_MAP[item.createdBy];
      const currentTotal = parseFloat(item.accountDetailsTable?.currentTotal || 0);
      totalGRNnet += currentTotal;

      if (userName) {
          if (!userGRN[userName]) {
              userGRN[userName] = { count: 0, totalValue: 0 };
          }
          userGRN[userName].count += 1;
          userGRN[userName].totalValue += currentTotal;
      }
  });

  this.metricsabsons.goodsreceivednotes.rankings = this.generateRankings(userGRN, totalGRNnet);
  this.cdr.detectChanges();
}

processUserRelatedData(data: any[], collectionName: string): void {
  const filteredData = this.filterDataByCollection(collectionName, data);

  // Ensure userTotals exists before modifying
  Object.keys(this.USER_MAP).forEach(userId => {
    const userName = this.USER_MAP[userId];
    if (!this.metricsabsons.userTotals[userName]) {
      this.metricsabsons.userTotals[userName] = {
        estimations: 0,
        salesorders: 0,
        deliveryorders: 0,
        purchaseorders: 0,
        salesinvoices: 0,
        goodsreceivednotes: 0,
        totalcount: 0,
      };
    }
  });

  let totalValue = 0;
  const userData: { [userName: string]: { count: number; totalValue: number } } = {};

  filteredData.forEach((item) => {
    const userName = this.USER_MAP[item.createdBy] || 'Unknown';
    if (userName === 'Unknown') return; // Ignore invalid users

    const currentTotal = Number(this.getTotalValue(item, collectionName) || 0);
    totalValue += currentTotal;

    if (!userData[userName]) {
      userData[userName] = { count: 0, totalValue: 0 };
    }
    userData[userName].count += 1;
    userData[userName].totalValue += currentTotal;

    // ✅ Correctly update userTotals count (not resetting)
    this.metricsabsons.userTotals[userName][collectionName as keyof MetricsAbsons["userTotals"][string]] = userData[userName].count;
  });

  // ✅ Store rankings per user for display
  this.metricsabsons[collectionName as keyof MetricsAbsons].rankings = this.generateRankings(userData, totalValue);


  this.cdr.detectChanges(); // ✅ Apply UI changes once
}

// ✅ Get total value from sub-documents
getTotalValue(item: any, collection: string): number {
  switch (collection) {
    case 'opportunities':
      return (parseFloat(item.selling) || 0) - (parseFloat(item.cost) || 0);
    case 'estimations':
      return parseFloat(item.accountDetailsTable?.currentTotal || 0);
    case 'purchaseorders':
      return parseFloat(item.accountDetailsTable?.currentTotal || 0);
    case 'salesorders':
      return parseFloat(item.accountDetailsTable?.totalCalculation?.netAmount || 0);
    case 'deliveryorders':
      return parseFloat(item.details?.[0]?.netAmount || 0);
    case 'salesinvoices':
      return parseFloat(item.totalNetAmount || 0);
    case 'goodsreceivednotes':
      return parseFloat(item.accountDetailsTable?.currentTotal || 0);
    default:
      return 0;
  }
}

// ✅ Generate rankings
generateRankings(userData: { [key: string]: { count: number; totalValue: number } }, totalRecords: number): Ranking[] {
  return Object.entries(userData).map(([user, data]) => ({
    user,
    value: data.totalValue,
    percentage: totalRecords > 0 ? ((data.count / totalRecords) * 100).toFixed(2) : '0.00',
    count: data.count,
  }));
}

}
