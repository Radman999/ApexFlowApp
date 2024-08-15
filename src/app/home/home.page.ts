import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import {
  IonSelectOption,
  IonSelect,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCardSubtitle,
  IonApp,
  IonButtons,
  IonMenu,
  IonMenuButton,
  IonRange,
  IonGrid,
  IonItemDivider,
  IonItemGroup,
  IonAccordionGroup,
  IonAccordion,
} from '@ionic/angular/standalone';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { addIcons } from 'ionicons';
import { barcodeOutline, removeCircle, search } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  Validators,
  FormControl,
  FormsModule,
  FormArray,
} from '@angular/forms';
import { AuthService } from '../auth.service'; // Import AuthService

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonAccordion,
    IonAccordionGroup,
    IonItemGroup,
    IonItemDivider,
    FormsModule,
    IonGrid,
    IonMenu,
    IonButtons,
    IonApp,
    IonSelectOption,
    IonSelect,
    IonCardSubtitle,
    IonCardContent,
    IonCardTitle,
    IonCardHeader,
    IonCard,
    IonList,
    CommonModule,
    IonInput,
    IonLabel,
    IonItem,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonRow,
    IonCol,
    ReactiveFormsModule,
    IonMenuButton,
    IonRange,
  ],
})
export class HomePage implements AfterViewInit {
  globalForm: FormGroup;
  transferForm: FormGroup;
  transfer: FormGroup;
  selectableFrom: { displayText: string; value: number }[] = [];

  result: string | null = null;
  scanActive = false;
  scannedResult: any;
  apiData: any = null;
  whList: any[] = [];
  DisplayTextFrom = 'أختر المخزن (من)';
  DisplayTextTo = 'أختر المخزن (إلى)';
  ProductList: any[] = [];
  ZplList: any[] = [];
  scanResults: any[] = [];
  processedRandomIds: Set<number> = new Set();

  constructor(
    private cdr: ChangeDetectorRef,
    private alertController: AlertController,
    private httpClient: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService, // Inject AuthService
  ) {
    addIcons({ barcodeOutline, search, removeCircle });

    this.globalForm = this.fb.group({
      To: new FormControl(),
      From: new FormControl(),
    });

    this.transferForm = this.fb.group({
      reference_number: ['', Validators.required],
      document_date: ['', Validators.required],
      description: ['', Validators.required],
      warehouse_code_from: ['', Validators.required],
      warehouse_code_to: ['', Validators.required],
      items: this.fb.array([]),
    });

    this.transfer = this.fb.group({
      transfers: this.fb.array([]),
    });
  }

  ngAfterViewInit() {
    this.prepare();
    this.fetchWh();
    this.fetchQr();
    this.fetchZpl();
  }

  prepare() {
    BarcodeScanner.startScan();
  }

  onWarehouseChange(event: any, controlName: 'From' | 'To') {
    const selectedWarehouse = event.detail.value;
    const otherControlName = controlName === 'From' ? 'To' : 'From';
    const otherSelectedWarehouse = this.globalForm.get(otherControlName)?.value;

    if (
      otherSelectedWarehouse &&
      selectedWarehouse.id === otherSelectedWarehouse.id
    ) {
      this.showAlert('خطأ', 'لا يمكن اختيار نفس المخزون لـ "من" و "إلى"');
      this.globalForm.get(controlName)?.reset();
      this.transferForm
        .get(`warehouse_code_${controlName.toLowerCase()}`)
        ?.reset();
    } else {
      this.globalForm.get(controlName)?.setValue(selectedWarehouse);
      this.transferForm
        .get(`warehouse_code_${controlName.toLowerCase()}`)
        ?.setValue(selectedWarehouse.Smacc_Code);
      if (controlName === 'From') {
        this.DisplayTextFrom = selectedWarehouse.name;
      } else {
        this.DisplayTextTo = selectedWarehouse.name;
      }
    }

    console.log(
      `${otherControlName} Selected Warehouse:`,
      this.globalForm.get(otherControlName)?.value,
    );
    console.log(
      `${controlName} Selected Warehouse:`,
      this.globalForm.get(controlName)?.value,
    );
  }

