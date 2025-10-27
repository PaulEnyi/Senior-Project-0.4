import { create } from 'zustand';
import api from '../services/api';
import realtimeAPI from '../services/realtimeAPI';
import toast from 'react-hot-toast';

const useChatStore = create((set, get) => ({
  messages: [],
  threads: [],
  currentThread: null,
  isLoading: false,
  error: null,
  isStreaming: false,

  // Send a message
  sendMessage: async (content, threadId = null) => {
    const { currentThread } = get();
    const activeThreadId = threadId || currentThread?.thread_id;

    // Add user message immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      const response = await api.sendMessage({
        message: content,
        thread_id: activeThreadId
      });

      const assistantMessage = {
        id: response.data.message_id || `msg-${Date.now()}`,
        role: 'assistant',
        content: response.data.message,
        sources: response.data.sources || [],
        timestamp: response.data.timestamp
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false
      }));

      // Update thread if needed
      if (response.data.thread_id && !activeThreadId) {
        set({ currentThread: { thread_id: response.data.thread_id } });
      }

      return assistantMessage;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      
      // Remove the temporary user message on error
      set((state) => ({
        messages: state.messages.filter(m => m.id !== userMessage.id)
      }));
      
      throw error;
    }
  },

  // Stream a message response
  streamMessage: async (content, threadId = null) => {
    const { currentThread } = get();
    const activeThreadId = threadId || currentThread?.thread_id;

    // Add user message
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null
    }));

    // Create placeholder for assistant message
    const assistantMessage = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage]
    }));

    try {
      await api.streamMessage(
        {
          message: content,
          thread_id: activeThreadId,
          stream: true
        },
        (chunk) => {
          // Update assistant message with streamed content
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          }));
        }
      );

      set({ isStreaming: false });
    } catch (error) {
      set({ error: error.message, isStreaming: false });
      toast.error('Streaming failed');
    }
  },

  // Load chat threads
  loadThreads: async () => {
    try {
      const response = await api.getThreads();
      set({ threads: response.data.threads });
      return response.data.threads;
    } catch (error) {
      toast.error('Failed to load chat history');
      return [];
    }
  },

  // Load messages for a thread
  loadThread: async (threadId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getThreadMessages(threadId);
      set({
        messages: response.data.messages,
        currentThread: response.data.thread,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to load thread', isLoading: false });
      toast.error('Failed to load conversation');
      throw error;
    }
  },

  // Create new thread
  createThread: () => {
    set({
      messages: [],
      currentThread: null,
      error: null
    });
  },

  // Delete thread
  deleteThread: async (threadId) => {
    try {
      await api.deleteThread(threadId);
      set((state) => ({
        threads: state.threads.filter(t => t.thread_id !== threadId),
        messages: state.currentThread?.thread_id === threadId ? [] : state.messages,
        currentThread: state.currentThread?.thread_id === threadId ? null : state.currentThread
      }));
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  },

  // Regenerate response
  regenerateResponse: async (messageIndex, threadId) => {
    const { messages } = get();
    if (messageIndex < 0 || messageIndex >= messages.length) return;

    // Find the last user message before this index
    let lastUserMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i];
        break;
      }
    }

    if (!lastUserMessage) return;

    // Remove messages after the user message
    const newMessages = messages.slice(0, messages.indexOf(lastUserMessage) + 1);
    set({ messages: newMessages });

    // Resend the message
    await get().sendMessage(lastUserMessage.content, threadId);
  },

  // Search chat history
  searchChats: async (query) => {
    try {
      const response = await api.searchChats(query);
      return response.data.results;
    } catch (error) {
      toast.error('Search failed');
      return [];
    }
  },

  // Submit feedback
  submitFeedback: async (messageId, rating, feedback) => {
    try {
      await api.submitFeedback(messageId, rating, feedback);
      
      // Update message with feedback
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId
            ? { ...msg, feedback: { rating, comment: feedback } }
            : msg
        )
      }));
      
      toast.success('Feedback submitted');
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear all messages
  clearMessages: () => set({ messages: [], currentThread: null })
}));

export const useChat = () => {
  const store = useChatStore();
  return store;
};