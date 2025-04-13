import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { FileInput } from '../components/ui/file-input';
import { Button } from '../components/ui/button';
import { useOpenCV } from '../providers/OpenCVProvider';
import cv from '@techstark/opencv-js';

type Operation = 'add' | 'subtract' | 'and' | 'or' | 'xor' | 'not' | 'blend';

interface ImageState {
  image: HTMLImageElement | null;
  crop: Crop;
  croppedImage: HTMLImageElement | null;
}

type SetImageState = React.Dispatch<React.SetStateAction<ImageState>>;

const BasicOperations = () => {
  const { isOpenCVReady, cv, error } = useOpenCV();
  const [imageA, setImageA] = useState<ImageState>({
    image: null,
    crop: { unit: '%', width: 100, height: 100, x: 0, y: 0 },
    croppedImage: null,
  });
  const [imageB, setImageB] = useState<ImageState>({
    image: null,
    crop: { unit: '%', width: 100, height: 100, x: 0, y: 0 },
    croppedImage: null,
  });
  const [isEditingEnabled, setIsEditingEnabled] = useState<boolean>(false);
  const [operation, setOperation] = useState<Operation>('add');
  const [alpha, setAlpha] = useState<number>(0.5);
  const [beta, setBeta] = useState<number>(0.5);
  const [useGrayscale, setUseGrayscale] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropRefA = useRef<HTMLImageElement>(null);
  const cropRefB = useRef<HTMLImageElement>(null);

  const handleFileSelect = (file: File, setImage: (state: ImageState) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage({
          image: img,
          crop: { unit: '%', width: 100, height: 100, x: 0, y: 0 },
          croppedImage: null,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (crop: Crop, imageRef: React.RefObject<HTMLImageElement>, setImage: SetImageState) => {
    if (!imageRef.current || !crop.width || !crop.height) return;

    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    const croppedImage = new Image();
    croppedImage.src = canvas.toDataURL();
    croppedImage.onload = () => {
      setImage(prev => ({
        ...prev,
        crop,
        croppedImage,
      }));
    };
  };

  const processImages = () => {
    if (!isOpenCVReady || !cv) {
      console.error('OpenCV is not ready yet');
      return;
    }

    const finalImageA = imageA.croppedImage || imageA.image;
    const finalImageB = imageB.croppedImage || imageB.image;

    if (!finalImageA || !finalImageB || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate maximum dimensions
    const maxWidth = Math.max(finalImageA.width, finalImageB.width);
    const maxHeight = Math.max(finalImageA.height, finalImageB.height);

    // Set canvas dimensions to maximum
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    let matA: cv.Mat | null = null;
    let matB: cv.Mat | null = null;
    let resultMat: cv.Mat | null = null;
    let resizedA: cv.Mat | null = null;
    let resizedB: cv.Mat | null = null;

    try {
      // Create OpenCV matrices
      matA = cv.imread(finalImageA);
      matB = cv.imread(finalImageB);
      resultMat = new cv.Mat(maxHeight, maxWidth, cv.CV_8UC4);

      if (!matA || !matB || !resultMat) {
        throw new Error('Failed to create OpenCV matrices');
      }

      // Resize images if needed
      if (matA.rows !== maxHeight || matA.cols !== maxWidth) {
        resizedA = new cv.Mat();
        cv.resize(matA, resizedA, new cv.Size(maxWidth, maxHeight));
      }

      if (matB.rows !== maxHeight || matB.cols !== maxWidth) {
        resizedB = new cv.Mat();
        cv.resize(matB, resizedB, new cv.Size(maxWidth, maxHeight));
      }

      // Use resized matrices if available, otherwise use original
      const finalMatA = resizedA || matA;
      const finalMatB = resizedB || matB;

      // Convert to grayscale if needed and enabled
      let matAProcessed = finalMatA;
      let matBProcessed = finalMatB;

      if (useGrayscale && (operation === 'xor' || operation === 'not' || operation === 'and' || operation === 'or')) {
        // Convert to grayscale if not already
        if (matAProcessed.channels() > 1) {
          const temp = new cv.Mat();
          cv.cvtColor(matAProcessed, temp, cv.COLOR_RGBA2GRAY);
          matAProcessed = temp;
        }
        if (matBProcessed.channels() > 1) {
          const temp = new cv.Mat();
          cv.cvtColor(matBProcessed, temp, cv.COLOR_RGBA2GRAY);
          matBProcessed = temp;
        }
      }

      switch (operation) {
        case 'add':
          cv.add(finalMatA, finalMatB, resultMat);
          break;
        case 'subtract':
          cv.subtract(finalMatA, finalMatB, resultMat);
          break;
        case 'and':
          cv.bitwise_and(matAProcessed, matBProcessed, resultMat);
          break;
        case 'or':
          cv.bitwise_or(matAProcessed, matBProcessed, resultMat);
          break;
        case 'xor':
          cv.bitwise_xor(matAProcessed, matBProcessed, resultMat);
          break;
        case 'not':
          cv.bitwise_not(matAProcessed, resultMat);
          break;
        case 'blend':
          cv.addWeighted(finalMatA, alpha, finalMatB, beta, 0, resultMat);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Display result
      cv.imshow(canvas, resultMat);
      setResult(canvas.toDataURL());
    } catch (error) {
      console.error('Error processing images:', error);
      alert(`Error processing images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up
      if (matA) matA.delete();
      if (matB) matB.delete();
      if (resultMat) resultMat.delete();
      if (resizedA) resizedA.delete();
      if (resizedB) resizedB.delete();
    }
  };

  useEffect(() => {
    if (imageA.image && imageB.image && isOpenCVReady) {
      processImages();
    }
  }, [imageA.croppedImage, imageB.croppedImage, operation, alpha, beta, isOpenCVReady, imageA.image, imageB.image, useGrayscale]);

  const setOptimalCropSize = () => {
    if (!imageA.image || !imageB.image) return;

    const minWidth = Math.min(imageA.image.width, imageB.image.width);
    const minHeight = Math.min(imageA.image.height, imageB.image.height);

    // Calculate crop percentages for both images
    const cropA = {
      unit: '%' as const,
      width: (minWidth / imageA.image.width) * 100,
      height: (minHeight / imageA.image.height) * 100,
      x: 0,
      y: 0,
    };

    const cropB = {
      unit: '%' as const,
      width: (minWidth / imageB.image.width) * 100,
      height: (minHeight / imageB.image.height) * 100,
      x: 0,
      y: 0,
    };

    setImageA(prev => ({ ...prev, crop: cropA }));
    setImageB(prev => ({ ...prev, crop: cropB }));

    // Trigger crop completion
    if (cropRefA.current) onCropComplete(cropA, cropRefA, setImageA);
    if (cropRefB.current) onCropComplete(cropB, cropRefB, setImageB);
  };

  if (!isOpenCVReady) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold mb-4">Loading OpenCV...</h2>
            <div className="flex justify-center items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p>Please wait while OpenCV is being initialized. This may take a few moments.</p>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                <p>Error: {error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-2 bg-red-500 hover:bg-red-600"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">OpenCV Image Operations</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsEditingEnabled(!isEditingEnabled)}
              className={isEditingEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}
            >
              {isEditingEnabled ? 'Disable Editing' : 'Enable Editing'}
            </Button>
            {isEditingEnabled && imageA.image && imageB.image && (
              <Button
                onClick={setOptimalCropSize}
                className="bg-purple-500 hover:bg-purple-600"
              >
                Set Optimal Crop Size
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Image A</h2>
            <FileInput
              label="Select Image A"
              accept="image/*"
              onFileSelect={(file) => handleFileSelect(file, setImageA)}
            />
            {imageA.image && (
              <div className="mt-4">
                <div className="mb-2 text-sm text-gray-600">
                  Original Size: {imageA.image.width} × {imageA.image.height}px
                  {imageA.croppedImage && (
                    <span className="ml-2">
                      | Cropped Size: {imageA.croppedImage.width} × {imageA.croppedImage.height}px
                    </span>
                  )}
                </div>
                {isEditingEnabled ? (
                  <ReactCrop
                    crop={imageA.crop}
                    onChange={(c) => setImageA(prev => ({ ...prev, crop: c }))}
                    onComplete={(c) => onCropComplete(c, cropRefA, setImageA)}
                  >
                    <img
                      ref={cropRefA}
                      src={imageA.image.src}
                      alt="Image A"
                      className="max-w-full h-auto rounded"
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={imageA.croppedImage?.src || imageA.image.src}
                    alt="Image A"
                    className="max-w-full h-auto rounded"
                  />
                )}
                {isEditingEnabled && (
                  <Button
                    className="mt-2"
                    onClick={() => setImageA(prev => ({ ...prev, croppedImage: null }))}
                  >
                    Reset Crop
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Image B</h2>
            <FileInput
              label="Select Image B"
              accept="image/*"
              onFileSelect={(file) => handleFileSelect(file, setImageB)}
            />
            {imageB.image && (
              <div className="mt-4">
                <div className="mb-2 text-sm text-gray-600">
                  Original Size: {imageB.image.width} × {imageB.image.height}px
                  {imageB.croppedImage && (
                    <span className="ml-2">
                      | Cropped Size: {imageB.croppedImage.width} × {imageB.croppedImage.height}px
                    </span>
                  )}
                </div>
                {isEditingEnabled ? (
                  <ReactCrop
                    crop={imageB.crop}
                    onChange={(c) => setImageB(prev => ({ ...prev, crop: c }))}
                    onComplete={(c) => onCropComplete(c, cropRefB, setImageB)}
                  >
                    <img
                      ref={cropRefB}
                      src={imageB.image.src}
                      alt="Image B"
                      className="max-w-full h-auto rounded"
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={imageB.croppedImage?.src || imageB.image.src}
                    alt="Image B"
                    className="max-w-full h-auto rounded"
                  />
                )}
                {isEditingEnabled && (
                  <Button
                    className="mt-2"
                    onClick={() => setImageB(prev => ({ ...prev, croppedImage: null }))}
                  >
                    Reset Crop
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation
              </label>
              <Select value={operation} onValueChange={(value: Operation) => setOperation(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract (A - B)</SelectItem>
                  <SelectItem value="and">Bitwise AND</SelectItem>
                  <SelectItem value="or">Bitwise OR</SelectItem>
                  <SelectItem value="xor">Bitwise XOR</SelectItem>
                  <SelectItem value="not">Bitwise NOT</SelectItem>
                  <SelectItem value="blend">Blend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(operation === 'xor' || operation === 'not' || operation === 'and' || operation === 'or') && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="grayscale"
                  checked={useGrayscale}
                  onChange={(e) => setUseGrayscale(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="grayscale" className="text-sm font-medium text-gray-700">
                  Convert to Grayscale
                </label>
              </div>
            )}

            {operation === 'blend' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alpha (Image A weight)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-600">{alpha}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beta (Image B weight)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={beta}
                    onChange={(e) => setBeta(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-600">{beta}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          <canvas ref={canvasRef} className="hidden" />
          {result && (
            <img
              src={result}
              alt="Result"
              className="max-w-full h-auto rounded"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicOperations; 