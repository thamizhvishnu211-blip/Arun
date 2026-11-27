import { Timestamp } from 'firebase/firestore';

export type UserRole = 'farmer' | 'buyer' | 'provider' | 'expert' | 'admin';
export type AppLanguage = 'en' | 'ta';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended';

export interface UserDoc {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  preferredLanguage: AppLanguage;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  state?: string;
  district?: string;
  village?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FarmerProfile {
  userId: string;
  fullName: string;
  phone: string;
  state: string;
  district: string;
  village: string;
  farmName?: string;
  farmAreaAcres: number;
  preferredLanguage: AppLanguage;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BuyerProfile {
  userId: string;
  businessName: string;
  phone: string;
  location: string;
  buyerCategory: 'individual' | 'retailer' | 'wholesaler' | 'processor' | 'exporter';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProviderProfile {
  userId: string;
  businessName: string;
  serviceCategory: string;
  contactPhone: string;
  operatingLocation: string;
  serviceDescription: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ExpertProfile {
  userId: string;
  fullName: string;
  specialization: string;
  qualification: string;
  organization?: string;
  operatingRegion: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Farm {
  id: string;
  farmerId: string;
  name: string;
  areaAcres: number;
  soilType: string;
  waterSource: string;
  state: string;
  district: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FieldPlot {
  id: string;
  farmerId: string;
  farmId: string;
  name: string;
  areaAcres: number;
  irrigationMethod: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CropRecord {
  id: string;
  farmerId: string;
  farmId: string;
  cropName: string;
  variety?: string;
  category: string;
  areaAcres: number;
  plantingDate: string;
  expectedHarvestDate?: string;
  expectedYieldKg?: number;
  actualYieldKg?: number;
  estimatedExpenseInr?: number;
  stage: 'sowing' | 'vegetative' | 'flowering' | 'harvesting' | 'harvested';
  healthStatus: 'healthy' | 'watch' | 'at_risk';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CropActivity {
  id: string;
  farmerId: string;
  cropId: string;
  activityType: string;
  date: string;
  expenseInr: number;
  notes?: string;
  createdAt?: Timestamp;
}

export interface SoilMeasurement {
  id: string;
  farmerId: string;
  farmId: string;
  fieldName: string;
  sourceType: 'manual_entry' | 'lab_report';
  ph: number;
  moisturePercent: number;
  temperatureC: number;
  nitrogenPpm: number;
  phosphorusPpm: number;
  potassiumPpm: number;
  recordedDate: string;
  notes?: string;
  createdAt?: Timestamp;
}

export interface IrrigationSchedule {
  id: string;
  farmerId: string;
  farmId: string;
  cropName: string;
  fieldName: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  waterVolumeLiters: number;
  method: 'drip' | 'sprinkler' | 'furrow' | 'flood' | 'manual';
  status: 'scheduled' | 'completed' | 'skipped';
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlantHealthReport {
  id: string;
  farmerId: string;
  cropType: string;
  observedSymptoms: string;
  possibleIssue: string;
  confidenceLevel: 'Low' | 'Moderate' | 'High';
  uncertaintyNote: string;
  visibleSymptoms?: string[];
  contributingFactors?: string[];
  preventiveSteps?: string[];
  whenToConsultExpert: string;
  imageName?: string;
  createdAt?: Timestamp;
}

export interface MarketplaceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  productName: string;
  cropCategory: string;
  quantity: number;
  unit: string;
  pricePerUnitInr: number;
  harvestDate: string;
  location: string;
  description: string;
  imageUrl?: string;
  status: 'available' | 'reserved' | 'sold_out' | 'flagged' | 'removed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'completed';

export interface OrderRecord {
  id: string;
  listingId: string;
  productName: string;
  farmerId: string;
  farmerName: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  unit: string;
  pricePerUnitInr: number;
  totalAmountInr: number;
  deliveryLocation: string;
  buyerNotes?: string;
  paymentSettlementStatus: 'offline_agreed_pending';
  status: OrderStatus;
  reviewRating?: number;
  reviewComment?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  category: string;
  rateInr: number;
  rateUnit: string;
  operatingLocation: string;
  description: string;
  availabilityStatus: 'available' | 'busy' | 'paused';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ServiceBookingStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  farmerId: string;
  farmerName: string;
  requestedDate: string;
  location: string;
  notes?: string;
  status: ServiceBookingStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FarmTeamMember {
  id: string;
  farmerId: string;
  memberName: string;
  roleTitle: string;
  phone?: string;
  assignedArea?: string;
  status: 'active' | 'inactive';
  createdAt?: Timestamp;
}

export interface FarmTask {
  id: string;
  farmerId: string;
  taskName: string;
  description?: string;
  assignedMemberName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'todo' | 'in_progress' | 'completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface EcoPointsTransaction {
  id: string;
  userId: string;
  userName: string;
  activityCategory:
    | 'water_saving'
    | 'recycling'
    | 'organic_composting'
    | 'soil_conservation'
    | 'reward_redemption'
    | 'admin_adjustment';
  description: string;
  requestedPoints: number;
  awardedPoints: number;
  transactionType: 'earn' | 'redeem';
  status: 'pending' | 'verified' | 'rejected';
  reviewedBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: string;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface NotificationItem {
  id: string;
  userId: string;
  senderId: string;
  category: 'order' | 'service' | 'support' | 'task' | 'verification' | 'announcement' | 'eco_points' | 'expert';
  title: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_for_response' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  category: string;
  subject: string;
  description: string;
  attachmentName?: string;
  status: SupportTicketStatus;
  adminResponse?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'farmer' | 'buyer' | 'provider' | 'expert';
  active: boolean;
  authorId: string;
  createdAt?: Timestamp;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  targetCollection: string;
  targetId: string;
  details?: string;
  createdAt?: Timestamp;
}

export interface EducationalArticle {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  category: string;
  cropFocus?: string;
  summary: string;
  content: string;
  language: AppLanguage;
  status: 'published' | 'draft';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ExpertQuestion {
  id: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  question: string;
  isPublic: boolean;
  status: 'open' | 'answered' | 'closed';
  answer?: string;
  expertId?: string;
  expertName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlatformSettings {
  maintenanceNotice?: string;
  ecoPointsDefaultReward: number;
  requireVerificationForListings: boolean;
  supportEmail: string;
  updatedAt?: Timestamp;
}

export interface WeatherResponse {
  available: boolean;
  reason?: string;
  provider?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  observedAt?: string;
  current?: {
    temperatureC: number;
    humidityPercent: number;
    rainfallMm: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    condition: string;
  };
  forecast?: Array<{
    date: string;
    condition: string;
    tempMaxC: number;
    tempMinC: number;
    precipitationMm: number;
    rainProbability: number;
    maxWindKmh: number;
  }>;
  alerts?: string[];
}
