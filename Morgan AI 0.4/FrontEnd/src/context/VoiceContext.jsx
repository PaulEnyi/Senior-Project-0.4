import React, { createContext, useState } from 'react';

export const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <VoiceContext.Provider value={{ isListening, setIsListening, isSpeaking, setIsSpeaking }}>
      {children}
    </VoiceContext.Provider>
  );
};
