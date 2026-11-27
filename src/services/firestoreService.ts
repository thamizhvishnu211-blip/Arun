import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  AppLanguage,
  AuditLog,
  CropActivity,
  CropRecord,
  EcoPointsTransaction,
  EducationalArticle,
  ExpertQuestion,
  Farm,
  FarmTask,
  FarmTeamMember,
  FieldPlot,
  IrrigationSchedule,
  MarketplaceListing,
  NotificationItem,
  OrderRecord,
  OrderStatus,
  PlantHealthReport,
  PlatformAnnouncement,
  PlatformSettings,
  RewardItem,
  ServiceBooking,
  ServiceBookingStatus,
  ServiceListing,
  SoilMeasurement,
  SupportTicket,
  SupportTicketStatus,
  UserDoc,
  UserRole,
  WeatherResponse
} from '../types';

const clampStr = (val: string | undefined, max: number): string => (val ?? '').trim().slice(0, max);

// Generic typed real-time collection subscription with structured error handling
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  constraints: QueryConstraint[],
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = constraints.length > 0 ? query(collection(db, collectionName), ...constraints) : collection(db, collectionName);
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) }) as T);
      items.sort((a, b) => {
        const aTime = (a as unknown as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0;
        const bTime = (b as unknown as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

// ==================== AUDIT LOGGING & NOTIFICATIONS ====================

export async function writeAuditLog(action: string, targetCollection: string, targetId: string, details?: string) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const payload: Record<string, unknown> = {
      actorId: user.uid,
      actorEmail: clampStr(user.email ?? '', 200),
      action: clampStr(action, 120),
      targetCollection: clampStr(targetCollection, 80),
      targetId: clampStr(targetId, 128),
      createdAt: serverTimestamp()
    };
    if (details) payload.details = clampStr(details, 500);
    await addDoc(collection(db, 'audit_logs'), payload);
  } catch (err) {
    console.warn('Audit log write skipped:', err);
  }
}

export async function createNotification(input: {
  userId: string;
  category: NotificationItem['category'];
  title: string;
  message: string;
}) {
  const senderId = auth.currentUser?.uid;
  if (!senderId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: clampStr(input.userId, 128),
      senderId,
      category: input.category,
      title: clampStr(input.title, 140),
      message: clampStr(input.message, 500),
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'notifications');
  }
}

export async function markNotificationRead(id: string) {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function deleteNotification(id: string) {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
  }
}

// ==================== FARMS, FIELDS, CROPS & ACTIVITIES ====================

export async function createFarm(input: Omit<Farm, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      name: clampStr(input.name, 120),
      areaAcres: Number(input.areaAcres),
      soilType: clampStr(input.soilType, 80),
      waterSource: clampStr(input.waterSource, 80),
      state: clampStr(input.state, 80),
      district: clampStr(input.district, 80),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.village) payload.village = clampStr(input.village, 100);
    if (typeof input.latitude === 'number' && Number.isFinite(input.latitude)) payload.latitude = input.latitude;
    if (typeof input.longitude === 'number' && Number.isFinite(input.longitude)) payload.longitude = input.longitude;
    const ref = await addDoc(collection(db, 'farms'), payload);
    await writeAuditLog('create_farm', 'farms', ref.id, `Farm: ${payload.name}`);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'farms');
  }
}

export async function deleteFarm(farmId: string) {
  try {
    await deleteDoc(doc(db, 'farms', farmId));
    await writeAuditLog('delete_farm', 'farms', farmId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `farms/${farmId}`);
  }
}

export async function createFieldPlot(input: Omit<FieldPlot, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const ref = await addDoc(collection(db, 'fields'), {
      farmerId: uid,
      farmId: input.farmId,
      name: clampStr(input.name, 100),
      areaAcres: Number(input.areaAcres),
      irrigationMethod: clampStr(input.irrigationMethod, 80),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'fields');
  }
}

