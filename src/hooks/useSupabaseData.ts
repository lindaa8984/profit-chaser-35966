import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Property, Client, Contract, Payment, MaintenanceRequest } from '@/contexts/AppContext';
import { toast } from 'sonner';

export function useSupabaseProperties() {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.id) {
      setProperties([]);
      setLoading(false);
      return;
    }

    fetchProperties();
  }, [user?.id, authLoading]);

  const fetchProperties = async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching properties');
      return;
    }
    
    console.log('Fetching properties for user:', user.id);
    
    try {
      setLoading(true);
      
      const { data: propsData, error } = await supabase
        .from('properties')
        .select(`
          *,
          units(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Properties fetch result:', { data: propsData, error, count: propsData?.length });

      if (error) {
        console.error('Properties error:', error);
        throw error;
      }

      const formattedProperties: Property[] = (propsData || []).map(prop => {
        const units = prop.units || [];
        const actualRentedUnits = units.filter(u => !u.is_available).length;
        const actualAvailableUnits = units.filter(u => u.is_available).length;
        
        return {
          id: parseInt(prop.id.slice(0, 8), 16),
          name: prop.name,
          type: prop.type,
          location: prop.location,
          floors: prop.floors,
          totalUnits: prop.total_units,
          rentedUnits: actualRentedUnits,
          availableUnits: actualAvailableUnits,
          price: Number(prop.price),
          currency: prop.currency,
          status: prop.status,
          unitsPerFloor: prop.units_per_floor,
          unitFormat: prop.unit_format,
          units: units.map(unit => ({
            number: unit.unit_number,
            floor: unit.floor,
            isAvailable: unit.is_available,
            rentedBy: unit.rented_by ? parseInt(unit.rented_by.slice(0, 8), 16) : undefined
          }))
        };
      });

      setProperties(formattedProperties);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (property: Omit<Property, 'id'>) => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return 0;
    }

    console.log('Adding property for user:', user.id);
    console.log('Property data:', property);

    try {
      const insertData = {
        user_id: user.id,
        name: property.name,
        type: property.type,
        location: property.location,
        floors: property.floors,
        total_units: property.totalUnits,
        rented_units: property.rentedUnits,
        available_units: property.availableUnits,
        price: property.price,
        currency: property.currency,
        status: property.status,
        units_per_floor: property.unitsPerFloor,
        unit_format: property.unitFormat
      };
      
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .insert(insertData)
        .select()
        .single();

      if (propError) throw propError;

      // Insert units
      if (property.units && property.units.length > 0) {
        const unitsData = property.units.map(unit => ({
          property_id: propData.id,
          unit_number: unit.number,
          floor: unit.floor,
          is_available: unit.isAvailable
        }));

        const { error: unitsError } = await supabase
          .from('units')
          .insert(unitsData);

        if (unitsError) throw unitsError;
      }

      await fetchProperties();
      toast.success('تم إضافة العقار بنجاح');
      return parseInt(propData.id.slice(0, 8), 16);
    } catch (error: any) {
      console.error('Error adding property:', error);
      toast.error('فشل إضافة العقار');
      return 0;
    }
  };

  const updateProperty = async (id: number, updates: Partial<Property>) => {
    if (!user) return;

    try {
      const property = properties.find(p => p.id === id);
      if (!property) return;

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.floors !== undefined) updateData.floors = updates.floors;
      if (updates.totalUnits !== undefined) updateData.total_units = updates.totalUnits;
      if (updates.rentedUnits !== undefined) updateData.rented_units = updates.rentedUnits;
      if (updates.availableUnits !== undefined) updateData.available_units = updates.availableUnits;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('name', property.name);

      if (error) throw error;

      await fetchProperties();
      toast.success('تم تحديث العقار بنجاح');
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error('فشل تحديث العقار');
    }
  };

  const deleteProperty = async (id: number) => {
    if (!user) return;

    try {
      // Find UUID from local state
      const prop = properties.find(p => p.id === id);
      if (!prop) return;

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('user_id', user.id)
        .eq('name', prop.name);

      if (error) throw error;

      await fetchProperties();
      toast.success('تم حذف العقار بنجاح');
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error('فشل حذف العقار');
    }
  };

  return {
    properties,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    refetch: fetchProperties
  };
}

export function useSupabaseClients() {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    fetchClients();
  }, [user?.id, authLoading]);

  const fetchClients = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClients: Client[] = data.map(client => ({
        id: parseInt(client.id.slice(0, 8), 16),
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        idNumber: client.id_number,
        nationality: client.nationality,
        address: client.address || '',
        type: client.client_type,
        properties: []
      }));

      setClients(formattedClients);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('فشل تحميل العملاء');
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return 0;
    }

    try {
      const insertData = {
        user_id: user.id,
        name: client.name,
        phone: client.phone,
        email: client.email || null,
        id_number: client.idNumber,
        nationality: client.nationality,
        address: client.address || null,
        client_type: client.type
      };
      
      const { data, error } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      await fetchClients();
      toast.success('تم إضافة العميل بنجاح');
      return parseInt(data.id.slice(0, 8), 16);
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error('فشل إضافة العميل: ' + error.message);
      return 0;
    }
  };

  const updateClient = async (id: number, updates: Partial<Client>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.idNumber !== undefined) updateData.id_number = updates.idNumber;
      if (updates.nationality !== undefined) updateData.nationality = updates.nationality;
      if (updates.address !== undefined) updateData.address = updates.address || null;
      if (updates.type !== undefined) updateData.client_type = updates.type;

      const client = clients.find(c => c.id === id);
      if (!client) return;

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('name', client.name);

      if (error) throw error;

      await fetchClients();
      toast.success('تم تحديث العميل بنجاح');
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error('فشل تحديث العميل');
    }
  };

  const deleteClient = async (id: number) => {
    if (!user) return;

    try {
      const client = clients.find(c => c.id === id);
      if (!client) return;

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('user_id', user.id)
        .eq('name', client.name);

      if (error) throw error;

      await fetchClients();
      toast.success('تم حذف العميل بنجاح');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error('فشل حذف العميل');
    }
  };

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    refetch: fetchClients
  };
}

export function useSupabaseContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContracts([]);
      setLoading(false);
      return;
    }

    fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedContracts: Contract[] = data.map(contract => ({
        id: parseInt(contract.id.slice(0, 8), 16),
        uuid: contract.id, // Store the actual UUID
        propertyId: parseInt(contract.property_id.slice(0, 8), 16),
        clientId: parseInt(contract.client_id.slice(0, 8), 16),
        startDate: contract.start_date,
        endDate: contract.end_date,
        monthlyRent: Number(contract.monthly_rent),
        currency: contract.currency,
        paymentSchedule: contract.payment_schedule,
        paymentMethod: contract.payment_method,
        numberOfPayments: contract.number_of_payments || '',
        paymentDates: contract.payment_dates || '',
        checkDates: contract.check_dates || '',
        bankName: contract.bank_name || '',
        checkNumbers: contract.check_numbers || '',
        unitNumber: contract.unit_number || '',
        status: (contract.status || 'active') as 'active' | 'terminated',
        terminatedDate: contract.terminated_date || undefined
      }));

      setContracts(formattedContracts);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast.error('فشل تحميل العقود');
    } finally {
      setLoading(false);
    }
  };

  const addContract = async (contract: Omit<Contract, 'id'>) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return '';
    }

    try {
      // Find the actual UUIDs from the database
      const { data: propertyData } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', user.id)
        .limit(100);

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .limit(100);

      // Find matching UUIDs
      const propertyUuid = propertyData?.find(p => 
        parseInt(p.id.slice(0, 8), 16) === contract.propertyId
      )?.id;
      
      const clientUuid = clientData?.find(c => 
        parseInt(c.id.slice(0, 8), 16) === contract.clientId
      )?.id;

      if (!propertyUuid || !clientUuid) {
        toast.error('العقار أو العميل غير موجود');
        return '';
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          property_id: propertyUuid,
          client_id: clientUuid,
          start_date: contract.startDate,
          end_date: contract.endDate,
          monthly_rent: contract.monthlyRent,
          currency: contract.currency,
          payment_schedule: contract.paymentSchedule,
          payment_method: contract.paymentMethod,
          number_of_payments: contract.numberOfPayments,
          payment_dates: contract.paymentDates,
          check_dates: contract.checkDates,
          bank_name: contract.bankName,
          check_numbers: contract.checkNumbers,
          unit_number: contract.unitNumber,
          status: contract.status
        })
        .select()
        .single();

      if (error) throw error;

      await fetchContracts();
      toast.success('تم إضافة العقد بنجاح');
      return data.id; // Return UUID instead of integer
    } catch (error: any) {
      console.error('Error adding contract:', error);
      toast.error('فشل إضافة العقد');
      return '';
    }
  };

  const updateContract = async (id: number, updates: Partial<Contract>) => {
    if (!user) return;

    try {
      const contract = contracts.find(c => c.id === id);
      if (!contract || !contract.uuid) {
        toast.error('العقد غير موجود');
        return;
      }

      const updateData: any = {};
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.monthlyRent !== undefined) updateData.monthly_rent = updates.monthlyRent;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.terminatedDate !== undefined) updateData.terminated_date = updates.terminatedDate;
      if (updates.unitNumber !== undefined) updateData.unit_number = updates.unitNumber;

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('id', contract.uuid); // Use the actual UUID

      if (error) throw error;

      await fetchContracts();
      toast.success('تم تحديث العقد بنجاح');
    } catch (error: any) {
      console.error('Error updating contract:', error);
      toast.error('فشل تحديث العقد');
    }
  };

  const deleteContract = async (id: number) => {
    if (!user) return;

    try {
      const contract = contracts.find(c => c.id === id);
      if (!contract || !contract.uuid) {
        toast.error('العقد غير موجود');
        return;
      }

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('user_id', user.id)
        .eq('id', contract.uuid); // Use the actual UUID

      if (error) throw error;

      await fetchContracts();
      toast.success('تم حذف العقد بنجاح');
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast.error('فشل حذف العقد');
    }
  };

  return {
    contracts,
    loading,
    addContract,
    updateContract,
    deleteContract,
    refetch: fetchContracts
  };
}

export function useSupabasePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }

    fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedPayments: Payment[] = data.map(payment => ({
        id: parseInt(payment.id.slice(0, 8), 16),
        contractId: parseInt(payment.contract_id.slice(0, 8), 16),
        dueDate: payment.due_date,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.payment_method,
        checkNumber: payment.check_number || '',
        bankName: payment.bank_name || '',
        status: payment.status as 'paid' | 'pending' | 'scheduled' | 'overdue',
        paidDate: payment.paid_date || undefined
      }));

      setPayments(formattedPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('فشل تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (payment: Omit<Payment, 'id'>) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return 0;
    }

    try {
      // If contractId is a number, find the UUID
      let contractUuid: string;
      if (typeof payment.contractId === 'string') {
        contractUuid = payment.contractId;
      } else {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id')
          .eq('user_id', user.id)
          .limit(100);

        const foundContract = contractData?.find(c => 
          parseInt(c.id.slice(0, 8), 16) === payment.contractId
        );

        if (!foundContract) {
          toast.error('العقد غير موجود');
          return 0;
        }
        contractUuid = foundContract.id;
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          contract_id: contractUuid,
          due_date: payment.dueDate,
          amount: payment.amount,
          currency: payment.currency,
          payment_method: payment.paymentMethod,
          check_number: payment.checkNumber || null,
          bank_name: payment.bankName || null,
          status: payment.status,
          paid_date: payment.paidDate || null
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPayments();
      toast.success('تم إضافة المدفوعة بنجاح');
      return parseInt(data.id.slice(0, 8), 16);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error('فشل إضافة المدفوعة');
      return 0;
    }
  };

  const updatePayment = async (id: number, updates: Partial<Payment>) => {
    if (!user) return;

    try {
      // Find the actual UUID for this payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .limit(100);

      const foundPayment = paymentData?.find(p => 
        parseInt(p.id.slice(0, 8), 16) === id
      );

      if (!foundPayment) {
        toast.error('المدفوعة غير موجودة');
        return;
      }

      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate;
      if (updates.amount !== undefined) updateData.amount = updates.amount;

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('id', foundPayment.id);

      if (error) throw error;

      await fetchPayments();
      toast.success('تم تحديث المدفوعة بنجاح');
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error('فشل تحديث المدفوعة');
    }
  };

  const deletePayment = async (id: number) => {
    if (!user) return;

    try {
      // Find the actual UUID for this payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .limit(100);

      const foundPayment = paymentData?.find(p => 
        parseInt(p.id.slice(0, 8), 16) === id
      );

      if (!foundPayment) {
        toast.error('المدفوعة غير موجودة');
        return;
      }

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('user_id', user.id)
        .eq('id', foundPayment.id);

      if (error) throw error;

      await fetchPayments();
      toast.success('تم حذف المدفوعة بنجاح');
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error('فشل حذف المدفوعة');
    }
  };

  return {
    payments,
    loading,
    addPayment,
    updatePayment,
    deletePayment,
    refetch: fetchPayments
  };
}

export function useSupabaseMaintenance() {
  const { user } = useAuth();
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMaintenanceRequests([]);
      setLoading(false);
      return;
    }

    fetchMaintenanceRequests();
  }, [user]);

  const fetchMaintenanceRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('request_date', { ascending: false });

      if (error) throw error;

      const formattedRequests: MaintenanceRequest[] = data.map(request => ({
        id: parseInt(request.id.slice(0, 8), 16),
        propertyId: parseInt(request.property_id.slice(0, 8), 16),
        requestDate: request.request_date,
        description: request.description,
        status: request.status,
        priority: request.priority,
        completedDate: request.completed_date || undefined
      }));

      setMaintenanceRequests(formattedRequests);
    } catch (error: any) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('فشل تحميل طلبات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const addMaintenanceRequest = async (request: Omit<MaintenanceRequest, 'id'>) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          user_id: user.id,
          property_id: request.propertyId.toString(),
          request_date: request.requestDate,
          description: request.description,
          status: request.status,
          priority: request.priority,
          completed_date: request.completedDate || null
        })
        .select()
        .single();

      if (error) throw error;

      await fetchMaintenanceRequests();
      toast.success('تم إضافة طلب الصيانة بنجاح');
      return parseInt(data.id.slice(0, 8), 16);
    } catch (error: any) {
      console.error('Error adding maintenance request:', error);
      toast.error('فشل إضافة طلب الصيانة');
      return 0;
    }
  };

  const updateMaintenanceRequest = async (id: number, updates: Partial<MaintenanceRequest>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.completedDate !== undefined) updateData.completed_date = updates.completedDate;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('id', id.toString());

      if (error) throw error;

      await fetchMaintenanceRequests();
      toast.success('تم تحديث طلب الصيانة بنجاح');
    } catch (error: any) {
      console.error('Error updating maintenance request:', error);
      toast.error('فشل تحديث طلب الصيانة');
    }
  };

  const deleteMaintenanceRequest = async (id: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('id', id.toString());

      if (error) throw error;

      await fetchMaintenanceRequests();
      toast.success('تم حذف طلب الصيانة بنجاح');
    } catch (error: any) {
      console.error('Error deleting maintenance request:', error);
      toast.error('فشل حذف طلب الصيانة');
    }
  };

  return {
    maintenanceRequests,
    loading,
    addMaintenanceRequest,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    refetch: fetchMaintenanceRequests
  };
}
