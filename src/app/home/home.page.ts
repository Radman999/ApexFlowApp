import { AfterViewInit, Component, OnDestroy, OnInit, } from '@angular/core';
import { IonSelectOption, IonSelect, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, IonItem, IonLabel, IonInput, IonList, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle, IonApp, IonButtons, IonMenu, IonMenuButton, IonRange, IonGrid } from '@ionic/angular/standalone';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { addIcons } from 'ionicons';
import { barcodeOutline, search } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormBuilder, ReactiveFormsModule, FormGroup, Validators, FormControl, FormsModule } from '@angular/forms';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [FormsModule, IonGrid, IonMenu, IonButtons, IonApp, IonSelectOption, IonSelect, IonCardSubtitle, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonList, CommonModule, HttpClientModule, IonInput, IonLabel, IonItem, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, ReactiveFormsModule, IonMenuButton, IonRange],
})
export class HomePage implements AfterViewInit, OnInit {
  globalForm: FormGroup;

  selectableFrom: { displayText: string, value: number }[] = [];

  constructor(private alertController: AlertController, private httpClient: HttpClient, private fb: FormBuilder) {
    addIcons({ barcodeOutline, search });

    this.globalForm = new FormGroup({
      To: new FormControl(null)  // Control for the global destination select
    });
  }
  customPopoverOptions = {
    header: 'Mozzon',
    subHeader: 'Mozzon again',
    message: 'Mozzon again but as a description :P',
  };
  ngAfterViewInit() {
    this.prepare();
    this.FetchWh();
    this.ProductUnitFetch();
  }
  result: string | null = null;
  test: string | null = null;
  scanActive = false;
  scannedresult: any;
  apiData: any = null;  // This will hold the API response data
  post: any;
  from: any;
  to: any;
  quantity: any;
  whList: any[] = [];
  ProductList: any[] = [];
  product: any;
  scanResults: any[] = []; // Array to hold results from each scan
  maxQuantity: number = 0;  // Default to 1 or a sensible minimum

  ngOnInit() {
    // Subscribe to changes in the global 'To' control
    this.globalForm.get('To')?.valueChanges.subscribe(newToValue => {
      // Update 'To' in all existing scan result forms
      this.scanResults.forEach(item => {
        item.form.get('To').setValue(newToValue, { emitEvent: false });
      });
    });
  }


  prepare = () => {
    BarcodeScanner.prepare();
  };



  // To be deleted
  quantityOptions(): number[] {
    return Array.from({ length: this.maxQuantity }, (_, i) => i + 1);
  }
  startScan = async () => {
    // Check camera permission
    // This is just a simple example, check out the better checks below
    const allowed = await this.checkPermission();


    if (allowed) {
      BarcodeScanner.hideBackground();
      const body = document.querySelector('body');
      if (body !== null) {
        body.classList.add('scanner-active');
      }
      this.scanActive = true;
      const result = await BarcodeScanner.startScan(); // start scanning and wait for a result

      if (result?.hasContent) {
        this.result = result.content;
        this.scannedresult = result.content;
        this.fetchDataFromApi(); // Fetch data from API after scanning
        this.scanActive = false;
      }
    }
    this.prepare();
  }

  stopScanner() {
    BarcodeScanner.stopScan();
    this.scanActive = false;
    this.prepare();
  }


  fetchDataFromApi() {
    const apiUrl = this.result;  // Using the 'result' bound to the ion-input
    if (!apiUrl) {
      console.error('No URL provided for fetching data.');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });

    this.httpClient.get<any>(apiUrl, { headers }).subscribe(
      data => {
        const existingEntry = this.scanResults.find(item => item.id === data.id);
        if (existingEntry) {
          // Update existing entry and its form
          existingEntry.quantity = Math.min(existingEntry.quantity + 1, existingEntry.maxQuantity);
          existingEntry.form.get('quantity').setValue(existingEntry.quantity);
        } else {
          // Push new data as a new entry with a new FormGroup
          this.scanResults.push({
            ...data,
            quantity: 1,
            maxQuantity: data.quantity,
            form: new FormGroup({
              From: new FormControl(data.id),
              To: new FormControl(this.globalForm.get('To')?.value), // Added null check
              quantity: new FormControl(1)
            })
          });
        }
      },
      error => {
        console.error('Error fetching data:', error);
      }
    );
  }

  submitAllForms() {
    this.scanResults.forEach(result => {
      const formData = result.form.value;
      console.log('Submitting:', formData);  // Logging the form data for debugging

      const headers = new HttpHeaders({
        'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
        'Content-Type': 'application/json'
      });

      // Here you would actually post the data
      this.httpClient.post<any>("/api/transfers/", formData, { headers }).subscribe(
        response => {
          console.log('Successful POST:', response);  // Successful POST operation
        },
        error => {
          console.error('Error posting data:', error);  // Error during POST operation
        }
      );
    });
  }

  reduce(item: any) {
    // Find the item in the scanResults array
    const product = this.scanResults.find(result => result.id === item.id);
    if (product && product.quantity > 1) {
      product.quantity--;
    } else {
      this.scanResults = this.scanResults.filter(result => result.id !== item.id);
    }

  }








  FetchWh() {
    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });
    // Post the data
    this.httpClient.get<any[]>("/api/wh/", { headers }).subscribe(
      data => {
        this.whList = data;
        console.log('API Data:', data);  // Successful POST operation
      },
      error => {
        console.error('Error posting data:', error);  // Error during POST operation
      }
    );
  }

  ProductUnitFetch() {
    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });
    // Post the data
    this.httpClient.get<any[]>("/api/products/", { headers }).subscribe(
      data => {
        this.ProductList = data;
        console.log('API Data:', data);  // Successful POST operation
      },
      error => {
        console.error('Error posting data:', error);  // Error during POST operation
      }
    );
  }

  checkPermission = async () => {
    return new Promise(async (resolve, _reject) => {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.granted) {
        resolve(true);
      } else if (status.denied) {
        const alert = await this.alertController.create({
          header: 'صلاحية الكاميرا',
          message: 'يرجى السماح للتطبيق بالوصول إلى الكاميرا لتمكين المسح الضوئي.',
          buttons: [{
            text: 'رفض',
            role: 'إلغاء',
          },
          {
            text: 'فتح الإعدادات',
            handler: () => {

              BarcodeScanner.openAppSettings();
              resolve(false);
            }
          }]
        });
        await alert.present();
      } else {
        resolve(false);
      }
    });


  };
}