// src/App.jsx
import React, { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import CustomerTable from './components/CustomerTable';
import { hasData, saveCustomerBatches } from './utils/indexedDB';
import { generateCustomerBatches } from './utils/dataGenerator';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [progress, setProgress] = useState(0);
  // CHANGED: Only generate 10K real records for fast loading
  const [total] = useState(10000);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    const dataExists = await hasData();
    
    if (dataExists) {
      setIsInitialized(true);
      return;
    }

    console.log('Generating 10K customer records for demo...');
    
    // Generate in batches of 1000 records
    const batchGenerator = generateCustomerBatches(total, 1000);
    
    await saveCustomerBatches(batchGenerator, total, (current, total) => {
      setProgress(current);
    });
    
    console.log('Database initialized!');
    setIsInitialized(true);
  };

  if (!isInitialized) {
    return <LoadingScreen progress={progress} total={total} />;
  }

  return <CustomerTable />;
}

export default App;