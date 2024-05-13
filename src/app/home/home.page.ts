import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, } from '@angular/core';
import { IonSelectOption, IonSelect, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, IonItem, IonLabel, IonInput, IonList, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle, IonApp, IonButtons, IonMenu, IonMenuButton, IonRange, IonGrid } from '@ionic/angular/standalone';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { addIcons } from 'ionicons';
import { barcodeOutline, removeCircle, search } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormBuilder, ReactiveFormsModule, FormGroup, Validators, FormControl, FormsModule, FormArray, Form } from '@angular/forms';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [FormsModule, IonGrid, IonMenu, IonButtons, IonApp, IonSelectOption, IonSelect, IonCardSubtitle, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonList, CommonModule, HttpClientModule, IonInput, IonLabel, IonItem, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonRow, IonCol, ReactiveFormsModule, IonMenuButton, IonRange],
})
export class HomePage implements AfterViewInit {
  globalForm: FormGroup;
  transferForm: FormGroup;
  transfer: FormGroup;
  selectableFrom: { displayText: string, value: number }[] = [];

  constructor(private cdr: ChangeDetectorRef,
    private alertController: AlertController,
    private httpClient: HttpClient,
    private fb: FormBuilder) {
    addIcons({ barcodeOutline, search, removeCircle, });

    this.globalForm = new FormGroup({
      To: new FormControl(),  // Control for the global destination select
      From: new FormControl()  // Control for the global source select
    });
    this.transferForm = this.fb.group({
      reference_number: ['', Validators.required], //id of transfer
      document_date: ['', Validators.required], // data now
      description: ['', Validators.required], // transfer done
      warehouse_code_from: ['', Validators.required], // wh_smacc_code
      warehouse_code_to: ['', Validators.required], // To
      items: this.fb.array([]) // item_code , quantity frac , quantity, id
    });
    this.transfer = this.fb.group({
      transfers: this.fb.array([])
    });

  }
  // createTransferGroup(): FormGroup {
  //   return this.fb.group({
  //     From: ['', Validators.required],  // You may add more validators as required
  //     To: ['', Validators.required],    // You may add more validators as required
  //     quantity: [0, [Validators.required, Validators.min(1)]] // Validators can ensure positive numbers
  //   });
  // }

