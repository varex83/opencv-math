import { createContext, useContext, useState, ReactNode } from 'react';
import cv from '@techstark/opencv-js';

interface OpenCVContextType {
  isOpenCVReady: boolean;
  cv: typeof cv;
  error: string | null;
}

const OpenCVContext = createContext<OpenCVContextType>({
  isOpenCVReady: false,
  cv,
  error: null,
});

export const useOpenCV = () => useContext(OpenCVContext);

interface OpenCVProviderProps {
  children: ReactNode;
}

export const OpenCVProvider = ({ children }: OpenCVProviderProps) => {
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define Module with onRuntimeInitialized callback
  cv.onRuntimeInitialized = () => {
    console.log("OpenCV.js is ready!");
    console.log("OpenCV Build Information:", cv.getBuildInformation());
    setIsOpenCVReady(true);
  };

  return (
    <OpenCVContext.Provider value={{ isOpenCVReady, cv, error }}>
      {children}
    </OpenCVContext.Provider>
  );
}; 