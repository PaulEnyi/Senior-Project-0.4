import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMic, FiMicOff, FiUser, FiCpu, FiHelpCircle, FiX } from 'react-icons/fi';
import '../../styles/chat.css';

export default function ChatWindow({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);
  const [quickQuestionsData, setQuickQuestionsData] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch quick questions from backend
  const fetchQuickQuestions = async () => {
    if (quickQuestionsData) {
      setShowQuickQuestions(true);
      return;
    }

    setLoadingQuestions(true);
    try {
      const response = await fetch('http://localhost:8000/api/chat/quick-questions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest'}`
        }
      });
      const data = await response.json();
      setQuickQuestionsData(data);
      setShowQuickQuestions(true);
    } catch (error) {
      console.error('Error fetching quick questions:', error);
      // Fallback to default questions if API fails
      setQuickQuestionsData({
        categories: {
          "Department Information": [
            "Where is the Computer Science department located?",
            "Who are the faculty members in Computer Science?",
            "What are the department's office hours?",
            "How do I contact the CS department?"
          ],
          "Academic Support": [
            "What tutoring services are available for CS students?",
            "How do I get help with programming assignments?",
            "How do I join student organizations like WiCS or GDSC?",
            "What study spaces are available for CS students?"
          ],
          "Career Resources": [
            "What internship programs are recommended?",
            "How do I prepare for technical interviews?",
            "What career resources are available through the department?",
            "How do I access NeetCode, LeetCode, and other prep resources?"
          ],
          "Advising & Registration": [
            "Who is my academic advisor and how do I contact them?",
            "How do I get an enrollment PIN for registration?",
            "What are the prerequisites for advanced CS courses?",
            "How do I submit an override request for a full class?"
          ]
        }
      });
      setShowQuickQuestions(true);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectQuickQuestion = (question) => {
    setInputMessage(question);
    setShowQuickQuestions(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token || token === 'guest') {
      alert('You must be logged in to use chat. Please log in.');
      window.location.reload();
      return;
    }

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: inputMessage,
          user_id: user?.id || 'guest'
        })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        data = { detail: 'No response from server.' };
      }

      if (response.status === 401) {
        localStorage.removeItem('token');
        alert('Session expired or unauthorized. Please log in again.');
        window.location.reload();
        return;
      }

      const botMessage = {
        id: Date.now() + 1,
        text: data.message || data.response || data.detail || 'I apologize, but I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: error.message || 'Sorry, I\'m having trouble connecting right now. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      setIsListening(false);
      // Stop listening logic here
    } else {
      setIsListening(true);
      // Start listening logic here
      try {
        // Voice recognition would go here
        setTimeout(() => setIsListening(false), 3000); // Auto-stop after 3 seconds for demo
      } catch (error) {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const quickQuestions = [
    { icon: '📚', text: 'What courses are offered?', query: 'What computer science courses does Morgan State offer?' },
    { icon: '📅', text: 'When is registration?', query: 'When is the registration period?' },
    { icon: '💼', text: 'Internship opportunities', query: 'How can I find internship opportunities?' },
    { icon: '🎓', text: 'Degree requirements', query: 'What are the CS degree requirements?' }
  ];

  const handleQuickQuestion = (query) => {
    setInputMessage(query);
  };

  return (
    <div className="chat-window-container">
      {/* Welcome Section */}
      {messages.length === 0 && (
        <div className="chat-welcome">
          <div className="welcome-content">
            <div className="welcome-icon">
              <img src="/assets/morgan-logo/morgan-logo.png" alt="Morgan AI" className="welcome-logo" />
            </div>
            <h1 className="welcome-title">Welcome to Morgan AI Assistant</h1>
            <p className="welcome-subtitle">
              I'm here to help you with information about Morgan State University's Computer Science Department
            </p>
            
            <div className="quick-questions-section">
              <h3 className="quick-questions-title">Quick Questions</h3>
              <div className="quick-questions-grid">
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    className="quick-question-btn"
                    onClick={() => handleQuickQuestion(q.query)}
                  >
                    <span className="question-emoji">{q.icon}</span>
                    <span className="question-label">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      {messages.length > 0 && (
        <div className="chat-messages-area">
          <div className="messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                <div className="message-avatar">
                  {msg.sender === 'user' ? (
                    <div className="avatar user-avatar">
                      <FiUser />
                    </div>
                  ) : (
                    <div className="avatar bot-avatar">
                      <FiCpu />
                    </div>
                  )}
                </div>
                <div className="message-bubble">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message bot-message">
                <div className="message-avatar">
                  <div className="avatar bot-avatar">
                    <FiCpu />
                  </div>
                </div>
                <div className="message-bubble typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Chat Input - Fixed at Bottom */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <div className="input-box">
            <textarea
              className="chat-textarea"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about Morgan State CS..."
              rows="1"
              disabled={isLoading}
            />
            <div className="input-actions">
              <button
                className="quick-questions-icon-btn"
                onClick={fetchQuickQuestions}
                disabled={loadingQuestions}
                title="Quick Questions"
              >
                <FiHelpCircle />
              </button>
              <button
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoice}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <FiMicOff /> : <FiMic />}
              </button>
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                title="Send message"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Questions Modal */}
      {showQuickQuestions && quickQuestionsData && (
        <div className="quick-questions-modal-overlay" onClick={() => setShowQuickQuestions(false)}>
          <div className="quick-questions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiHelpCircle className="modal-icon" />
                Quick Questions
              </h2>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowQuickQuestions(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>
            
            <div className="modal-content">
              {Object.entries(quickQuestionsData.categories).map(([category, questions]) => (
                <div key={category} className="question-category">
                  <h3 className="category-title">{category}</h3>
                  <div className="category-questions">
                    {questions.map((question, index) => (
                      <button
                        key={index}
                        className="modal-question-btn"
                        onClick={() => handleSelectQuickQuestion(question)}
                      >
                        <span className="question-number">{index + 1}</span>
                        <span className="question-text">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="modal-footer">
              <p className="modal-footer-text">
                Click a question to add it to your message box
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