  ngAfterViewInit() {
    this.prepare();
    this.FetchWh();
    this.fetchQr();
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
  DisplayTextFrom: string = "أختر المخزون (من)"; // Default placeholder text
  DisplayTextTo: string = "أختر المخزون (إلى)"; // Default placeholder text
  ProductList: any[] = [];
  product: any;
  scanResults: any[] = []; // Array to hold results from each scan
  maxQuantity: number = 0;  // Default to 1 or a sensible minimum

  // allFormsValid(): boolean {
  //   // Check if there are any forms at all
  //   if (this.scanResults.length === 0) {
  //     // console.log("No forms to validate."); // Debugging form validation
  //     return false; // If no forms, return false since we require at least one form to submit
  //   }

  //   // Check all forms for validity and that 'From' has a value
  //   const valid = this.scanResults.every(item =>
  //     item.form.valid && item.form.get('From').value != null && item.form.get('From').value !== ''
  //   );

  //   // console.log("All forms valid:", valid); // Debugging form validation
  //   // console.log("All forms:", this.scanResults); // Debugging form validation
  //   return valid;
  // }



  prepare = () => {
    BarcodeScanner.prepare();
  };


  onWarehouseChangeFrom(event: any) {
    const selectedWarehouse = event.detail.value; // Ionic passes the entire object as the value when set this way
    this.globalForm.get('From')?.setValue(selectedWarehouse.id);
    this.transferForm.get('warehouse_code_from')?.setValue(selectedWarehouse.Smacc_Code);
    this.DisplayTextFrom = selectedWarehouse.name;
    console.log('To Selected Warehouse:', this.globalForm.get('To')?.value);
    console.log('From Selected Warehouse:', this.globalForm.get('From')?.value);
  }
  onWarehouseChangeTo(event: any) {
    const selectedWarehouse = event.detail.value; // Ionic passes the entire object as the value when set this way
    this.globalForm.get('To')?.setValue(selectedWarehouse.id);
    this.transferForm.get('warehouse_code_to')?.setValue(selectedWarehouse.Smacc_Code);
    this.DisplayTextTo = selectedWarehouse.name;
    console.log('To Selected Warehouse:', this.globalForm.get('To')?.value);
    console.log('From Selected Warehouse:', this.globalForm.get('From')?.value);
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
    const body = document.querySelector('body');
    body?.classList.remove('scanner-active');  // Remove the class when stopping the scan
    this.scanActive = false;
  }


  async fetchDataFromApi() {
    const apiUrl = this.result;
    if (!apiUrl) {
      console.error('No URL provided for fetching data.');
      await this.showAlert('الخانة فارغة', 'الخانة فارغة يرجى المحاولة مرة أخرى');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });

    this.httpClient.get<any>(apiUrl, { headers }).subscribe(
      async data => {
        console.log('API Data:', data);


        // Find the next eligible product based on created_at and quantity
        const eligibleProduct = this.ProductList.find(product =>
          product.item_code === data.item_code &&
          !this.scanResults.some(res => res.id === product.id && res.quantity >= product.quantity)
        );

        if (eligibleProduct && data.created_at === eligibleProduct.created_at) {
          // Continue processing as normal
          const existingEntryIndex = this.scanResults.findIndex(item => item.id === data.id);
          if (existingEntryIndex !== -1) {
            const existingEntry = this.scanResults[existingEntryIndex];
            existingEntry.quantity = Math.min(existingEntry.quantity + 1, existingEntry.maxQuantity);
            this.addTransfer(data.id, this.globalForm.get('To')?.value, existingEntry.quantity, existingEntry.maxQuantity);
            const itemIndex = (this.transferForm.get('items') as FormArray).value.findIndex((x: { id: any; }) => x.id === data.id);
            this.addItem(data.unit_fraction, 1, data.item_code, data.id, existingEntry.maxQuantity, itemIndex); // Update existing item
            console.log('local api post contains:', this.transfer.value);
            console.log('Smack form contains:', this.transferForm.value);
            console.log('Scan results:', this.scanResults);
          } else {
            // Add new entry
            this.scanResults.push({
              id: data.id,
              productunit_name: data.productunit_name,
              created_at: data.created_at,
              quantity: 1,
              maxQuantity: data.quantity,
              item_code: data.item_code,
            });
            this.addTransfer(data.id, this.globalForm.get('To')?.value, 1, data.quantity); // Add the missing argument 'maxQuantity'
            this.addItem(data.unit_fraction, 1, data.item_code, data.id, data.quantity); // Add as new item with 'maxQuantity'
          }

          this.transferForm.patchValue({
            warehouse_code_from: data.wh_smacc_code
          });
          console.log('Form contains:', this.transferForm.value);
          console.log('Scan results:', this.scanResults);
        } else {
          if (!eligibleProduct?.id) {
            console.log('The item is full.');
            await this.showAlert('العنصر ممتلئ', 'العنصر ممتلئ');
          } else {
            console.log(`This is not the lowest created_at. The lowest is ProductList.id = ${eligibleProduct?.id}`);
            await this.showAlert('!يوجد أقدم', `رمز الصنف الأقدم هو ${eligibleProduct?.id}`);
          }
        }
      },
      async error => {
        console.error('Error fetching data:', error);
        await this.showAlert('لا يوجد!', 'البيانات غير متوفرة');
      }
    );

    this.cdr.detectChanges();
  }

