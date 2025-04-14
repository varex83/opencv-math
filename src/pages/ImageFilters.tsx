import { useState, useRef, useEffect } from 'react';
import { FileInput } from '../components/ui/file-input';
import { useOpenCV } from '../providers/OpenCVProvider';

interface FilterConfig {
  name: string;
  parameters: {
    [key: string]: {
      type: 'number' | 'boolean' | 'select';
      min?: number;
      max?: number;
      step?: number;
      options?: string[];
      default: number | boolean | string;
      value?: number | string | boolean;
    };
  };
}

interface ImageState {
  image: HTMLImageElement | null;
  src: string;
}

const ImageFilters = () => {
  const { isOpenCVReady, cv } = useOpenCV();
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  const [image, setImage] = useState<ImageState>({
    image: null,
    src: '',
  });
  const [filteredImage, setFilteredImage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [splitPosition, setSplitPosition] = useState<number>(50);
  const [useGrayscale, setUseGrayscale] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage({
          image: img,
          src: event.target?.result as string,
        });
        // Set default filter immediately after image load
        handleFilterSelect('noFilter');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyFilter = () => {
    if (!isOpenCVReady || !cv || !image.image || !canvasRef.current || !filterConfig) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image
    canvas.width = image.image.width;
    canvas.height = image.image.height;

    try {
      // Create OpenCV matrix from image
      const src = cv.imread(image.image);
      const dst = new cv.Mat();

      // Convert to grayscale if toggle is on
      if (useGrayscale) {
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.cvtColor(gray, src, cv.COLOR_GRAY2RGBA);
        gray.delete();
      }

      // Apply selected filter
      switch (selectedFilter) {
        case 'noFilter':
          src.copyTo(dst);
          break;
        case 'bilateralFilter':
          // Convert to BGR if needed
          let bgr = new cv.Mat();
          cv.cvtColor(src, bgr, cv.COLOR_RGBA2BGR);
          
          // Apply bilateral filter
          cv.bilateralFilter(
            bgr,
            dst,
            filterConfig.parameters.d.value as number,
            filterConfig.parameters.sigmaColor.value as number,
            filterConfig.parameters.sigmaSpace.value as number
          );
          
          // Convert back to RGBA
          cv.cvtColor(dst, dst, cv.COLOR_BGR2RGBA);
          bgr.delete();
          break;
        case 'blur':
          cv.blur(
            src,
            dst,
            new cv.Size(
              filterConfig.parameters.ksizeX.value as number,
              filterConfig.parameters.ksizeY.value as number
            )
          );
          break;
        case 'boxFilter':
          cv.boxFilter(
            src,
            dst,
            -1,
            new cv.Size(
              filterConfig.parameters.ksizeX.value as number,
              filterConfig.parameters.ksizeY.value as number
            )
          );
          break;
        case 'dilate':
          const kernelDilate = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(
              filterConfig.parameters.ksizeX.value as number,
              filterConfig.parameters.ksizeY.value as number
            )
          );
          cv.dilate(src, dst, kernelDilate);
          kernelDilate.delete();
          break;
        case 'erode':
          const kernelErode = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(
              filterConfig.parameters.ksizeX.value as number,
              filterConfig.parameters.ksizeY.value as number
            )
          );
          cv.erode(src, dst, kernelErode);
          kernelErode.delete();
          break;
        case 'GaussianBlur':
          // Ensure ksizeX and ksizeY are odd numbers
          const ksizeX = Math.max(1, Math.floor(filterConfig.parameters.ksizeX.value as number) | 1);
          const ksizeY = Math.max(1, Math.floor(filterConfig.parameters.ksizeY.value as number) | 1);
          
          cv.GaussianBlur(
            src,
            dst,
            new cv.Size(ksizeX, ksizeY),
            filterConfig.parameters.sigmaX.value as number,
            filterConfig.parameters.sigmaY.value as number
          );
          break;
        case 'medianBlur':
          cv.medianBlur(
            src,
            dst,
            filterConfig.parameters.ksize.value as number
          );
          break;
        case 'Sobel':
          // Convert to grayscale first
          const graySobel = new cv.Mat();
          cv.cvtColor(src, graySobel, cv.COLOR_RGBA2GRAY);
          
          // Apply Sobel with better depth for edge detection
          const sobelDst = new cv.Mat();
          cv.Sobel(
            graySobel,
            sobelDst,
            cv.CV_16S,
            filterConfig.parameters.dx.value as number,
            filterConfig.parameters.dy.value as number,
            parseInt(filterConfig.parameters.ksize.value as string)
          );
          
          // Convert back to 8-bit and then to RGBA
          const absSobel = new cv.Mat();
          cv.convertScaleAbs(sobelDst, absSobel);
          cv.cvtColor(absSobel, dst, cv.COLOR_GRAY2RGBA);
          
          // Clean up
          graySobel.delete();
          sobelDst.delete();
          absSobel.delete();
          break;
        case 'Scharr':
          // Convert to grayscale first
          const grayScharr = new cv.Mat();
          cv.cvtColor(src, grayScharr, cv.COLOR_RGBA2GRAY);
          
          // Apply Scharr with better depth for edge detection
          const scharrDst = new cv.Mat();
          cv.Scharr(
            grayScharr,
            scharrDst,
            cv.CV_16S,
            filterConfig.parameters.dx.value as number,
            filterConfig.parameters.dy.value as number
          );
          
          // Convert back to 8-bit and then to RGBA
          const absScharr = new cv.Mat();
          cv.convertScaleAbs(scharrDst, absScharr);
          cv.cvtColor(absScharr, dst, cv.COLOR_GRAY2RGBA);
          
          // Clean up
          grayScharr.delete();
          scharrDst.delete();
          absScharr.delete();
          break;
        case 'sepFilter2D':
          const kernelX = new cv.Mat(1, parseInt(filterConfig.parameters.kernelX.value as string), cv.CV_32F);
          const kernelY = new cv.Mat(parseInt(filterConfig.parameters.kernelY.value as string), 1, cv.CV_32F);
          cv.setIdentity(kernelX, new cv.Scalar(1));
          cv.setIdentity(kernelY, new cv.Scalar(1));
          cv.sepFilter2D(src, dst, -1, kernelX, kernelY);
          kernelX.delete();
          kernelY.delete();
          break;
        case 'Laplacian':
          // Convert to grayscale first
          const gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          
          // Apply Laplacian with better depth for edge detection
          cv.Laplacian(
            gray,
            dst,
            cv.CV_16S,
            parseInt(filterConfig.parameters.ksize.value as string)
          );
          
          // Convert back to 8-bit and then to RGBA
          const absDst = new cv.Mat();
          cv.convertScaleAbs(dst, absDst);
          cv.cvtColor(absDst, dst, cv.COLOR_GRAY2RGBA);
          
          // Clean up
          gray.delete();
          absDst.delete();
          break;
        default:
          throw new Error(`Filter ${selectedFilter} not implemented`);
      }

      // Display result
      cv.imshow(canvas, dst);
      setFilteredImage(canvas.toDataURL());

      // Clean up
      src.delete();
      dst.delete();
    } catch (error) {
      console.error('Error applying filter:', error);
    }
  };

  // Example filter configurations
  const availableFilters: FilterConfig[] = [
    {
      name: 'noFilter',
      parameters: {}
    },
    {
      name: 'bilateralFilter',
      parameters: {
        d: {
          type: 'number',
          min: 1,
          max: 15,
          step: 1,
          default: 5,
          value: 5
        },
        sigmaColor: {
          type: 'number',
          min: 0,
          max: 255,
          step: 1,
          default: 75,
          value: 75
        },
        sigmaSpace: {
          type: 'number',
          min: 0,
          max: 255,
          step: 1,
          default: 75,
          value: 75
        }
      }
    },
    {
      name: 'blur',
      parameters: {
        ksizeX: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        ksizeY: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        }
      }
    },
    {
      name: 'boxFilter',
      parameters: {
        ksizeX: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        ksizeY: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        }
      }
    },
    {
      name: 'dilate',
      parameters: {
        ksizeX: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        ksizeY: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        }
      }
    },
    {
      name: 'erode',
      parameters: {
        ksizeX: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        ksizeY: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        }
      }
    },
    {
      name: 'GaussianBlur',
      parameters: {
        ksizeX: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        ksizeY: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        },
        sigmaX: {
          type: 'number',
          min: 0,
          max: 10,
          step: 0.1,
          default: 0,
          value: 0
        },
        sigmaY: {
          type: 'number',
          min: 0,
          max: 10,
          step: 0.1,
          default: 0,
          value: 0
        }
      }
    },
    {
      name: 'medianBlur',
      parameters: {
        ksize: {
          type: 'number',
          min: 1,
          max: 31,
          step: 2,
          default: 3,
          value: 3
        }
      }
    },
    {
      name: 'Sobel',
      parameters: {
        dx: {
          type: 'number',
          min: 0,
          max: 2,
          step: 1,
          default: 1,
          value: 1
        },
        dy: {
          type: 'number',
          min: 0,
          max: 2,
          step: 1,
          default: 0,
          value: 0
        },
        ksize: {
          type: 'select',
          options: ['1', '3', '5', '7'],
          default: '3',
          value: '3'
        }
      }
    },
    {
      name: 'Scharr',
      parameters: {
        dx: {
          type: 'number',
          min: 0,
          max: 1,
          step: 1,
          default: 1,
          value: 1
        },
        dy: {
          type: 'number',
          min: 0,
          max: 1,
          step: 1,
          default: 0,
          value: 0
        }
      }
    },
    {
      name: 'sepFilter2D',
      parameters: {
        kernelX: {
          type: 'select',
          options: ['1', '3', '5', '7'],
          default: '3',
          value: '3'
        },
        kernelY: {
          type: 'select',
          options: ['1', '3', '5', '7'],
          default: '3',
          value: '3'
        }
      }
    },
    {
      name: 'Laplacian',
      parameters: {
        ksize: {
          type: 'select',
          options: ['1', '3', '5', '7'],
          default: '3',
          value: '3'
        }
      }
    }
  ];

  const handleFilterSelect = (filterName: string) => {
    const filter = availableFilters.find(f => f.name === filterName);
    setSelectedFilter(filterName);
    setFilterConfig(filter || null);
    // Apply filter immediately after selection
    if (image.image && filter) {
      applyFilter();
    }
  };

  const handleParameterChange = (paramName: string, value: number | string | boolean) => {
    if (!filterConfig) return;
    
    setFilterConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramName]: {
            ...prev.parameters[paramName],
            value
          }
        }
      };
    });
  };

  useEffect(() => {
    if (image.image) {
      if (selectedFilter && filterConfig) {
        applyFilter();
      } else {
        // Set default filter if none selected
        handleFilterSelect('noFilter');
      }
    }
  }, [image.image, selectedFilter, filterConfig, useGrayscale]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Filters</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <FileInput
            label="Select Image"
            accept="image/*"
            onFileSelect={handleFileSelect}
          />

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Convert to Grayscale</label>
            <input
              type="checkbox"
              checked={useGrayscale}
              onChange={(e) => setUseGrayscale(e.target.checked)}
              className="h-4 w-4"
            />
          </div>

          <h2 className="text-xl font-semibold">Select Filter</h2>
          <select
            className="w-full p-2 border rounded"
            value={selectedFilter}
            onChange={(e) => handleFilterSelect(e.target.value)}
          >
            <option value="">Select a filter</option>
            {availableFilters.map((filter) => (
              <option key={filter.name} value={filter.name}>
                {filter.name}
              </option>
            ))}
          </select>

          {filterConfig && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Filter Parameters</h3>
              {Object.entries(filterConfig.parameters).map(([paramName, config]) => (
                <div key={paramName} className="space-y-2">
                  <label className="block text-sm font-medium">
                    {paramName}
                  </label>
                  {config.type === 'number' && (
                    <div>
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={config.value as number}
                        onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600 ml-2">{config.value}</span>
                    </div>
                  )}
                  {config.type === 'select' && (
                    <select 
                      className="w-full p-2 border rounded"
                      value={config.value as string}
                      onChange={(e) => handleParameterChange(paramName, e.target.value)}
                    >
                      {config.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {config.type === 'boolean' && (
                    <input
                      type="checkbox"
                      checked={config.value as boolean}
                      onChange={(e) => handleParameterChange(paramName, e.target.checked)}
                      className="h-4 w-4"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          {image.image ? (
            <div className="relative" ref={previewRef}>
              <div className="relative w-full">
                <img
                  src={image.src}
                  alt="Original"
                  className="max-w-full h-auto rounded"
                />
                <div 
                  className="absolute top-0 left-0 w-full h-full overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
                >
                  <img
                    src={filteredImage || image.src}
                    alt="Filtered"
                    className="max-w-full h-auto rounded"
                  />
                </div>
                <div 
                  className="absolute top-0 left-0 w-full h-full cursor-ew-resize"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startPosition = splitPosition;
                    const previewWidth = previewRef.current?.clientWidth || 0;

                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaX = e.clientX - startX;
                      const deltaPercent = (deltaX / previewWidth) * 100;
                      const newPosition = Math.min(100, Math.max(0, startPosition + deltaPercent));
                      setSplitPosition(newPosition);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                    style={{ left: `${splitPosition}%` }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">Image preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageFilters; 