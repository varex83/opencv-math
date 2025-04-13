# OpenCV Image Processing Web Application

A modern web application built with React and OpenCV.js for performing various image processing operations. This application allows users to upload and process images using different OpenCV operations.

## Features

- **Image Upload**: Upload two images for processing
- **Image Cropping**: Interactive cropping interface for both images
- **Basic Operations**:
  - Addition
  - Subtraction
  - Bitwise AND
  - Bitwise OR
  - Bitwise XOR
  - Bitwise NOT
  - Image Blending
- **Grayscale Option**: Optional grayscale conversion for bitwise operations
- **Real-time Processing**: Immediate results as you adjust parameters
- **Responsive Design**: Works on both desktop and mobile devices

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0 or higher)
  ```bash
  # Install Bun
  curl -fsSL https://bun.sh/install | bash
  ```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd opencv1
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload Images**:
   - Click on "Select Image A" and "Select Image B" to upload your images
   - Supported formats: JPG, PNG, etc.

2. **Crop Images** (optional):
   - Enable editing mode using the "Enable Editing" button
   - Drag the corners or edges of the crop box to adjust
   - Click "Set Optimal Crop Size" to automatically match image dimensions

3. **Select Operation**:
   - Choose from the available operations in the dropdown menu
   - For bitwise operations, you can optionally enable grayscale conversion

4. **Adjust Parameters**:
   - For blend operation, adjust alpha and beta values using sliders
   - For bitwise operations, toggle grayscale conversion as needed

5. **View Results**:
   - The processed result will appear automatically below the input images
   - Results update in real-time as you adjust parameters

## Technical Details

- Built with React and TypeScript
- Uses OpenCV.js for image processing
- Implements ReactCrop for image cropping functionality
- Styled with Tailwind CSS
- Responsive design for all screen sizes
- Uses Bun as the JavaScript runtime and package manager

## Dependencies

- @techstark/opencv-js
- react-image-crop
- react
- typescript
- tailwindcss

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenCV.js for providing the image processing capabilities
- ReactCrop for the image cropping functionality
- The OpenCV community for their excellent documentation and support
- Bun for providing a fast and efficient JavaScript runtime
