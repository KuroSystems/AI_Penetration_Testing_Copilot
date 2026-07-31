export interface SyncMessage {
  type: 'session_update' | 'knowledge_pack' | 'peer_announcement';
  payload: any;
  senderId: string;
  timestamp: Date;
}

export interface SyncPeer {
  id: string;
  address: string;
  lastSeen: Date;
  status: 'online' | 'offline';
}

export interface SyncSettings {
  enabled: boolean;
  port: number;
  peerDiscovery: boolean;
  knownPeers: string[];
}
