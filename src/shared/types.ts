export interface Participant {
  id: string;
  discordId?: string;
  discordHandle: string;
  fullName: string;
  address: string;
  wishlist: string;
  createdAt: string;
}

export interface ParticipantPublic {
  id: string;
  discordHandle: string;
  createdAt: string;
}

export interface Match {
  id: string;
  giverId: string;
  giverHandle: string;
  giverName: string;
  receiverId: string;
  receiverHandle: string;
  receiverName: string;
  receiverAddress: string;
  receiverWishlist: string;
  createdAt: string;
}

export interface AssignedRecipient {
  receiverName: string;
  receiverHandle: string;
  receiverAddress: string;
  receiverWishlist: string;
}

export interface TrackingInfo {
  id: string;
  matchId: string;
  giverHandle: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip?: string;
  severity: 'info' | 'warn' | 'error';
}

export interface AppSettings {
  signupPasscode: string;
  signupDeadline: string;
  isMatchingComplete: boolean;
  totalParticipants: number;
  giftBudget: string;
  discordWebhookUrl?: string;
  discordPublicKey?: string;
  discordAppId?: string;
  discordBotToken?: string;
}

export interface ParticipantPortalData {
  participant: Participant;
  assignedRecipient: AssignedRecipient | null;
  trackingInfo: TrackingInfo | null;
  isMatchingComplete: boolean;
  isDeadlinePassed: boolean;
  giftBudget: string;
}

export interface SignupRequest {
  discordHandle: string;
  fullName: string;
  address: string;
  wishlist: string;
  passcode: string;
  hp_website?: string;
}

export interface ParticipantLoginRequest {
  discordHandle: string;
  passcode: string;
  hp_website?: string;
}

export interface UpdateParticipantProfileRequest {
  discordHandle: string;
  passcode: string;
  fullName: string;
  address: string;
  wishlist: string;
  hp_website?: string;
}

export interface UpdateTrackingRequest {
  discordHandle: string;
  passcode: string;
  carrier: string;
  trackingNumber: string;
  hp_website?: string;
}

export interface AdminLoginRequest {
  passcode: string;
  hp_website?: string;
}

export interface UpdateSettingsRequest {
  signupPasscode?: string;
  adminPasscode?: string;
  signupDeadline?: string;
  giftBudget?: string;
  discordWebhookUrl?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
