import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/policies');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    cb(null, `${baseName}-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',           // PDF files
    'image/jpeg',               // JPEG images
    'image/jpg',                // JPG images  
    'image/png',                // PNG images
    'image/tiff',               // TIFF images
    'image/bmp',                // BMP images
    'application/msword',       // DOC files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX files
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not supported. Allowed types: PDF, Images (JPEG, PNG, TIFF, BMP), Word documents`), false);
  }
};

// Configure multer with size limits and file validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Middleware for single policy document upload
export const uploadPolicyDocument = upload.single('policy_document');

// Middleware for multiple policy documents upload
export const uploadMultiplePolicyDocuments = upload.array('policy_documents', 5);

// Error handling middleware for multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 5 files allowed per upload'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        message: 'Use "policy_document" for single file or "policy_documents" for multiple files'
      });
    }
  } else if (error) {
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  next();
};

// Utility function to get file info
export const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/policies/${file.filename}` // URL to access the file
  };
};

// Utility function to delete uploaded file
export const deleteUploadedFile = (filename) => {
  try {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