  onWarehouseChangeFrom(event: any) {
    this.onWarehouseChange(event, 'From');
  }

  onWarehouseChangeTo(event: any) {
    this.onWarehouseChange(event, 'To');
  }

  async startScan() {
    const allowed = await this.checkPermission();

    if (allowed) {
      document.querySelector('body')?.classList.add('scanner-active');
      this.scanActive = true;
      const result = await BarcodeScanner.scan();

      if (result.barcodes[0]) {
        this.result = result.barcodes[0].displayValue;
        this.scannedResult = result.barcodes[0].displayValue;
        this.fetchDataFromApi();
        this.scanActive = false;
      }
    }
    this.prepare();
  }

  stopScanner() {
    BarcodeScanner.stopScan();
    document.querySelector('body')?.classList.remove('scanner-active');
    this.scanActive = false;
  }

  async checkPermission() {
    const status = await BarcodeScanner.checkPermissions();
    if (status.camera === 'granted') {
      return true;
    }
    if (status.camera === 'denied') {
      const alert = await this.alertController.create({
        header: 'صلاحية الكاميرا',
        message:
          'يرجى السماح للتطبيق بالوصول إلى الكاميرا لتمكين المسح الضوئي.',
        buttons: [
          { text: 'رفض', role: 'إلغاء' },
          {
            text: 'فتح الإعدادات',
            handler: () => {
              BarcodeScanner.openSettings();
              return false;
            },
          },
        ],
      });
      await alert.present();
    }
    return false;
  }

  async checkRandomId(apiUrl: string): Promise<string | null> {
    const randomId = Number.parseInt(apiUrl, 10);

    if (this.processedRandomIds.has(randomId)) {
      console.log('Random ID already processed:', randomId);
      await this.showAlert('مستخدم', `تم استخدامه :${randomId}`);
      return null;
    }

    const matchingZpl = this.ZplList.find((zpl) => zpl.random_id === randomId);
    if (matchingZpl) {
      return matchingZpl.id.toString();
    }
    console.error(`No matching entry found for random_id: ${randomId}`);
    return null;
  }

  updateScanResults(data: any) {
    const existingEntry = this.scanResults.find(
      (entry) => entry.qr === data.qr,
    );
    if (existingEntry) {
      existingEntry.quantity = Math.min(
        existingEntry.quantity + 1,
        data.batch_quantity,
      );
      this.addTransfer(
        data.id,
        this.globalForm.get('To')?.value.id,
        data.random_id,
      );
      existingEntry.details.push({
        id: data.id,
        random_id: data.random_id,
        created_at: data.created_at,
      });
    } else {
      this.scanResults.push({
        item_code: data.item_code,
        productunit_name: data.productunit_name,
        maxQuantity: data.batch_quantity,
        quantity: 1,
        qr: data.qr,
        created_at: data.created_at,
        unit_fraction: data.unit_fraction,
        details: [
          {
            id: data.id,
            random_id: data.random_id,
            created_at: data.created_at,
          },
        ],
      });
      this.addTransfer(
        data.id,
        this.globalForm.get('To')?.value.id,
        data.random_id,
      );
    }
  }

