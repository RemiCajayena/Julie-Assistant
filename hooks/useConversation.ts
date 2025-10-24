// hooks/useConversation.ts
import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationState {
  messages: Message[];
  context: {
    userName?: string;
    userPreferences: string[];
    conversationTopic?: string;
    mood: 'friendly' | 'helpful' | 'casual' | 'professional';
  };
}

export const useConversation = () => {
  const [conversation, setConversation] = useState<ConversationState>({
    messages: [],
    context: {
      userPreferences: [],
      mood: 'friendly'
    }
  });

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  const updateContext = (updates: Partial<ConversationState['context']>) => {
    setConversation(prev => ({
      ...prev,
      context: { ...prev.context, ...updates }
    }));
  };

  const getConversationHistory = () => {
    return conversation.messages.slice(-10); // Últimos 10 mensajes
  };

  const clearConversation = () => {
    setConversation({
      messages: [],
      context: {
        userPreferences: conversation.context.userPreferences,
        mood: 'friendly'
      }
    });
  };

  return {
    conversation,
    addMessage,
    updateContext,
    getConversationHistory,
    clearConversation
  };
};