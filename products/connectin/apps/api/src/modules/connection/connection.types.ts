export interface ConnectionResponse {
  connectionId: string;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ConnectionListItem {
  connectionId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    headlineEn: string | null;
  };
  connectedSince: Date;
}