  async submitAllForms() {
    // const formData = result.form.value;
    if (this.transfersArray.length === 0) {
      await this.showAlert('الخانة فارغة', 'لا يمكنك التحويل لعدم وجود البيانات');
      return;
    }
    console.log('Submitting:', this.transfer.value);  // Logging the form data for debugging

    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });

    this.httpClient.post<any>("/api/Track/", this.transfer.value, { headers }).subscribe(
      async response => {
        console.log('Successful POST:', response);  // Successful POST operation
        // Assuming response contains an id we can use as reference_number
        if (response && response.id) {
          // Update the form with the received id f needed
          this.transferForm.patchValue({
            reference_number: response.id,
            document_date: new Date().toISOString().slice(0, 10),
            description: 'Transfer done'
          });
          // Optionally, update other parts of your application state
        }
        this.smacc();
        await this.showAlert('Success', 'Posted successfully!');
      },
      async error => {
        console.error('Error posting data:', error);  // Error during POST operation
        await this.showAlert('Error', 'Failed to post data!');
      }
    );

  }

  smacc() {
    console.log('START Submitting smacc:');
    // Extract the value and modify data for submission
    let submissionData = this.transferForm.value;

    // Map over items and exclude 'id' from each item
    submissionData.items = submissionData.items.map((item: any) => {
      const { id, ...itemWithoutId } = item; // Destructure to exclude 'id'
      return itemWithoutId;
    });


    const headers = new HttpHeaders({
      'Authorization': 'SUPP eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzM5MzA1MTYzLCJpYXQiOjE3MDc3NjkxNjMsImp0aSI6IjM5YzdmYzVlMmQ2YTQ1MGRiZTYwZjIxNmIwZTViMjljIiwidXNlcl9pZCI6MTJ9.-P2ZPwdyUkImvm34_RWi-fB3Pjk_rFGzKAc7Ywg8uSo',
      'Content-Type': 'application/json'
    });

    this.httpClient.post<any>("https://mysupplier.mozzn.com/smacc/stocks_transfers/", submissionData, { headers }).subscribe(
      async response => {
        console.log('Successful POST:', response);  // Successful POST operation
        this.resetAllForms();  // Call a new method to reset all forms
        await this.showAlert('Success', response.result);
        this.cdr.detectChanges();
      },
      async error => {
        console.error('Error posting data:', error);  // Error during POST operation
        this.resetAllForms();  // Call a new method to reset all forms
        await this.showAlert('Error', 'Failed to post SMACC transfer!');
        this.cdr.detectChanges();
      }
    );
  }

  get items(): FormArray {
    return this.transferForm.get('items') as FormArray;
  }

  get transfersArray(): FormArray {
    return this.transfer.get('transfers') as FormArray;
  }


  addTransfer(From: number, To: number, quantity: number, maxQuantity: number, index?: number): void {
    const transfersArray = this.transfer.get('transfers') as FormArray;
    const existingTransferIndex = transfersArray.value.findIndex((x: { From: number; To: number; }) => x.From === From && x.To === To);

    if (existingTransferIndex !== -1) {
      const existingGroup = transfersArray.at(existingTransferIndex) as FormGroup;
      let existingQuantity = existingGroup.get('quantity')?.value;
      // Ensure we do not exceed the maximum allowed quantity
      existingQuantity = Math.min(existingQuantity + quantity, maxQuantity);
      existingGroup.patchValue({ quantity: existingQuantity });
    } else {
      // If not found, create a new FormGroup and add it to the FormArray
      const transferFormGroup = this.fb.group({
        From: [From, Validators.required],
        To: [To, Validators.required],
        quantity: [Math.min(quantity, maxQuantity), [Validators.required, Validators.min(1)]]
      });
      transfersArray.push(transferFormGroup);
    }
  }


  addItem(unitFraction: number, quantity: number, itemCode: string, id: number, maxQuantity: number, index?: number): void {
    const itemsArray = this.transferForm.get('items') as FormArray;
    if (index != null && itemsArray.at(index)) {
      const itemFormGroup = itemsArray.at(index) as FormGroup;
      let currentQuantity = itemFormGroup.get('quantity')?.value;
      // Ensure the quantity does not exceed maxQuantity
      currentQuantity = Math.min(currentQuantity + quantity, maxQuantity);
      itemFormGroup.patchValue({
        quantity: currentQuantity
      });
    } else {
      const itemFormGroup = this.fb.group({
        unit_fraction: [unitFraction, Validators.required],
        quantity: [Math.min(quantity, maxQuantity), [Validators.required, Validators.min(1)]],
        item_code: [itemCode, Validators.required],
        id: [id, Validators.required],
      });
      itemsArray.push(itemFormGroup);
    }
  }



  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }


  async confirmSubmission() {
    if (this.transfersArray.length === 0) {
      await this.showAlert('الخانة فارغة', 'لا يمكنك التحويل لعدم وجود البيانات');
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
          handler: () => {
            console.log('تم إلغاء التأكيد');
          }
        }, {
          text: 'إرسال',
          handler: () => {
            this.submitAllForms(); // call submit method
          }
        }
      ]
    });

    await alert.present();
  }

  // Method to reset all forms
  resetAllForms() {
    this.scanResults = [];  // Resetting the scanResults array
    // Resets the main form controls to initial values or empty strings if no initial values were set
    this.transferForm.reset({
      reference_number: '',
      document_date: '',
      description: '',
      warehouse_code_from: '',
      warehouse_code_to: ''
    });

    // Clears all items in the 'items' FormArray
    const itemsFormArray = this.transferForm.get('items') as FormArray;
    itemsFormArray.clear();  // Clears all form groups within the array

    // Clears all transfers in the 'transfers' FormArray
    const transfersFormArray = this.transfer.get('transfers') as FormArray;
    transfersFormArray.clear();  // Clears all form groups within the array

    console.log('All forms have been reset.');
  }

  reduce(item: any) {
    // Find the item in the scanResults array
    const productIndex = this.scanResults.findIndex(result => result.id === item.id);
    if (productIndex !== -1) {
      const product = this.scanResults[productIndex];

      // Decrease the quantity in the scanResults
      if (product.quantity > 1) {
        product.quantity--;

        // Reduce quantity in the transferForm items
        const itemsFormArray = this.transferForm.get('items') as FormArray;
        const formGroupIndex = itemsFormArray.value.findIndex((x: { id: any; }) => x.id === item.id); // Assuming 'item_code' is the linking field
        if (formGroupIndex !== -1) {
          let currentQuantity = itemsFormArray.at(formGroupIndex).get('quantity')?.value;
          if (currentQuantity > 1) {
            itemsFormArray.at(formGroupIndex).get('quantity')?.setValue(currentQuantity - 1);
          } else {
            itemsFormArray.removeAt(formGroupIndex); // Remove the FormGroup if quantity falls to 0
          }
        }

        // Reduce quantity in the transfer array
        const transfersArray = this.transfer.get('transfers') as FormArray;
        const transferIndex = transfersArray.value.findIndex((x: { From: number; }) => x.From === item.id);
        if (transferIndex !== -1) {
          const transferFormGroup = transfersArray.at(transferIndex) as FormGroup;
          const transferQuantity = transferFormGroup.get('quantity')?.value;
          if (transferQuantity > 1) {
            transferFormGroup.patchValue({ quantity: transferQuantity - 1 });
          } else {
            transfersArray.removeAt(transferIndex); // Remove the FormGroup if quantity falls to 0
          }
        }

      } else {
        // If quantity is 1 or less, remove the product from scanResults and FormArray
        this.scanResults.splice(productIndex, 1);

        const itemsFormArray = this.transferForm.get('items') as FormArray;
        const formGroupIndex = itemsFormArray.value.findIndex((x: { id: any; }) => x.id === item.id); // Assuming 'item_code' is the linking field
        if (formGroupIndex !== -1) {
          itemsFormArray.removeAt(formGroupIndex); // Remove the FormGroup as well
        }

        // Remove the corresponding transfer entry as well
        const transfersArray = this.transfer.get('transfers') as FormArray;
        const transferIndex = transfersArray.value.findIndex((x: { From: number; }) => x.From === item.id);
        if (transferIndex !== -1) {
          transfersArray.removeAt(transferIndex); // Remove the FormGroup as well
        }
      }

      // Log the updated scanResults and transferForm values for debugging purposes
      console.log('Updated scanResults:', this.scanResults);
      console.log('Updated transferForm:', this.transferForm.value);
      console.log('Updated transfers:', this.transfer.value);
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
        console.log('Wh Data:', data);  // Successful POST operation
      },
      error => {
        console.error('Error posting data:', error);  // Error during POST operation
      }
    );
  }

  fetchQr() {
    const headers = new HttpHeaders({
      'Authorization': 'Token e60c85b3f42fdd2c3f4d9ecb394b99d532f312f1',
      'Content-Type': 'application/json'
    });
    // Get the data
    this.httpClient.get<any[]>("/api/QR/", { headers }).subscribe(
      data => {
        this.ProductList = data;
        console.log('QR Data:', this.ProductList);
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