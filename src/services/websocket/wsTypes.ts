export type WSMessageType = 
  | 'detection.new' 
  | 'alert.new' 
  | 'alert.updated' 
  | 'camera.status' 
  | 'processing.progress' 
  | 'system.health';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}
