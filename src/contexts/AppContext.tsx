import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  useSupabaseProperties, 
  useSupabaseClients, 
  useSupabaseContracts, 
  useSupabasePayments, 
  useSupabaseMaintenance 
} from '@/hooks/useSupabaseData';

export interface Unit {
    number: string;
    floor: number;
    isAvailable: boolean;
    rentedBy?: number; // Client ID
}

export interface Property {
    id: number;
    name: string;
    type: string;
    location: string;
    floors: number;
    totalUnits: number;
    rentedUnits: number;
    availableUnits: number;
    price: number;
    currency: string;
    status: string;
    units: Unit[];
    unitsPerFloor?: number;
    unitFormat?: string;
}

export interface Client {
    id: number;
    name: string;
    phone: string;
    email: string;
    idNumber: string;
    nationality: string;
    address: string;
    type: string;
    properties: number[];
}

export interface Contract {
    id: number;
    uuid?: string; // The actual UUID from database
    propertyId: number;
    clientId: number;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    currency: string;
    paymentSchedule: string;
    paymentMethod: string;
    unitNumber?: string;
    numberOfPayments?: string;
    checkDates?: string;
    paymentDates?: string;
    checkNumbers?: string;
    bankName?: string;
    status?: 'active' | 'terminated';
    terminatedDate?: string;
}

export interface Payment {
    id: number;
    contractId: number | string;
    amount: number;
    currency: string;
    dueDate: string;
    paidDate?: string;
    paymentMethod: string;
    checkNumber?: string;
    bankName?: string;
    status: 'paid' | 'pending' | 'scheduled' | 'overdue';
}

export interface MaintenanceRequest {
    id: number;
    propertyId: number;
    description: string;
    priority: string;
    status: string;
    requestDate: string;
    completedDate?: string;
}