export async function createCrop(input: Omit<CropRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      farmId: input.farmId,
      cropName: clampStr(input.cropName, 100),
      category: clampStr(input.category, 60),
      areaAcres: Number(input.areaAcres),
      plantingDate: clampStr(input.plantingDate, 30),
      stage: input.stage,
      healthStatus: input.healthStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.variety) payload.variety = clampStr(input.variety, 100);
    if (input.expectedHarvestDate) payload.expectedHarvestDate = clampStr(input.expectedHarvestDate, 30);
    if (typeof input.expectedYieldKg === 'number' && Number.isFinite(input.expectedYieldKg)) payload.expectedYieldKg = input.expectedYieldKg;
    if (typeof input.actualYieldKg === 'number' && Number.isFinite(input.actualYieldKg)) payload.actualYieldKg = input.actualYieldKg;
    if (typeof input.estimatedExpenseInr === 'number' && Number.isFinite(input.estimatedExpenseInr)) payload.estimatedExpenseInr = input.estimatedExpenseInr;

    const ref = await addDoc(collection(db, 'crops'), payload);
    await writeAuditLog('create_crop', 'crops', ref.id, `Crop: ${payload.cropName}`);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'crops');
  }
}

export async function updateCrop(cropId: string, patch: Partial<Pick<CropRecord, 'stage' | 'healthStatus' | 'actualYieldKg' | 'estimatedExpenseInr'>>) {
  try {
    await updateDoc(doc(db, 'crops', cropId), {
      ...patch,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `crops/${cropId}`);
  }
}

export async function deleteCrop(cropId: string) {
  try {
    await deleteDoc(doc(db, 'crops', cropId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `crops/${cropId}`);
  }
}

export async function createCropActivity(input: Omit<CropActivity, 'id' | 'farmerId' | 'createdAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      cropId: input.cropId,
      activityType: clampStr(input.activityType, 80),
      date: clampStr(input.date, 30),
      expenseInr: Math.max(0, Number(input.expenseInr)),
      createdAt: serverTimestamp()
    };
    if (input.notes) payload.notes = clampStr(input.notes, 500);
    const ref = await addDoc(collection(db, 'crop_activities'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'crop_activities');
  }
}

// ==================== SOIL & IRRIGATION ====================

export async function createSoilMeasurement(input: Omit<SoilMeasurement, 'id' | 'farmerId' | 'createdAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      farmId: input.farmId,
      fieldName: clampStr(input.fieldName, 100),
      sourceType: input.sourceType,
      ph: Number(input.ph),
      moisturePercent: Number(input.moisturePercent),
      temperatureC: Number(input.temperatureC),
      nitrogenPpm: Number(input.nitrogenPpm),
      phosphorusPpm: Number(input.phosphorusPpm),
      potassiumPpm: Number(input.potassiumPpm),
      recordedDate: clampStr(input.recordedDate, 30),
      createdAt: serverTimestamp()
    };
    if (input.notes) payload.notes = clampStr(input.notes, 500);
    const ref = await addDoc(collection(db, 'soil_measurements'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'soil_measurements');
  }
}

export async function deleteSoilMeasurement(id: string) {
  try {
    await deleteDoc(doc(db, 'soil_measurements', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `soil_measurements/${id}`);
  }
}

export async function createIrrigationSchedule(input: Omit<IrrigationSchedule, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      farmId: input.farmId,
      cropName: clampStr(input.cropName, 100),
      fieldName: clampStr(input.fieldName, 100),
      scheduledDate: clampStr(input.scheduledDate, 30),
      scheduledTime: clampStr(input.scheduledTime, 20),
      durationMinutes: Number(input.durationMinutes),
      waterVolumeLiters: Number(input.waterVolumeLiters),
      method: input.method,
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.notes) payload.notes = clampStr(input.notes, 500);
    const ref = await addDoc(collection(db, 'irrigation_schedules'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'irrigation_schedules');
  }
}

