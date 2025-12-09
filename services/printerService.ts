import { Order } from '../types';

// WebUSB Type Definitions
interface USBDevice {
  opened: boolean;
  configuration: {
    interfaces: {
      interfaceNumber: number;
      alternate: {
        endpoints: {
          direction: string;
          endpointNumber: number;
        }[];
      };
    }[];
  } | null;
  open(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
  close(): Promise<void>;
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const AT = 0x40; // Initialize
const LF = 0x0A; // Line Feed
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const CUT_PAPER = [GS, 0x56, 0x41, 0x00]; // Cut full

// Helper to remove accents
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

class PrinterService {
  private device: USBDevice | null = null;
  private interfaceNumber: number = 0;
  private endpointNumber: number | null = null;

  async connect() {
    const nav = navigator as any;
    if (!nav.usb) {
      alert("WebUSB não é suportado neste navegador. Use Google Chrome ou Edge.");
      return false;
    }

    try {
      // Request any USB device. The user will filter visually in the browser popup.
      // We can't filter effectively by class because many cheap printers define class 0 (per interface).
      this.device = await nav.usb.requestDevice({ filters: [] });
      
      if (!this.device) return false;

      await this.device.open();
      
      // Select configuration #1 (standard for most devices)
      await this.device.selectConfiguration(1);

      // Attempt to find the interface and endpoint for printing
      // We look for a Bulk OUT endpoint
      const config = this.device.configuration;
      if (!config) throw new Error("Configuração USB não encontrada");

      const iface = config.interfaces[0]; // Usually interface 0
      this.interfaceNumber = iface.interfaceNumber;

      await this.device.claimInterface(this.interfaceNumber);

      // Find the endpoint that is Direction: OUT and Type: BULK
      const endpoint = iface.alternate.endpoints.find((e: any) => e.direction === 'out');
      
      if (!endpoint) {
        throw new Error("Endpoint de saída não encontrado na impressora.");
      }

      this.endpointNumber = endpoint.endpointNumber;
      return true;

    } catch (error) {
      console.error("Erro ao conectar impressora USB:", error);
      alert("Falha ao conectar via USB. Certifique-se que o cabo está conectado e você selecionou o dispositivo correto.");
      return false;
    }
  }

  async printOrder(order: Order) {
    if (!this.device || !this.device.opened) {
      const connected = await this.connect();
      if (!connected) return;
    }

    if (this.endpointNumber === null) {
        alert("Impressora conectada, mas endpoint de escrita não identificado.");
        return;
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

    // Build Receipt Content
    add([ESC, AT]); // Init
    add(ALIGN_CENTER);
    add(BOLD_ON);
    text("CANTINHO DA SANDRA\n");
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
    newLine();
    add(CUT_PAPER);

    try {
        const uint8Array = new Uint8Array(commands);
        // Send data to the printer
        await this.device.transferOut(this.endpointNumber, uint8Array);
    } catch (e) {
        console.error("Erro na impressão USB:", e);
        alert("Erro ao enviar dados para impressora USB. Tente reconectar.");
        // Attempt to cleanup/reset on error
        try { await this.device.close(); } catch(err) {}
    }
  }
}

export const printerService = new PrinterService();