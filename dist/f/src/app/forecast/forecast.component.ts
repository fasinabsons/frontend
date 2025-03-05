import { Component, OnInit, ViewChild, ElementRef, Input, output, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { ThemeService } from '../theme.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ViewEncapsulation } from '@angular/core';
import { environment } from '../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss'],
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
})
export class ForecastComponent implements OnInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef;
  @ViewChild('purchaseChart') purchaseChartRef!: ElementRef;
  @ViewChild('revenuePieChart') revenuePieChartRef!: ElementRef;
  @ViewChild('conversionPieChart') conversionPieChartRef!: ElementRef;
  @ViewChild('salesPurchaseChart') salesPurchaseChartRef!: ElementRef;

  // Add input property to control which chart to display
  @Input() chartType: 'sales' | 'purchase' | 'revenue' | 'conversions' |'salesPurchaseChart' | 'all' = 'all';
  @Output() chartDataReady = new EventEmitter<any>();

  salesorders: any[] = [];
  purchaseorders: any[] = [];
  estimations: any[] = [];
  salesTotal = 0;
  purchaseTotal = 0;

  selectedView: 'year' | 'month' | 'quarter' = 'month'; // Default view
  @Input() small = false;

  // ✅ User Mapping
  USER_MAP: { [key: string]: string } = {
    '66d0358045d8874340a78a7f': 'Shekha Mendoza',
    '67766e6f565ed783bbd30718': 'Shama Mohamad Wehbe',
    '66d034b845d8874340a78a7b': 'Mostafa Sallam',
    '66d5469cf78314d6ea83862c': 'Rajesh Kuttan',
    '66def25ccccab96dcd6fa6b2': 'Saji Alhaddad',
    '66d033bb45d8874340a78a74': 'Mahmoud Dayeh'
  };

  constructor(private http: HttpClient, private themeService: ThemeService) {}

  ngOnInit(): void {
    this.fetchOrders();
    this.themeService.isDarkMode$.subscribe((isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      this.applyDarkModeToCharts(isDark);
    });
  }

  // 🔹 Function to apply dark mode styles to charts
  applyDarkModeToCharts(isDarkMode: boolean): void {
    const chartBackground = isDarkMode ? '#1a1a1a' : '#ffffff';
    const textColor = isDarkMode ? '#ffffff' : '#333';

    Chart.defaults.color = textColor;
    Chart.defaults.backgroundColor = chartBackground;

    // If charts are already rendered, update them
    this.processForecastData();
    this.renderLineChart();
  }

  onViewChange(view: 'year' | 'month' | 'quarter'): void {
    this.selectedView = view;
    this.processForecastData();
  }

  fetchOrders(): void {
    this.http.get('${environment.BACKEND_URL}/fetch-collection/salesorders').subscribe(
      (response: any) => {
        this.salesorders = response.data.filter((order: any) => order.salesOrderCode?.startsWith('SOIT'));
        this.salesTotal = this.calculateTotal(this.salesorders, 'salesorders');
        this.fetchPurchaseOrders();
        this.renderLineChart();
      },
      (error) => console.error('Error fetching sales orders:', error)
    );
  }

  fetchPurchaseOrders(): void {
    this.http.get('${environment.BACKEND_URL}/fetch-collection/purchaseorders').subscribe(
      (response: any) => {
        this.purchaseorders = response.data.filter((order: any) => order.POCode?.startsWith('POIT'));
        this.purchaseTotal = this.calculateTotal(this.purchaseorders, 'purchaseorders');
        this.fetchEstimations();
        this.renderLineChart();
      },
      (error) => console.error('Error fetching purchase orders:', error)
    );
  }
  calculateTotal(data: any[], collection: string): number {
    return data.reduce((sum, item) => {
      return sum + this.getTotalValue(item, collection);
    }, 0);
  }

  getTotalValue(item: any, collection: string): number {
    switch (collection) {
      case 'salesorders':
        return parseFloat(item.accountDetailsTable?.totalCalculation?.netAmount || '0');
      case 'purchaseorders':
        return parseFloat(item.accountDetailsTable?.currentTotal || '0');
      default:
        return 0;
    }
  }

  fetchEstimations(): void {
    this.http.get('${environment.BACKEND_URL}/fetch-collection/estimations').subscribe(
      (response: any) => {
        this.estimations = response.data.filter(
          (estimation: any) => estimation.estimationCode?.startsWith('PEIT') || estimation.estimationCode?.startsWith('BDIT')
        );
        this.processForecastData();
      },
      (error) => console.error('Error fetching estimations:', error)
    );
  }

  processForecastData(): void {
    // Clear any existing charts before redrawing
    this.clearCharts();

    const salesData: { [key: string]: number } = {};
    const purchaseData: { [key: string]: number } = {};
    const revenueByUser: { [key: string]: number } = {};
    const conversionByUser: { [key: string]: number } = {};

    this.salesorders.forEach((order) => {
      const groupKey = this.getGroupKey(new Date(order.salesOrderDate));
      const revenue = parseFloat(order.accountDetailsTable?.totalCalculation?.netAmount || '0');
      salesData[groupKey] = (salesData[groupKey] || 0) + (isNaN(revenue) ? 0 : revenue);

      const userName = this.USER_MAP[order.createdBy] || 'Unknown';
      revenueByUser[userName] = (revenueByUser[userName] || 0) + (isNaN(revenue) ? 0 : revenue);
    });

    this.purchaseorders.forEach((order) => {
      const groupKey = this.getGroupKey(new Date(order.PODate));
      const purchase = parseFloat(order.accountDetailsTable?.currentTotal || '0');
      purchaseData[groupKey] = (purchaseData[groupKey] || 0) + (isNaN(purchase) ? 0 : purchase);
    });

    this.estimations.forEach((estimation) => {
      const userName = this.USER_MAP[estimation.createdBy] || 'Unknown';
      const matchingSalesOrder = this.salesorders.find((order) => order.estimationId === estimation._id);
      if (matchingSalesOrder) {
        conversionByUser[userName] = (conversionByUser[userName] || 0) + 1;
      }
    });

    // Render only the requested chart(s) or all if chartType is 'all'
    if (this.chartType === 'sales' || this.chartType === 'all') {
      if (this.salesChartRef?.nativeElement) {
        this.renderBarChart(this.salesChartRef.nativeElement, salesData, 'Sales Revenue', 'green');
      }
    }

    if (this.chartType === 'purchase' || this.chartType === 'all') {
      if (this.purchaseChartRef?.nativeElement) {
        this.renderBarChart(this.purchaseChartRef.nativeElement, purchaseData, 'Purchase Orders', 'blue');
      }
    }

    if (this.chartType === 'revenue' || this.chartType === 'all') {
      if (this.revenuePieChartRef?.nativeElement) {
        this.renderPieChart(this.revenuePieChartRef.nativeElement, revenueByUser, 'Revenue by User', 'Revenue');
      }
    }

    if (this.chartType === 'conversions' || this.chartType === 'all') {
      if (this.conversionPieChartRef?.nativeElement) {
        this.renderPieChart(this.conversionPieChartRef.nativeElement, conversionByUser, 'Conversions by User', 'Conversions');
      }
    }
    if (this.chartType === 'salesPurchaseChart' || this.chartType === 'all') {
      this.renderLineChart();
    }
    // Emit processed data to parent component
    this.chartDataReady.emit({
      salesData,
      purchaseData,
      selectedView: this.selectedView,
    });
  }

  // Helper method to clear charts
  clearCharts(): void {
    const chartRefs = [
      this.salesChartRef,
      this.purchaseChartRef,
      this.revenuePieChartRef,
      this.conversionPieChartRef,
      this.salesPurchaseChartRef
    ];

    chartRefs.forEach(ref => {
      if (ref?.nativeElement) {
        const canvasElement = ref.nativeElement;
        const chartInstance = Chart.getChart(canvasElement);
        if (chartInstance) {
          chartInstance.destroy();
        }
      }
    });
  }

  getGroupKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    if (this.selectedView === 'year') return `${year}`;
    if (this.selectedView === 'quarter') return `${year}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    return `${year}-${month}`;
  }

  renderBarChart(canvas: HTMLCanvasElement, data: { [key: string]: number }, label: string, color: string): void {
    // Filter out zero values and sort labels chronologically
    const filteredData = Object.entries(data).filter(([_, value]) => value > 0);
    const labels = filteredData.map(([key]) => key).sort();
    const values = filteredData.map(([_, value]) => value);

    // Convert cumulative values into [startValue, endValue] pairs
    const cumulativeValues: [number, number][] = [];
    let previousValue = 0;
    values.forEach(value => {
      cumulativeValues.push([previousValue, previousValue + value]);
      previousValue += value;
    });

    // Format labels based on the selected view
    const formattedLabels = labels.map(label => {
      if (this.selectedView === 'month') {
        const [year, month] = label.split('-');
        return new Date(`${year}-${month}-01`).toLocaleString('default', { month: 'short' });
      } else if (this.selectedView === 'quarter') {
        return label; // e.g., "2024-Q1"
      } else {
        return label; // e.g., "2024"
      }
    });

    // Add year separators for better readability
    const yearSeparators: { [key: string]: number } = {};
    formattedLabels.forEach((label, index) => {
      const year = labels[index].split('-')[0];
      if (!yearSeparators[year]) {
        yearSeparators[year] = index; // Store the first occurrence of each year
      }
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, `rgba(${color === 'green' ? '75, 192, 192' : '0, 0, 255'}, 0.8)`); // Start color
    gradient.addColorStop(1, `rgba(${color === 'green' ? '75, 192, 192' : '0, 0, 255'}, 0.2)`); // End color

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: label,
          data: cumulativeValues, // Each data point is [startValue, endValue]
          backgroundColor: gradient, // Use gradient fill
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false, // Ensure bars are fully rendered
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false, // Remove vertical grid lines
            },
            ticks: {
              autoSkip: true, // Automatically skip overlapping labels
              maxRotation: 0, // Prevent label rotation
              minRotation: 0,
              callback: (tickValue: string | number, index: number) => {
                const year = labels[index].split('-')[0]; // Extract the year from the label
                return yearSeparators[year] === index ? `${year}\n${formattedLabels[index]}` : formattedLabels[index];
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)', // Subtle horizontal grid lines
            },
            ticks: {
              callback: (tickValue: string | number): string => {
                const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
                return `${(value / 1e6).toFixed(2)}M`; // Format in millions with 2 decimal places
              },
            },
            title: { display: true, text: 'Amount (in millions)' },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => {
                const [start, end] = tooltipItem.raw;
                return `${tooltipItem.label}: ${(end / 1e6).toFixed(2)}M`;
              },
            },
          },
          legend: {
            display: false, // Hide legend for simplicity
          },
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          },
        },
      },
    });
  }

  renderPieChart(canvas: HTMLCanvasElement, data: { [key: string]: number }, title: string, labelPrefix: string): void {
    const labels = Object.keys(data);
    const values = labels.map((key) => data[key]);

    new Chart(canvas.getContext('2d')!, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: ['#FF6F61', '#6C5CE7', '#FF9F43', '#00B894', '#FDCB6E'], // Peach, Lavender, Pistachio, Olive, etc.
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: (tooltipItem: any) => `${labelPrefix}: ${tooltipItem.raw}`,
            },
          },
        },
      },
    });
  }

  calculateGrowth(values: number[]): number {
    if (values.length < 2) return 0;
    const initialValue = values[0];
    const finalValue = values[values.length - 1];
    return initialValue !== 0 ? ((finalValue - initialValue) / initialValue) * 100 : 0;
  }
  renderLineChart(): void {
    if (!this.salesPurchaseChartRef?.nativeElement) return;

    const ctx = this.salesPurchaseChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.destroy();
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Adjust this dynamically if needed
        datasets: [
          {
            label: 'Sales',
            data: [100, 250, 180, 300, 200, 280, 320], // Replace with dynamic data
            borderColor: '#4F75FF',
            backgroundColor: 'rgba(79, 117, 255, 0.2)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Purchases',
            data: [120, 200, 220, 270, 240, 260, 300], // Replace with dynamic data
            borderColor: '#9B51E0',
            backgroundColor: 'rgba(155, 81, 224, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#FFFFFF' } },
          y: { beginAtZero: true, ticks: { color: '#FFFFFF' } },
        },
        plugins: {
          legend: { labels: { color: '#FFFFFF' } },
        },
      },
    });
  }

  aggregateData(orders: any[], dateKey: string): { [key: string]: number } {
    return orders.reduce((acc, order) => {
      const date = new Date(order[dateKey]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

}
