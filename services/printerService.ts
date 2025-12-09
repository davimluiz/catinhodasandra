import { Order } from '../types';

// Fix: Define missing Web Bluetooth types locally
interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer;
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const AT = 0x40; // Initialize
const LF = 0x0A; // Line Feed
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
// const ALIGN_RIGHT = [ESC, 0x61, 0x02];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const CUT_PAPER = [GS, 0x56, 0x41, 0x00]; // Cut full

// Helper to remove accents for printer compatibility (basic ASCII)
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

class PrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect() {
    // Fix: Cast navigator to any to access bluetooth API
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert("WebBluetooth não suportado neste navegador. Use Chrome ou Edge.");
      return false;
    }

    try {
      // Request device - Generic serial service often used by printers
      this.device = await nav.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Standard Printer Service
        ],
        optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb', // Specific
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Some Chinese thermal printers
             0xFF00, // Generic
        ],
        acceptAllDevices: false 
      });
      
      // Note: allowAllDevices: true is not safe for production, usually we filter by service.
      // If the above filter doesn't work for your specific printer, you might need to find its UUID.
      // For this demo, we assume a standard BLE printer profile or fallback.
      
      if (!this.device || !this.device.gatt) return false;

      const server = await this.device.gatt.connect();
      // Try to get the primary service
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      // Characteristic for Write (usually 2AF1)
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      
      return true;

    } catch (error) {
      console.error("Erro ao conectar impressora:", error);
      alert("Falha ao conectar. Verifique se a impressora está ligada e pareada.");
      return false;
    }
  }

  async printOrder(order: Order) {
    if (!this.characteristic) {
      const connected = await this.connect();
      if (!connected) return;
    }

    const encoder = new TextEncoder();
    const commands: number[] = [];

    // Helper to push bytes
    const add = (arr: number[]) => commands.push(...arr);
    const text = (str: string) => {
        const normalized = normalizeText(str);
        const bytes = encoder.encode(normalized);
        bytes.forEach(b => commands.push(b));
    };
    const newLine = () => commands.push(LF);

    // Build Receipt
    add([ESC, AT]); // Init
    add(ALIGN_CENTER);
    add(BOLD_ON);
    text("LANCHONETE PEDIDOS\n");
    add(BOLD_OFF);
    text("--------------------------------\n");
    add(ALIGN_LEFT);
    text(`Pedido: #${order.id.slice(0, 8)}\n`);
    text(`Data: ${new Date(order.date).toLocaleString('pt-BR')}\n`);
    text(`Cliente: ${order.customer.name}\n`);
    text(`Tel: ${order.customer.phone}\n`);
    text(`End: ${order.customer.address}\n`);
    if(order.customer.reference) text(`Ref: ${order.customer.reference}\n`);
    text(`Pagamento: ${order.customer.paymentMethod}\n`);
    
    add(ALIGN_CENTER);
    text("--------------------------------\n");
    add(ALIGN_LEFT);
    add(BOLD_ON);
    text("ITENS\n");
    add(BOLD_OFF);
    
    order.items.forEach(item => {
        text(`${item.quantity}x ${item.name}\n`);
        const subtotal = item.price * item.quantity;
        // Simple right alignment simulation (assuming ~32 chars width)
        text(`R$ ${subtotal.toFixed(2)}\n`);
    });

    add(ALIGN_CENTER);
    text("--------------------------------\n");
    add(BOLD_ON);
    // Double height/width for total
    add([GS, 0x21, 0x11]); 
    text(`TOTAL: R$ ${order.total.toFixed(2)}\n`);
    add([GS, 0x21, 0x00]); // Reset size
    add(BOLD_OFF);
    newLine();
    text("Obrigado pela preferencia!\n");
    newLine();
    newLine();
    newLine();
    add(CUT_PAPER);

    try {
        // Send in chunks to avoid buffer overflow
        const uint8Array = new Uint8Array(commands);
        const chunkSize = 512;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            if(this.characteristic) {
                await this.characteristic.writeValue(chunk);
            }
        }
    } catch (e) {
        console.error("Erro na impressão:", e);
        alert("Erro ao enviar dados para impressora.");
    }
  }
}

export const printerService = new PrinterService();