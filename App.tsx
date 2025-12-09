import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './components/Button';
import { printerService } from './services/printerService';
import { 
  Customer, 
  Order, 
  Product, 
  CartItem, 
  ScreenName, 
  OrderStatus, 
  PaymentMethod 
} from './types';
import { MENU_ITEMS, CATEGORIES, APP_NAME } from './constants';

// FIX: Component defined OUTSIDE App to prevent re-mounting and loss of focus on inputs
const ScreenContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col items-center justify-start w-full animate-fade-in-up pb-10">
    {children}
  </div>
);

const App: React.FC = () => {
  // --- State ---
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('HOME');
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    address: '',
    reference: '',
    phone: '',
    paymentMethod: PaymentMethod.CASH
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const savedOrders = localStorage.getItem('lanchonete_orders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
  }, []);

  // --- Helpers ---
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const handleConnectPrinter = async () => {
    const connected = await printerService.connect();
    setIsPrinterConnected(connected);
    if (connected) alert("Impressora conectada com sucesso!");
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const handleFinalizeOrder = async () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      customer: { ...customer },
      items: [...cart],
      total: cartTotal,
      date: new Date().toISOString(),
      status: OrderStatus.PENDING
    };

    // Save
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('lanchonete_orders', JSON.stringify(updatedOrders));

    // Print
    await printerService.printOrder(newOrder);

    // Reset
    setCart([]);
    setCustomer({
      name: '',
      address: '',
      reference: '',
      phone: '',
      paymentMethod: PaymentMethod.CASH
    });
    alert("Pedido finalizado e enviado para impressão!");
    setCurrentScreen('HOME');
  };

  // --- Screens ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-screen w-full px-6 animate-fade-in-up">
      <div className="glass-panel p-10 rounded-2xl w-full max-w-md flex flex-col items-center border border-white/5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none" />
        
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-brand-gold to-yellow-200 mb-2 drop-shadow-sm text-center">
          {APP_NAME}
        </h1>
        <h2 className="text-xl font-light text-gray-400 mb-10 tracking-widest uppercase">Pedidos</h2>
        
        <div className="w-full space-y-4 relative z-10">
          <Button fullWidth onClick={() => setCurrentScreen('CUSTOMER_FORM')} className="text-xl">
            Realizar Novo Pedido
          </Button>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => setCurrentScreen('ORDER_HISTORY')}
          >
            Pedidos Prontos / Histórico
          </Button>
          
          <div className="pt-4 flex justify-center">
            <button 
              onClick={handleConnectPrinter}
              className={`text-sm flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isPrinterConnected ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              {isPrinterConnected ? 'Impressora Pronta' : 'Conectar Impressora'}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-white/20 text-sm">Sistema v1.1 - {APP_NAME}</p>
    </div>
  );

  const renderCustomerForm = () => (
    <ScreenContainer>
      <div className="w-full max-w-lg p-6 mt-4">
        <h2 className="text-3xl font-bold text-brand-gold mb-1 text-center">Novo Pedido</h2>
        <p className="text-center text-gray-400 mb-8">Preencha os dados do cliente</p>
        
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div>
            <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Nome do Cliente</label>
            <input 
              type="text" 
              placeholder="Ex: João Silva"
              className="glass-input w-full p-4 rounded-xl"
              value={customer.name}
              onChange={e => setCustomer(prev => ({...prev, name: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Telefone / WhatsApp</label>
            <input 
              type="tel" 
              placeholder="(00) 00000-0000"
              className="glass-input w-full p-4 rounded-xl"
              value={customer.phone}
              onChange={e => setCustomer(prev => ({...prev, phone: e.target.value}))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Endereço</label>
              <input 
                type="text" 
                placeholder="Rua, Número"
                className="glass-input w-full p-4 rounded-xl"
                value={customer.address}
                onChange={e => setCustomer(prev => ({...prev, address: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Referência</label>
              <input 
                type="text" 
                placeholder="Ex: Prox. à padaria"
                className="glass-input w-full p-4 rounded-xl"
                value={customer.reference}
                onChange={e => setCustomer(prev => ({...prev, reference: e.target.value}))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Pagamento</label>
            <div className="relative">
              <select 
                className="glass-input w-full p-4 rounded-xl appearance-none"
                value={customer.paymentMethod}
                onChange={e => setCustomer(prev => ({...prev, paymentMethod: e.target.value as PaymentMethod}))}
              >
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method} className="bg-brand-secondary text-white">{method}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brand-gold">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="secondary" onClick={() => setCurrentScreen('HOME')} className="flex-1">
            Cancelar
          </Button>
          <Button 
            className="flex-1" 
            onClick={() => {
              if(!customer.name || !customer.address) {
                alert("Preencha pelo menos Nome e Endereço.");
                return;
              }
              setCurrentScreen('MENU');
            }}
          >
            Continuar
          </Button>
        </div>
      </div>
    </ScreenContainer>
  );

  const renderMenu = () => {
    const filteredProducts = MENU_ITEMS.filter(p => p.category === selectedCategory);
    
    return (
      <div className="flex flex-col h-screen w-full animate-fade-in-up">
        {/* Header Glass */}
        <div className="p-4 bg-brand-dark/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-20 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-brand-gold">Cardápio</h2>
            <p className="text-xs text-gray-400">{customer.name}</p>
          </div>
          <div className="text-right bg-black/30 px-3 py-1 rounded-lg border border-white/10">
             <span className="text-[10px] block text-gray-400 uppercase tracking-wider">Total Pedido</span>
             <span className="font-bold text-xl text-brand-gold">R$ {cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto p-4 gap-3 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all duration-300 ${
                selectedCategory === cat 
                  ? 'bg-brand-gold text-brand-dark shadow-[0_0_15px_rgba(214,187,86,0.3)]' 
                  : 'bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-3">
          {filteredProducts.map(product => {
            const inCart = cart.find(i => i.id === product.id);
            return (
              <div key={product.id} className="glass-panel p-4 rounded-xl flex justify-between items-center group hover:bg-white/5 transition-colors">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-100">{product.name}</h3>
                  <p className="text-brand-gold font-mono">R$ {product.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-lg border border-white/5">
                  {inCart ? (
                    <>
                      <button 
                        onClick={() => handleRemoveFromCart(product.id)}
                        className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-red-500/80 text-white flex items-center justify-center font-bold text-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold font-mono text-lg">{inCart.quantity}</span>
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="w-8 h-8 rounded-lg bg-brand-gold text-brand-dark hover:brightness-110 flex items-center justify-center font-bold text-lg transition-all"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 hover:bg-brand-gold hover:text-brand-dark hover:border-transparent transition-all font-semibold"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Bar */}
        <div className="absolute bottom-6 left-0 w-full px-4 z-20">
          <div className="glass-panel p-2 rounded-2xl flex gap-3 shadow-2xl bg-[#292927]/90 backdrop-blur-xl border-t border-white/10">
            <Button variant="secondary" onClick={() => setCurrentScreen('CUSTOMER_FORM')} className="flex-1 py-3 text-sm">
              Voltar
            </Button>
            <Button 
              className="flex-[2] py-3 text-sm relative overflow-hidden" 
              disabled={cart.length === 0}
              onClick={() => setCurrentScreen('SUMMARY')}
            >
              {cart.length > 0 && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2 mt-2"></span>}
              Ver Resumo ({cart.reduce((a, b) => a + b.quantity, 0)})
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <ScreenContainer>
      <div className="w-full max-w-lg p-6 flex flex-col h-screen pb-10">
        <h2 className="text-3xl font-bold text-brand-gold mb-1 text-center">Revisão</h2>
        <p className="text-center text-gray-400 mb-6">Confira os detalhes</p>
        
        {/* Receipt Styled Card */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col flex-1 mb-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-50"></div>
          
          <div className="p-6 bg-white/5 border-b border-white/5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-white text-lg">{customer.name}</h3>
                <p className="text-sm text-gray-400">{customer.address}</p>
                {customer.reference && <p className="text-xs text-gray-500 mt-1 italic">Obs: {customer.reference}</p>}
              </div>
              <span className="bg-brand-gold/20 text-brand-gold px-3 py-1 rounded-full text-xs font-bold border border-brand-gold/20">
                {customer.paymentMethod}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Itens do Pedido</h3>
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-white/10 text-xs font-bold text-brand-gold">
                    {item.quantity}x
                  </span>
                  <span className="text-gray-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 font-mono hidden group-hover:block text-xs">R$ {item.price.toFixed(2)} un</span>
                  <span className="font-bold text-white font-mono">R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-black/20 border-t border-white/5">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 mb-1">Total a pagar</span>
              <span className="text-4xl font-bold text-brand-gold">R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <Button variant="secondary" onClick={() => setCurrentScreen('MENU')} className="flex-1">
            Editar
          </Button>
          <Button className="flex-[2] shadow-[0_0_30px_rgba(214,187,86,0.2)] text-base" onClick={handleFinalizeOrder}>
            🖨️ Finalizar e Imprimir
          </Button>
        </div>
      </div>
    </ScreenContainer>
  );

  const renderHistory = () => (
    <ScreenContainer>
      <div className="w-full max-w-2xl p-6 h-screen flex flex-col pb-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-brand-gold">Pedidos Prontos</h2>
            <p className="text-sm text-gray-500">Histórico recente</p>
          </div>
          <Button variant="secondary" onClick={() => setCurrentScreen('HOME')} className="px-4 py-2 text-sm h-10">
            ← Voltar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {orders.length === 0 && (
            <div className="text-center mt-20 opacity-50">
               <div className="text-6xl mb-4">🧾</div>
               <p className="text-gray-400">Nenhum pedido realizado ainda.</p>
            </div>
          )}
          {orders.map(order => (
            <div key={order.id} className="glass-panel p-5 rounded-2xl flex flex-col gap-4 group hover:bg-white/5 transition-all border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-xl">
                    {order.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-white">{order.customer.name}</h3>
                    <p className="text-xs text-gray-400">
                      {new Date(order.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="block font-bold text-brand-gold text-2xl">R$ {order.total.toFixed(2)}</span>
                   <span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded text-gray-300">{order.customer.paymentMethod}</span>
                </div>
              </div>
              
              <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                <p className="text-sm text-gray-300">
                  {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                 <Button 
                   variant="primary" 
                   fullWidth
                   onClick={() => printerService.printOrder(order)}
                   className="py-3 text-sm flex items-center justify-center gap-2"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                   Imprimir Cupom
                 </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenContainer>
  );

  return (
    <div className="font-sans text-brand-light">
      {currentScreen === 'HOME' && renderHome()}
      {currentScreen === 'CUSTOMER_FORM' && renderCustomerForm()}
      {currentScreen === 'MENU' && renderMenu()}
      {currentScreen === 'SUMMARY' && renderSummary()}
      {currentScreen === 'ORDER_HISTORY' && renderHistory()}
    </div>
  );
};

export default App;