interface AppContextType {
    properties: Property[];
    clients: Client[];
    contracts: Contract[];
    payments: Payment[];
    maintenanceRequests: MaintenanceRequest[];
    currency: string;
    theme: string;
    language: string;
    addProperty: (property: Omit<Property, 'id'>) => Promise<number>;
    reserveUnit: (propertyId: number, unitNumber: string, clientId: number) => Promise<boolean>;
    releaseUnit: (propertyId: number, unitNumber: string) => Promise<void>;
    addClient: (client: Omit<Client, 'id'>) => Promise<number>;
    addContract: (contract: Omit<Contract, 'id'>) => Promise<string>;
    addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
    addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id'>) => Promise<void>;
    updateProperty: (id: number, property: Partial<Property>) => Promise<void>;
    updateClient: (id: number, client: Partial<Client>) => Promise<void>;
    updateContract: (id: number, contract: Partial<Contract>) => Promise<void>;
    updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
    deleteProperty: (id: number) => Promise<void>;
    deleteClient: (id: number) => Promise<void>;
    deleteContract: (id: number) => Promise<void>;
    terminateContract: (id: number) => Promise<void>;
    renewContract: (id: number, newEndDate: string) => Promise<void>;
    confirmPayment: (id: number) => Promise<void>;
    updatePaymentStatuses: () => void;
    setCurrency: (currency: string) => void;
    setTheme: (theme: string) => void;
    setLanguage: (language: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    
    // Import Supabase hooks for data persistence
    const { 
      properties: supabaseProperties, 
      addProperty: addSupabaseProperty,
      updateProperty: updateSupabaseProperty,
      deleteProperty: deleteSupabaseProperty,
      refetch: refetchProperties
    } = useSupabaseProperties();
    
    const { 
      clients: supabaseClients,
      addClient: addSupabaseClient,
      updateClient: updateSupabaseClient,
      deleteClient: deleteSupabaseClient
    } = useSupabaseClients();
    
    const {
      contracts: supabaseContracts,
      addContract: addSupabaseContract,
      updateContract: updateSupabaseContract,
      deleteContract: deleteSupabaseContract,
      refetch: refetchContracts
    } = useSupabaseContracts();
    
    const {
      payments: supabasePayments,
      addPayment: addSupabasePayment,
      updatePayment: updateSupabasePayment,
      deletePayment: deleteSupabasePayment,
      refetch: refetchPayments
    } = useSupabasePayments();
    
    const {
      maintenanceRequests: supabaseMaintenance,
      addMaintenanceRequest: addSupabaseMaintenance,
      updateMaintenanceRequest: updateSupabaseMaintenance,
      deleteMaintenanceRequest: deleteSupabaseMaintenance
    } = useSupabaseMaintenance();

    const [currency, setCurrencyState] = useState(() =>
        localStorage.getItem('currency') || 'AED'
    );

    const [theme, setThemeState] = useState(() =>
        localStorage.getItem('theme') || 'light'
    );

    const [language, setLanguageState] = useState(() =>
        localStorage.getItem('language') || 'ar'
    );

    useEffect(() => {
        localStorage.setItem('currency', currency);
    }, [currency]);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    const generateUnits = (floors: number, unitsPerFloor: number, unitFormat: string, availableUnits?: number) => {
        const units: Unit[] = [];
        const totalUnits = floors * unitsPerFloor;
        
        const actualAvailableUnits = availableUnits !== undefined ? availableUnits : totalUnits;
        const rentedUnits = Math.max(0, totalUnits - actualAvailableUnits);
        
        for (let floor = 1; floor <= floors; floor++) {
            for (let unit = 1; unit <= unitsPerFloor; unit++) {
                let unitNumber = "";
                
                if (unitFormat === "101") {
                    unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
                } else if (unitFormat === "01") {
                    const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                    unitNumber = totalUnitIndex.toString().padStart(2, '0');
                } else if (unitFormat === "1") {
                    const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                    unitNumber = totalUnitIndex.toString();
                } else if (unitFormat === "A1") {
                    const floorLetter = String.fromCharCode(64 + floor);
                    unitNumber = `${floorLetter}${unit}`;
                } else {
                    unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
                }
                
                const totalUnitIndex = (floor - 1) * unitsPerFloor + unit - 1;
                const isAvailable = totalUnitIndex >= rentedUnits;
                
                units.push({
                    number: unitNumber,
                    floor: floor,
                    isAvailable: isAvailable,
                });
            }
        }
        
        return units;
    };

    const addProperty = async (property: Omit<Property, 'id'>) => {
        let units: Unit[] = property.units || [];
        if ((property.unitsPerFloor && property.unitFormat) || units.length === 0) {
            if (property.unitsPerFloor && property.unitFormat) {
                units = generateUnits(property.floors, property.unitsPerFloor, property.unitFormat, property.availableUnits);
            } else {
                units = [];
                for (let i = 1; i <= property.totalUnits; i++) {
                    const isAvailable = i <= property.availableUnits;
                    units.push({
                        number: i.toString(),
                        floor: Math.ceil(i / Math.max(1, Math.floor(property.totalUnits / property.floors))),
                        isAvailable: isAvailable,
                    });
                }
            }
        }
        
        const newProperty = { ...property, units };
        return await addSupabaseProperty(newProperty);
    };

    const reserveUnit = async (propertyId: number, unitNumber: string, clientId: number): Promise<boolean> => {
        // Check if client already has this unit
        const existingContract = supabaseContracts.find(c => 
            c.propertyId === propertyId && 
            c.clientId === clientId &&
            c.unitNumber === unitNumber &&
            new Date(c.endDate) > new Date() &&
            c.status !== 'terminated'
        );
        
        if (existingContract) {
            toast.error('هذا العميل لديه عقد نشط على هذه الوحدة بالفعل');
            return false;
        }

        // Check if unit is occupied by any contract
        const activeContract = supabaseContracts.find(c => 
            c.propertyId === propertyId && 
            c.unitNumber === unitNumber &&
            new Date(c.endDate) > new Date() &&
            c.status !== 'terminated'
        );
        
        if (activeContract) {
            toast.error('هذه الوحدة محجوزة بالفعل');
            return false;
        }

        const property = supabaseProperties.find(p => p.id === propertyId);
        if (!property) return false;

        const unit = property.units.find(u => u.number === unitNumber);
        if (!unit || !unit.isAvailable) {
            toast.error('هذه الوحدة غير متاحة');
            return false;
        }

        // Update unit in database
        try {
            const { data: propertyData } = await supabase
                .from('properties')
                .select('id')
                .eq('user_id', user?.id);
            
            const propertyUuid = propertyData?.find(p => 
                parseInt(p.id.slice(0, 8), 16) === propertyId
            )?.id;

            if (!propertyUuid) return false;

            const { data: clientData } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user?.id);
            
            const clientUuid = clientData?.find(c => 
                parseInt(c.id.slice(0, 8), 16) === clientId
            )?.id;

            if (!clientUuid) return false;

            // Update unit in units table
            const { error } = await supabase
                .from('units')
                .update({ 
                    is_available: false,
                    rented_by: clientUuid
                })
                .eq('property_id', propertyUuid)
                .eq('unit_number', unitNumber);

            if (error) throw error;

            // Refetch properties to update state
            await refetchProperties();
            return true;
        } catch (error) {
            console.error('Error reserving unit:', error);
            toast.error('فشل حجز الوحدة');
            return false;
        }
    };

    const releaseUnit = async (propertyId: number, unitNumber: string) => {
        const property = supabaseProperties.find(p => p.id === propertyId);
        if (!property) return;

        // Update unit in database
        try {
            const { data: propertyData } = await supabase
                .from('properties')
                .select('id')
                .eq('user_id', user?.id);
            
            const propertyUuid = propertyData?.find(p => 
                parseInt(p.id.slice(0, 8), 16) === propertyId
            )?.id;

            if (!propertyUuid) return;

            // Update unit in units table
            const { error } = await supabase
                .from('units')
                .update({ 
                    is_available: true,
                    rented_by: null
                })
                .eq('property_id', propertyUuid)
                .eq('unit_number', unitNumber);

            if (error) throw error;

            // Refetch properties to update state
            await refetchProperties();
        } catch (error) {
            console.error('Error releasing unit:', error);
            toast.error('فشل إخلاء الوحدة');
        }
    };