export async function updateIrrigationStatus(id: string, status: IrrigationSchedule['status']) {
  try {
    await updateDoc(doc(db, 'irrigation_schedules', id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `irrigation_schedules/${id}`);
  }
}

export async function deleteIrrigationSchedule(id: string) {
  try {
    await deleteDoc(doc(db, 'irrigation_schedules', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `irrigation_schedules/${id}`);
  }
}

// ==================== PLANT HEALTH AI ====================

export async function analyzePlantPhoto(input: {
  imageBase64: string;
  mimeType: string;
  cropType: string;
  observedSymptoms: string;
  language: AppLanguage;
}) {
  const response = await fetch('/api/plant-health/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to analyze plant image.');
  }
  return data as Omit<PlantHealthReport, 'id' | 'farmerId' | 'cropType' | 'observedSymptoms' | 'imageName' | 'createdAt'>;
}

export async function savePlantHealthReport(input: Omit<PlantHealthReport, 'id' | 'farmerId' | 'createdAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      cropType: clampStr(input.cropType, 100),
      observedSymptoms: clampStr(input.observedSymptoms || 'Photo-only visual submission', 1000),
      possibleIssue: clampStr(input.possibleIssue, 200),
      confidenceLevel: input.confidenceLevel,
      uncertaintyNote: clampStr(input.uncertaintyNote, 600),
      visibleSymptoms: (input.visibleSymptoms ?? []).slice(0, 10).map((s) => clampStr(s, 200)).filter(Boolean),
      contributingFactors: (input.contributingFactors ?? []).slice(0, 10).map((s) => clampStr(s, 200)).filter(Boolean),
      preventiveSteps: (input.preventiveSteps ?? []).slice(0, 10).map((s) => clampStr(s, 300)).filter(Boolean),
      whenToConsultExpert: clampStr(input.whenToConsultExpert, 600),
      createdAt: serverTimestamp()
    };
    if (input.imageName) payload.imageName = clampStr(input.imageName, 200);
    const ref = await addDoc(collection(db, 'plant_health_reports'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'plant_health_reports');
  }
}

// ==================== WEATHER ====================

export async function fetchWeather(params: { location?: string; lat?: number; lon?: number }): Promise<WeatherResponse> {
  const url = new URL('/api/weather', window.location.origin);
  if (params.location) url.searchParams.set('location', params.location);
  if (typeof params.lat === 'number' && Number.isFinite(params.lat)) url.searchParams.set('lat', String(params.lat));
  if (typeof params.lon === 'number' && Number.isFinite(params.lon)) url.searchParams.set('lon', String(params.lon));
  const resp = await fetch(url.toString());
  return (await resp.json()) as WeatherResponse;
}

// ==================== MARKETPLACE & ORDERS ====================

export async function createMarketplaceListing(
  input: Omit<MarketplaceListing, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      farmerName: clampStr(input.farmerName, 120),
      productName: clampStr(input.productName, 120),
      cropCategory: clampStr(input.cropCategory, 60),
      quantity: Number(input.quantity),
      unit: clampStr(input.unit, 30),
      pricePerUnitInr: Number(input.pricePerUnitInr),
      harvestDate: clampStr(input.harvestDate, 30),
      location: clampStr(input.location, 140),
      description: clampStr(input.description, 1000),
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.imageUrl) payload.imageUrl = clampStr(input.imageUrl, 500);
    const ref = await addDoc(collection(db, 'marketplace_listings'), payload);
    await writeAuditLog('create_listing', 'marketplace_listings', ref.id, `Listing: ${payload.productName}`);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'marketplace_listings');
  }
}

