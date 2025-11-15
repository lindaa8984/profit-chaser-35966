import { useEffect, useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
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
          uuid: prop.id, // Store original UUID
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
            unitType: unit.unit_type as 'residential' | 'commercial' | undefined,
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

  // دالة لتصحيح تزامن حالة الوحدات مع العقود
  const syncUnitsWithContracts = async (propertyUuid: string, contracts: Contract[]) => {
    try {
      // جلب جميع الوحدات للعقار
      const { data: units, error: fetchError } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyUuid);

      if (fetchError || !units) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // تحديث كل وحدة بناءً على وجود عقد نشط أم لا
      for (const unit of units) {
        const hasActiveContract = contracts.some(c => {
          const endDate = new Date(c.endDate);
          endDate.setHours(0, 0, 0, 0);
          
          return c.unitNumber === unit.unit_number &&
            endDate >= today &&
            c.status !== 'terminated';
        });

        // تحديث الوحدة إذا كانت حالتها لا تتطابق مع وجود عقد نشط
        if (unit.is_available === hasActiveContract) {
          await supabase
            .from('units')
            .update({ is_available: !hasActiveContract })
            .eq('id', unit.id);
        }
      }
    } catch (error) {
      console.error('Error syncing units with contracts:', error);
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
          is_available: unit.isAvailable,
          unit_type: unit.unitType || 'residential'
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
      if (!property || !property.uuid) {
        console.error('Property not found or missing UUID');
        return;
      }

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
      if (updates.unitsPerFloor !== undefined) updateData.units_per_floor = updates.unitsPerFloor;
      if (updates.unitFormat !== undefined) updateData.unit_format = updates.unitFormat;

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.uuid);

      if (error) throw error;

      // If numbering-related fields changed and units weren't explicitly provided,
      // update unit numbers in-place to match the selected format without losing statuses
      if ((updates.unitFormat !== undefined || updates.unitsPerFloor !== undefined || updates.floors !== undefined) && updates.units === undefined) {
        const effectiveFloors = updates.floors ?? property.floors;
        const effectiveUnitsPerFloor = updates.unitsPerFloor ?? property.unitsPerFloor ?? Math.floor(property.totalUnits / Math.max(1, property.floors));
        const effectiveFormat = updates.unitFormat ?? property.unitFormat ?? '101';

        if (effectiveFloors && effectiveUnitsPerFloor) {
          // Fetch existing units for this property
          const { data: existingUnits, error: fetchUnitsError } = await supabase
            .from('units')
            .select('id, floor, unit_number')
            .eq('property_id', property.uuid)
            .order('floor', { ascending: true });

          if (!fetchUnitsError && existingUnits && existingUnits.length > 0) {
            const updatesBatch: any[] = [];
            
            // Group units by floor
            const unitsByFloor = existingUnits.reduce((acc: any, unit) => {
              if (!acc[unit.floor]) acc[unit.floor] = [];
              acc[unit.floor].push(unit);
              return acc;
            }, {});

            // إعادة ترقيم قوية بصيغة 101 فقط لكل الوحدات الموجودة، بدون التقيد بوحدات لكل طابق
            const floors = Object.keys(unitsByFloor)
              .map((f: string) => parseInt(f, 10))
              .sort((a: number, b: number) => a - b);

            for (const floor of floors) {
              const floorUnits = unitsByFloor[floor] || [];

              // ترتيب الوحدات الحالية لضمان استقرار الترقيم
              floorUnits.sort((a: any, b: any) => {
                const aNum = parseInt(a.unit_number);
                const bNum = parseInt(b.unit_number);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                  return aNum - bNum;
                }
                return a.unit_number.localeCompare(b.unit_number);
              });

              // ترقيم كل الوحدات على هذا الطابق بصيغة 101: floor + 2 digits
              for (let i = 0; i < floorUnits.length; i++) {
                const newNumber = `${floor}${String(i + 1).padStart(2, '0')}`;
                const oldNumber = floorUnits[i].unit_number;

                if (oldNumber !== newNumber) {
                  updatesBatch.push(
                    supabase
                      .from('units')
                      .update({ unit_number: newNumber })
                      .eq('id', floorUnits[i].id)
                  );
                  // تحديث العقود المرتبطة بنفس الوحدة
                  updatesBatch.push(
                    supabase
                      .from('contracts')
                      .update({ unit_number: newNumber })
                      .eq('property_id', property.uuid)
                      .eq('unit_number', oldNumber)
                  );
                }
              }
            }

            if (updatesBatch.length > 0) {
              await Promise.all(updatesBatch);
              console.log(`تم تحديث ${updatesBatch.length / 2} وحدة بنظام الترقيم الجديد`);
            }
          }
        }
      }

      // Update units if provided
      if (updates.units !== undefined && updates.units.length > 0) {
        // Delete existing units
        await supabase
          .from('units')
          .delete()
          .eq('property_id', property.uuid);

        // Insert new units
        const unitsData = updates.units.map(unit => ({
          property_id: property.uuid!,
          unit_number: unit.number,
          floor: unit.floor,
          is_available: unit.isAvailable,
          unit_type: unit.unitType || 'residential'
        }));

        const { error: unitsError } = await supabase
          .from('units')
          .insert(unitsData);

        if (unitsError) throw unitsError;
      }

      await fetchProperties();
      
      // إظهار رسالة توضح التحديثات
      if (updates.unitFormat !== undefined || updates.unitsPerFloor !== undefined || updates.floors !== undefined) {
        toast.success('تم تحديث العقار ونظام ترقيم الوحدات بنجاح');
      } else {
        toast.success('تم تحديث العقار بنجاح');
      }
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
    refetch: fetchProperties,
    syncUnitsWithContracts
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
        paymentAmounts: contract.payment_amounts || '', // ✅ إضافة المبالغ
        checkDates: contract.check_dates || '',
        bankName: contract.bank_name || '',
        checkNumbers: contract.check_numbers || '',
        unitNumber: contract.unit_number || '',
        status: (contract.status || 'active') as 'active' | 'terminated',
        terminatedDate: contract.terminated_date || undefined,
        contractFileUrl: contract.contract_file_url || null
      }));

      setContracts(formattedContracts);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast.error('فشل تحميل العقود');
    } finally {
      setLoading(false);
    }
  };

  const addContract = async (contract: any) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return '';
    }

    try {
      // جلب UUID للعميل
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id);
      
      const clientUuid = clientData?.find(c => 
        parseInt(c.id.slice(0, 8), 16) === contract.clientId
      )?.id;

      if (!clientUuid) {
        console.error('Client UUID not found:', { 
          clientId: contract.clientId,
          clientData: clientData?.length
        });
        toast.error('العميل غير موجود - يرجى المحاولة مرة أخرى');
        return '';
      }

      // تحديد UUID العقار بناءً على نوع العقار
      let propertyUuid: string | null = null;
      let unitNumberValue: string | null = contract.unitNumber || null;
      
      if (contract.propertyType === 'unit' && contract.propertyId) {
        // بحث عن UUID للعقار
        const { data: propertyData } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id);
        
        propertyUuid = propertyData?.find(p => 
          parseInt(p.id.slice(0, 8), 16) === contract.propertyId
        )?.id || null;

        if (!propertyUuid) {
          console.error('Property UUID not found:', { 
            propertyId: contract.propertyId,
            propertyData: propertyData?.length
          });
          toast.error('العقار غير موجود - يرجى المحاولة مرة أخرى');
          return '';
        }
      } else if (contract.propertyType === 'shop' && contract.shopId) {
        // للمحلات: استخدم العقار المرتبط بالوحدة ورقم الوحدة
        const { data: unitData } = await supabase
          .from('units')
          .select('unit_number, property_id')
          .eq('id', contract.shopId)
          .single();
        
        if (unitData) {
          propertyUuid = unitData.property_id || null;
          unitNumberValue = unitData.unit_number || unitNumberValue;
        }
      } else if (contract.propertyType === 'ground_house' && contract.groundHouseId) {
        // للبيوت الأرضية/الفلل: نفس منطق المحلات
        const { data: unitData } = await supabase
          .from('units')
          .select('unit_number, property_id')
          .eq('id', contract.groundHouseId)
          .single();
        
        if (unitData) {
          propertyUuid = unitData.property_id || null;
          unitNumberValue = unitData.unit_number || unitNumberValue;
        }
      }

      if (!propertyUuid) {
        console.error('Property UUID could not be determined:', { 
          propertyType: contract.propertyType,
          propertyId: contract.propertyId,
          shopId: contract.shopId,
          groundHouseId: contract.groundHouseId
        });
        toast.error('العقار غير موجود أو المحل/البيت غير مرتبط بعقار');
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
          payment_amounts: contract.paymentAmounts,
          check_dates: contract.checkDates,
          bank_name: contract.bankName,
          check_numbers: contract.checkNumbers,
          unit_number: unitNumberValue,
          status: contract.status
        })
        .select()
        .single();

      if (error) throw error;

      await fetchContracts();
      toast.success('تم إضافة العقد بنجاح');
      return data.id; // Return UUID
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
      if (updates.contractFileUrl !== undefined) updateData.contract_file_url = updates.contractFileUrl;
      if (updates.paymentAmounts !== undefined) updateData.payment_amounts = updates.paymentAmounts;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.paymentSchedule !== undefined) updateData.payment_schedule = updates.paymentSchedule;
      if (updates.numberOfPayments !== undefined) updateData.number_of_payments = updates.numberOfPayments;
      if (updates.paymentDates !== undefined) updateData.payment_dates = updates.paymentDates;
      if (updates.checkDates !== undefined) updateData.check_dates = updates.checkDates;
      if (updates.checkNumbers !== undefined) updateData.check_numbers = updates.checkNumbers;
      if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;

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
        console.warn('Payment not found:', id);
        return;
      }

      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;

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
        console.warn('Payment not found:', id);
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