    const addClient = async (client: Omit<Client, 'id'>) => {
        return await addSupabaseClient(client);
    };

    const addContract = async (contract: Omit<Contract, 'id'>) => {
        return await addSupabaseContract(contract);
    };

    const addPayment = async (payment: Omit<Payment, 'id'>) => {
        await addSupabasePayment(payment);
    };

    const addMaintenanceRequest = async (request: Omit<MaintenanceRequest, 'id'>) => {
        await addSupabaseMaintenance(request);
    };

    const updateProperty = async (id: number, updatedProperty: Partial<Property>) => {
        await updateSupabaseProperty(id, updatedProperty);
    };

    const updateClient = async (id: number, updatedClient: Partial<Client>) => {
        await updateSupabaseClient(id, updatedClient);
    };

    const updateContract = async (id: number, updatedContract: Partial<Contract>) => {
        await updateSupabaseContract(id, updatedContract);
    };

    const deleteProperty = async (id: number) => {
        await deleteSupabaseProperty(id);
    };

    const deleteClient = async (id: number) => {
        await deleteSupabaseClient(id);
    };

    const deleteContract = async (id: number) => {
        const contract = supabaseContracts.find(c => c.id === id);
        if (contract && contract.unitNumber) {
            releaseUnit(contract.propertyId, contract.unitNumber);
        }
        
        await deleteSupabaseContract(id);
        
        // Delete related payments
        const relatedPayments = supabasePayments.filter(p => p.contractId === id);
        for (const payment of relatedPayments) {
            await deleteSupabasePayment(payment.id);
        }
    };

    const terminateContract = async (id: number) => {
        try {
            const contract = supabaseContracts.find(c => c.id === id);
            if (contract && contract.unitNumber) {
                await releaseUnit(contract.propertyId, contract.unitNumber);
            }
            
            await updateSupabaseContract(id, {
                status: 'terminated',
                terminatedDate: new Date().toISOString().split('T')[0]
            });
            
            // Mark all related pending/scheduled payments as overdue
            const relatedPayments = supabasePayments.filter(p => 
                p.contractId === id && (p.status === 'pending' || p.status === 'scheduled')
            );
            for (const payment of relatedPayments) {
                await updateSupabasePayment(payment.id, { status: 'overdue' });
            }
            
            // Refetch data to ensure UI updates
            await refetchContracts();
            await refetchProperties();
            await refetchPayments();
            
            toast.success('تم إنهاء العقد بنجاح');
        } catch (error) {
            console.error('Error terminating contract:', error);
            toast.error('فشل إنهاء العقد');
            throw error;
        }
    };

    const setCurrency = (newCurrency: string) => {
        setCurrencyState(newCurrency);
    };

    const setTheme = (newTheme: string) => {
        setThemeState(newTheme);
    };

    const setLanguage = (newLanguage: string) => {
        setLanguageState(newLanguage);
    };

    const updatePayment = async (id: number, updatedPayment: Partial<Payment>) => {
        await updateSupabasePayment(id, updatedPayment);
    };

    const renewContract = async (id: number, newEndDate: string) => {
        await updateSupabaseContract(id, { endDate: newEndDate });
    };

    const confirmPayment = async (id: number) => {
        await updateSupabasePayment(id, {
            status: 'paid',
            paidDate: new Date().toISOString().split('T')[0]
        });
        // Refetch payments to update dashboard
        await refetchPayments();
    };

    const updatePaymentStatuses = async () => {
        const today = new Date();
        for (const payment of supabasePayments) {
            if (payment.status === 'paid') continue;
            
            const dueDate = new Date(payment.dueDate);
            const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (payment.status === 'scheduled') {
                await updateSupabasePayment(payment.id, { status: 'pending' });
            }
            
            if (payment.status === 'pending' && daysDifference < 0) {
                await updateSupabasePayment(payment.id, { status: 'overdue' });
            }
        }
    };

    useEffect(() => {
        updatePaymentStatuses();
        const interval = setInterval(updatePaymentStatuses, 24 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [supabasePayments]);

    const contextValue: AppContextType = {
        properties: supabaseProperties,
        clients: supabaseClients,
        contracts: supabaseContracts,
        payments: supabasePayments,
        maintenanceRequests: supabaseMaintenance,
        currency,
        theme,
        language,
        addProperty,
        reserveUnit,
        releaseUnit,
        addClient,
        addContract,
        addPayment,
        addMaintenanceRequest,
        updateProperty,
        updateClient,
        updateContract,
        updatePayment,
        deleteProperty,
        deleteClient,
        deleteContract,
        terminateContract,
        renewContract,
        confirmPayment,
        updatePaymentStatuses,
        setCurrency,
        setTheme,
        setLanguage,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
