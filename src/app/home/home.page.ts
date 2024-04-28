import { AfterViewInit, Component, OnDestroy, } from '@angular/core';
import { IonSelectOption, IonSelect, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, IonItem, IonLabel, IonInput, IonList, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle, IonApp, IonButtons, IonMenu, IonMenuButton } from '@ionic/angular/standalone';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { addIcons } from 'ionicons';
import { barcodeOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormBuilder, ReactiveFormsModule, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonMenu, IonButtons, IonApp, IonSelectOption, IonSelect, IonCardSubtitle, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonList, CommonModule, HttpClientModule, IonInput, IonLabel, IonItem, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, ReactiveFormsModule, IonMenuButton],
})
export class HomePage implements AfterViewInit {
  form: FormGroup;
  constructor(private alertController: AlertController, private httpClient: HttpClient, private fb: FormBuilder) {
    addIcons({ barcodeOutline });
    this.form = this.fb.group({
      From: [null, [Validators.required, Validators.pattern('^[0-9]+$')]],
      To: [null, [Validators.required, Validators.pattern('^[0-9]+$')]],
      quantity: [null, [Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1)]]
    });


  }
  customPopoverOptions = {
    header: 'Mozzon',
    subHeader: 'Mozzon again',
    message: 'Mozzon again but as a description :P',
  };
  ngAfterViewInit() {
    this.prepare();
    this.fetchDataFromApi();
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
  prepare = () => {
    BarcodeScanner.prepare();
  };





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
    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });

    if (this.scannedresult) {
      this.httpClient.get<any[]>(this.scannedresult, { headers }).subscribe(
        data => {
          this.apiData = data;
          console.log('API Data:', data);
          if (data.length > 0) {
            // Assuming the data array contains items with an id property
            this.form.patchValue({
              From: data[0].id,  // Example: set 'From' to the id of the first item
              To: data[data.length - 1].id // Example: set 'To' to the id of the last item
            });
          }
        },
        error => {
          console.error('Error fetching data:', error);
        }
      );
    } else {
      console.error('No valid URL scanned');
    }
  }

  submitForm() {
    if (this.form.valid) {
      console.log('Form Values:', this.form.value);
      this.postApiData();
      // Additional logic to use form data
    }
  }


  postApiData() {
    if (this.form.valid) {
      const headers = new HttpHeaders({
        'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
        'Content-Type': 'application/json'
      });
      // Post the data
      this.httpClient.post<any>("/api/transfers/", this.form.value, { headers }).subscribe(
        data => {
          console.log('API Data:', data);  // Successful POST operation
        },
        error => {
          console.error('Error posting data:', error);  // Error during POST operation
        }
      );
    } else {
      console.error('Form is not valid');  // Form validation failed
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
            role: 'cancel',
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