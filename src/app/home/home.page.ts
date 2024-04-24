import { AfterViewInit, Component, OnDestroy, } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { addIcons } from 'ionicons';
import { barcodeOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonInput, IonLabel, IonItem, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, CommonModule],
})
export class HomePage implements AfterViewInit, OnDestroy {
  constructor(private alertController: AlertController) {
    addIcons({ barcodeOutline });
  }
  ngOnDestroy() {
  }
  ngAfterViewInit() {
    this.prepare();
  }
  result: string | null = null;
  test: string | null = null;
  scanActive = false;
  scannedresult: any;

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