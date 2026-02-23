
export interface MessageReactions {
  [emoji: string]: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  type: 'announcement' | 'message' | 'update' | 'file';
  reactions: MessageReactions;
}