export async function updateMarketplaceListingStatus(id: string, status: MarketplaceListing['status']) {
  try {
    await updateDoc(doc(db, 'marketplace_listings', id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `marketplace_listings/${id}`);
  }
}

export async function deleteMarketplaceListing(id: string) {
  try {
    await deleteDoc(doc(db, 'marketplace_listings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `marketplace_listings/${id}`);
  }
}

export async function createOrderRequest(input: {
  listing: MarketplaceListing;
  buyerName: string;
  quantity: number;
  deliveryLocation: string;
  buyerNotes?: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const totalAmountInr = Number((input.quantity * input.listing.pricePerUnitInr).toFixed(2));
    const payload: Record<string, unknown> = {
      listingId: input.listing.id,
      productName: clampStr(input.listing.productName, 120),
      farmerId: input.listing.farmerId,
      farmerName: clampStr(input.listing.farmerName, 120),
      buyerId: uid,
      buyerName: clampStr(input.buyerName, 120),
      quantity: Number(input.quantity),
      unit: clampStr(input.listing.unit, 30),
      pricePerUnitInr: Number(input.listing.pricePerUnitInr),
      totalAmountInr,
      deliveryLocation: clampStr(input.deliveryLocation, 200),
      paymentSettlementStatus: 'offline_agreed_pending',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.buyerNotes) payload.buyerNotes = clampStr(input.buyerNotes, 500);
    const ref = await addDoc(collection(db, 'orders'), payload);
    await createNotification({
      userId: input.listing.farmerId,
      category: 'order',
      title: `New Purchase Request: ${input.listing.productName}`,
      message: `${input.buyerName} requested ${input.quantity} ${input.listing.unit} (INR ${totalAmountInr.toLocaleString('en-IN')}).`
    });
    await writeAuditLog('create_order', 'orders', ref.id, `${input.quantity} ${input.listing.unit} of ${input.listing.productName}`);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'orders');
  }
}

export async function updateOrderStatus(
  order: OrderRecord,
  status: OrderStatus,
  review?: { reviewRating: number; reviewComment?: string }
) {
  try {
    const patch: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp()
    };
    if (review) {
      patch.reviewRating = review.reviewRating;
      if (review.reviewComment) patch.reviewComment = clampStr(review.reviewComment, 500);
    }
    await updateDoc(doc(db, 'orders', order.id), patch);

    const recipientId = auth.currentUser?.uid === order.farmerId ? order.buyerId : order.farmerId;
    await createNotification({
      userId: recipientId,
      category: 'order',
      title: `Order Updated: ${order.productName}`,
      message: `Order status changed to "${status.replace(/_/g, ' ')}".`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
  }
}

// ==================== SERVICES & BOOKINGS ====================

export async function createServiceListing(
  input: Omit<ServiceListing, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>
) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const ref = await addDoc(collection(db, 'service_listings'), {
      providerId: uid,
      providerName: clampStr(input.providerName, 120),
      title: clampStr(input.title, 120),
      category: clampStr(input.category, 80),
      rateInr: Number(input.rateInr),
      rateUnit: clampStr(input.rateUnit, 40),
      operatingLocation: clampStr(input.operatingLocation, 140),
      description: clampStr(input.description, 1000),
      availabilityStatus: input.availabilityStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'service_listings');
  }
}

export async function updateServiceListingStatus(id: string, availabilityStatus: ServiceListing['availabilityStatus']) {
  try {
    await updateDoc(doc(db, 'service_listings', id), {
      availabilityStatus,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_listings/${id}`);
  }
}

export async function deleteServiceListing(id: string) {
  try {
    await deleteDoc(doc(db, 'service_listings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `service_listings/${id}`);
  }
}

export async function createServiceBooking(input: {
  service: ServiceListing;
  farmerName: string;
  requestedDate: string;
  location: string;
  notes?: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      serviceId: input.service.id,
      serviceTitle: clampStr(input.service.title, 120),
      providerId: input.service.providerId,
      providerName: clampStr(input.service.providerName, 120),
      farmerId: uid,
      farmerName: clampStr(input.farmerName, 120),
      requestedDate: clampStr(input.requestedDate, 30),
      location: clampStr(input.location, 160),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.notes) payload.notes = clampStr(input.notes, 500);
    const ref = await addDoc(collection(db, 'service_bookings'), payload);
    await createNotification({
      userId: input.service.providerId,
      category: 'service',
      title: `New Service Booking: ${input.service.title}`,
      message: `${input.farmerName} requested service on ${input.requestedDate} at ${input.location}.`
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'service_bookings');
  }
}

export async function updateServiceBookingStatus(booking: ServiceBooking, status: ServiceBookingStatus) {
  try {
    await updateDoc(doc(db, 'service_bookings', booking.id), {
      status,
      updatedAt: serverTimestamp()
    });
    const recipientId = auth.currentUser?.uid === booking.providerId ? booking.farmerId : booking.providerId;
    await createNotification({
      userId: recipientId,
      category: 'service',
      title: `Service Booking Updated: ${booking.serviceTitle}`,
      message: `Booking status is now "${status.replace(/_/g, ' ')}".`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_bookings/${booking.id}`);
  }
}

// ==================== TEAM & TASKS ====================

export async function createTeamMember(input: Omit<FarmTeamMember, 'id' | 'farmerId' | 'createdAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      memberName: clampStr(input.memberName, 120),
      roleTitle: clampStr(input.roleTitle, 80),
      status: input.status,
      createdAt: serverTimestamp()
    };
    if (input.phone) payload.phone = clampStr(input.phone, 30);
    if (input.assignedArea) payload.assignedArea = clampStr(input.assignedArea, 120);
    const ref = await addDoc(collection(db, 'farm_teams'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'farm_teams');
  }
}

export async function deleteTeamMember(id: string) {
  try {
    await deleteDoc(doc(db, 'farm_teams', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `farm_teams/${id}`);
  }
}

export async function createFarmTask(input: Omit<FarmTask, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      farmerId: uid,
      taskName: clampStr(input.taskName, 140),
      assignedMemberName: clampStr(input.assignedMemberName, 120),
      priority: input.priority,
      dueDate: clampStr(input.dueDate, 30),
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.description) payload.description = clampStr(input.description, 600);
    const ref = await addDoc(collection(db, 'farm_tasks'), payload);
    await createNotification({
      userId: uid,
      category: 'task',
      title: `Task Assigned: ${input.taskName}`,
      message: `Assigned to ${input.assignedMemberName} (Due ${input.dueDate}, Priority: ${input.priority}).`
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'farm_tasks');
  }
}

export async function updateFarmTaskStatus(id: string, status: FarmTask['status']) {
  try {
    await updateDoc(doc(db, 'farm_tasks', id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `farm_tasks/${id}`);
  }
}

export async function deleteFarmTask(id: string) {
  try {
    await deleteDoc(doc(db, 'farm_tasks', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `farm_tasks/${id}`);
  }
}

// ==================== ECO POINTS & REWARDS ====================

export async function submitEcoPointsClaim(input: {
  userName: string;
  activityCategory: EcoPointsTransaction['activityCategory'];
  description: string;
  requestedPoints: number;
  transactionType: 'earn' | 'redeem';
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const ref = await addDoc(collection(db, 'eco_points_transactions'), {
      userId: uid,
      userName: clampStr(input.userName, 120),
      activityCategory: input.activityCategory,
      description: clampStr(input.description, 500),
      requestedPoints: Math.min(10000, Math.max(1, Number(input.requestedPoints))),
      awardedPoints: 0, // Strictly enforced by security rules: only Admin can verify & award
      transactionType: input.transactionType,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await writeAuditLog('submit_eco_points_claim', 'eco_points_transactions', ref.id, `${input.transactionType}: ${input.activityCategory}`);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'eco_points_transactions');
  }
}

export async function reviewEcoPointsTransaction(
  tx: EcoPointsTransaction,
  decision: 'verified' | 'rejected',
  awardedPoints: number
) {
  const adminUid = auth.currentUser?.uid;
  if (!adminUid) throw new Error('Authentication required');
  try {
    await updateDoc(doc(db, 'eco_points_transactions', tx.id), {
      status: decision,
      awardedPoints: decision === 'verified' ? Math.max(0, Number(awardedPoints)) : 0,
      reviewedBy: adminUid,
      updatedAt: serverTimestamp()
    });
    await createNotification({
      userId: tx.userId,
      category: 'eco_points',
      title: `Eco Points Request ${decision === 'verified' ? 'Verified' : 'Rejected'}`,
      message:
        decision === 'verified'
          ? `${awardedPoints} Eco Points recorded for "${tx.description.slice(0, 80)}".`
          : `Your Eco Points submission was not approved.`
    });
    await writeAuditLog(`eco_points_${decision}`, 'eco_points_transactions', tx.id, `Awarded: ${awardedPoints}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `eco_points_transactions/${tx.id}`);
  }
}

export async function createRewardItem(input: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const ref = await addDoc(collection(db, 'rewards'), {
      title: clampStr(input.title, 120),
      description: clampStr(input.description, 500),
      pointsCost: Number(input.pointsCost),
      category: clampStr(input.category, 60),
      active: input.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await writeAuditLog('create_reward', 'rewards', ref.id, input.title);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'rewards');
  }
}

export async function deleteRewardItem(id: string) {
  try {
    await deleteDoc(doc(db, 'rewards', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `rewards/${id}`);
  }
}

// ==================== SUPPORT TICKETS ====================

export async function createSupportTicket(input: {
  userName: string;
  userRole: UserRole;
  category: string;
  subject: string;
  description: string;
  attachmentName?: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      userId: uid,
      userName: clampStr(input.userName, 120),
      userRole: input.userRole,
      category: clampStr(input.category, 80),
      subject: clampStr(input.subject, 150),
      description: clampStr(input.description, 1500),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.attachmentName) payload.attachmentName = clampStr(input.attachmentName, 200);
    const ref = await addDoc(collection(db, 'support_tickets'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'support_tickets');
  }
}

export async function updateSupportTicket(
  ticket: SupportTicket,
  patch: { status: SupportTicketStatus; adminResponse?: string }
) {
  try {
    const payload: Record<string, unknown> = {
      status: patch.status,
      updatedAt: serverTimestamp()
    };
    if (patch.adminResponse !== undefined) {
      payload.adminResponse = clampStr(patch.adminResponse, 1500);
    }
    await updateDoc(doc(db, 'support_tickets', ticket.id), payload);
    if (patch.adminResponse) {
      await createNotification({
        userId: ticket.userId,
        category: 'support',
        title: `Support Response: ${ticket.subject}`,
        message: patch.adminResponse.slice(0, 200)
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${ticket.id}`);
  }
}

// ==================== EXPERT ARTICLES & Q&A ====================

export async function createEducationalArticle(
  input: Omit<EducationalArticle, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>
) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const payload: Record<string, unknown> = {
      authorId: uid,
      authorName: clampStr(input.authorName, 120),
      title: clampStr(input.title, 160),
      category: clampStr(input.category, 80),
      summary: clampStr(input.summary, 400),
      content: clampStr(input.content, 5000),
      language: input.language,
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (input.cropFocus) payload.cropFocus = clampStr(input.cropFocus, 80);
    const ref = await addDoc(collection(db, 'educational_articles'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'educational_articles');
  }
}

export async function deleteEducationalArticle(id: string) {
  try {
    await deleteDoc(doc(db, 'educational_articles', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `educational_articles/${id}`);
  }
}

export async function createExpertQuestion(input: {
  farmerName: string;
  cropName: string;
  question: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const ref = await addDoc(collection(db, 'expert_questions'), {
      farmerId: uid,
      farmerName: clampStr(input.farmerName, 120),
      cropName: clampStr(input.cropName, 100),
      question: clampStr(input.question, 1200),
      isPublic: true,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'expert_questions');
  }
}

export async function answerExpertQuestion(question: ExpertQuestion, answer: string, expertName: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    await updateDoc(doc(db, 'expert_questions', question.id), {
      answer: clampStr(answer, 2500),
      expertId: uid,
      expertName: clampStr(expertName, 120),
      status: 'answered',
      updatedAt: serverTimestamp()
    });
    await createNotification({
      userId: question.farmerId,
      category: 'expert',
      title: `Expert Answered Your Question (${question.cropName})`,
      message: `${expertName} responded to your agricultural inquiry.`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `expert_questions/${question.id}`);
  }
}

// ==================== ADMIN ACTIONS ====================

export async function adminUpdateUser(
  user: UserDoc,
  patch: Partial<Pick<UserDoc, 'verificationStatus' | 'accountStatus' | 'role'>>
) {
  try {
    await updateDoc(doc(db, 'users', user.id), {
      ...patch,
      updatedAt: serverTimestamp()
    });
    if (patch.verificationStatus) {
      await createNotification({
        userId: user.uid,
        category: 'verification',
        title: `Account Verification: ${patch.verificationStatus}`,
        message: `Your AgriSphere ${user.role} account status is now "${patch.verificationStatus}".`
      });
    }
    await writeAuditLog(
      'admin_update_user',
      'users',
      user.uid,
      `Updated ${user.email}: ${JSON.stringify(patch)}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: PlatformAnnouncement['audience'];
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  try {
    const ref = await addDoc(collection(db, 'platform_announcements'), {
      title: clampStr(input.title, 150),
      body: clampStr(input.body, 1500),
      audience: input.audience,
      active: true,
      authorId: uid,
      createdAt: serverTimestamp()
    });
    await writeAuditLog('create_announcement', 'platform_announcements', ref.id, input.title);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'platform_announcements');
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    await deleteDoc(doc(db, 'platform_announcements', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `platform_announcements/${id}`);
  }
}

export async function savePlatformSettings(settings: Omit<PlatformSettings, 'updatedAt'>) {
  try {
    await setDoc(doc(db, 'platform_settings', 'global'), {
      maintenanceNotice: clampStr(settings.maintenanceNotice, 400),
      ecoPointsDefaultReward: Number(settings.ecoPointsDefaultReward),
      requireVerificationForListings: Boolean(settings.requireVerificationForListings),
      supportEmail: clampStr(settings.supportEmail, 150),
      updatedAt: serverTimestamp()
    });
    await writeAuditLog('update_platform_settings', 'platform_settings', 'global');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'platform_settings/global');
  }
}

export function subscribeAdminAuditLogs(onData: (logs: AuditLog[]) => void) {
  return subscribeCollection<AuditLog>('audit_logs', [], onData);
}

export { where };