  async fetchDataFromApi() {
    const apiUrl = this.result;
    if (!apiUrl) {
      console.error('No URL provided for fetching data.');
      await this.showAlert(
        'الخانة فارغة',
        'الخانة فارغة يرجى المحاولة مرة أخرى',
      );
      return;
    }

    const trueId = await this.checkRandomId(apiUrl);
    if (!trueId) {
      console.log('No valid trueId found. Skipping.', trueId);
      await this.showAlert('لا يوجد!', 'البيانات غير متوفرة');
      return;
    }

    const token = this.authService.getToken(); // Get the token from AuthService
    if (!token) {
      await this.showAlert('Error', 'User not logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    try {
      const data = await this.httpClient
        .get<any>(`/api/ZPL/${trueId}/`, { headers })
        .toPromise();
      const selectedFromWarehouseCode =
        this.globalForm.get('From')?.value.Smacc_Code;
      console.log('selectedFromWarehouseCode:', selectedFromWarehouseCode);
      console.log('data.wh_code:', data.wh_code);

      if (data.wh_code !== selectedFromWarehouseCode) {
        console.log(
          'البيانات المدخلة لا تتطابق مع المخزن المحدد "من". التخطي.',
        );
        await this.showAlert(
          'عدم تطابق',
          'البيانات المدخلة لا تتطابق مع المخزن المحدد "من".',
        );
        return;
      }

      const eligibleZpl = this.ZplList.find(
        (zpl) =>
          zpl.item_code === data.item_code &&
          zpl.wh_code === data.wh_code &&
          !this.scanResults.some((res) =>
            res.details.some((detail: { id: any }) => detail.id === zpl.id),
          ),
      );

      if (eligibleZpl && data.created_at === eligibleZpl.created_at) {
        const randomId = Number.parseInt(apiUrl, 10);
        this.processedRandomIds.add(randomId);
        this.updateScanResults(data);
        console.log('API Data:', data);
        console.log('Form contains:', this.transferForm.value);
        console.log('Scan results:', this.scanResults);
        console.log('Transfers:', this.transfer.value);
      } else {
        console.log(
          `البيانات المدخلة لا تتطابق مع أقدم إدخال لـ ${eligibleZpl?.id}. التخطي.`,
        );
        await this.showAlert(
          'عدم تطابق',
          `البيانات المدخلة لا تتطابق مع أقدم إدخال بتاريخ ${eligibleZpl?.created_at}.`,
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      await this.showAlert('لا يوجد!', 'البيانات غير متوفرة');
    }

    this.cdr.detectChanges();
  }

  async submitAllForms() {
    if (this.transfersArray.length === 0) {
      await this.showAlert(
        'الخانة فارغة',
        'لا يمكنك التحويل لعدم وجود البيانات',
      );
      return;
    }
    console.log('Submitting:', this.transfer.value);

    const transfersWithoutRandomId = this.transfersArray.value.map(
      (transfer: any) => {
        const { random_id, ...transferWithoutRandomId } = transfer;
        return transferWithoutRandomId;
      },
    );
    console.log('after removing random_ID:', {
      transfers: transfersWithoutRandomId,
    });

    const token = this.authService.getToken(); // Get the token from AuthService
    if (!token) {
      await this.showAlert('Error', 'User not logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    this.httpClient
      .post<any>(
        '/api/Track/',
        { transfers: transfersWithoutRandomId },
        { headers },
      )
      .subscribe(async (response) => {
        console.log('Successful POST:', response);
        if (response?.id) {
          this.transferForm.patchValue({
            reference_number: response.id,
            document_date: new Date().toISOString().slice(0, 10),
            description: 'Transfer done through ApexFlow app',
          });

          const itemsArray = this.scanResults.map((product) => ({
            unit_fraction: product.unit_fraction,
            quantity: product.quantity,
            item_code: product.item_code,
          }));

          this.transferForm.setControl(
            'items',
            this.fb.array(itemsArray.map((item) => this.fb.group(item))),
          );
        }
      });
  }

  get transfersArray(): FormArray {
    return this.transfer.get('transfers') as FormArray;
  }

  addTransfer(From: number, To: number, random_id: number) {
    const transfersArray = this.transfer.get('transfers') as FormArray;
    const transferFormGroup = this.fb.group({
      From: [From, Validators.required],
      To: [To, Validators.required],
      random_id: [random_id, Validators.required],
    });
    transfersArray.push(transferFormGroup);
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async confirmSubmission() {
    if (this.transfersArray.length === 0) {
      await this.showAlert(
        'الخانة فارغة',
        'لا يمكنك التحويل لعدم وجود البيانات',
      );
      return;
    }

    const alert = await this.alertController.create({
      header: 'تأكيد التحويل',
      message: 'هل أنت متأكد أنك تريد إتمام هذا التحويل؟',
      buttons: [
        {
          text: 'إلغاء',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => console.log('تم إلغاء التأكيد'),
        },
        { text: 'إرسال', handler: () => this.submitAllForms() },
      ],
    });

    await alert.present();
  }

  resetAllForms() {
    this.scanResults = [];
    this.transferForm.reset({
      reference_number: '',
      document_date: '',
      description: '',
      warehouse_code_from: '',
      warehouse_code_to: '',
    });

    (this.transferForm.get('items') as FormArray).clear();
    (this.transfer.get('transfers') as FormArray).clear();

    console.log('All forms have been reset.');
  }

  reduce(detail: any) {
    const productIndex = this.scanResults.findIndex((product) =>
      product.details.some(
        (d: { random_id: any }) => d.random_id === detail.random_id,
      ),
    );
    console.log('Product Index:', productIndex);

    console.log('Scan Results:', JSON.stringify(this.scanResults, null, 2));

    if (productIndex !== -1) {
      const product = this.scanResults[productIndex];
      console.log('Product:', JSON.stringify(product, null, 2));

      const detailIndex = product.details.findIndex(
        (d: { random_id: any }) => d.random_id === detail.random_id,
      );
      console.log('Detail Index:', detailIndex);

      console.log('Product Details:', JSON.stringify(product.details, null, 2));

      if (detailIndex !== -1) {
        const newerEntries = this.scanResults
          .filter((prod) => prod.item_code === product.item_code)
          .flatMap((prod) => prod.details)
          .filter((d: { created_at: string }) => {
            console.log('Comparing:', d.created_at, 'with', detail.created_at);
            return d.created_at > detail.created_at;
          });

        console.log('Newer Entries:', JSON.stringify(newerEntries, null, 2));

        if (newerEntries.length > 0) {
          const newerEntriesDates = newerEntries
            .map((entry) => entry.created_at)
            .join(', ');
          this.showAlert(
            'يوجد عنصر أحدث',
            `لا يمكنك إزالة هذا العنصر لأن هناك إدخالات أحدث لنفس العنصر. = ${newerEntriesDates}`,
          );
          return;
        }

        console.log('Removing Detail at Index:', detailIndex);
        product.details.splice(detailIndex, 1);
        product.quantity--;
        console.log(
          'Updated Product Details:',
          JSON.stringify(product.details, null, 2),
        );
        this.cdr.detectChanges();

        if (product.details.length === 0) {
          console.log(
            'No details left, removing product at Index:',
            productIndex,
          );
          this.scanResults.splice(productIndex, 1);
        }

        this.removeTransfer(detail.random_id);

        if (this.processedRandomIds.has(detail.random_id)) {
          this.processedRandomIds.delete(detail.random_id);
        }

        console.log(
          `Random ID ${detail.random_id} removed and re-enabled for processing.`,
        );
      }
    } else {
      console.log('Product not found for Random ID:', detail.random_id);
    }
  }

  removeTransfer(random_id: number) {
    const transfersArray = this.transfer.get('transfers') as FormArray;
    const index = transfersArray.value.findIndex(
      (x: { random_id: number }) => x.random_id === random_id,
    );

    if (index !== -1) {
      transfersArray.removeAt(index);
      console.log(`Transfer removed for random_id ${random_id}`);
    } else {
      console.log(`No transfer found for random_id ${random_id}`);
    }
  }

  fetchWh() {
    const token = this.authService.getToken(); // Get the token from AuthService
    if (!token) {
      this.showAlert('Error', 'User not logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    this.httpClient.get<any[]>('/api/wh/', { headers }).subscribe(
      (data) => {
        this.whList = data;
        console.log('Wh Data:', data);
      },
      (error) => {
        console.error('Error fetching data:', error);
      },
    );
  }

  fetchQr() {
    const token = this.authService.getToken(); // Get the token from AuthService
    if (!token) {
      this.showAlert('Error', 'User not logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    this.httpClient.get<any[]>('/api/QR/', { headers }).subscribe(
      (data) => {
        this.ProductList = data;
        console.log('QR Data:', this.ProductList);
      },
      (error) => {
        console.error('Error fetching data:', error);
      },
    );
  }

  fetchZpl() {
    const token = this.authService.getToken(); // Get the token from AuthService
    if (!token) {
      this.showAlert('Error', 'User not logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    });

    this.httpClient.get<any[]>('/api/ZPL/', { headers }).subscribe(
      (data) => {
        this.ZplList = data;
        console.log('Zpl Data:', this.ZplList);
      },
      (error) => {
        console.error('Error fetching Zpl data:', error);
      },
    );
  }
}
