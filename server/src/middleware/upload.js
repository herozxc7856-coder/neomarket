/**
 * Middleware для загрузки файлов (Multer)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Создаем директории если не существуют
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const productsDir = path.join(uploadsDir, 'products');
const chatDir = path.join(uploadsDir, 'chat');

[avatarsDir, productsDir, chatDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    if (req.uploadType === 'avatar') {
      uploadPath = avatarsDir;
    } else if (req.uploadType === 'product') {
      uploadPath = productsDir;
    } else if (req.uploadType === 'chat') {
      uploadPath = chatDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP) и документы (PDF, TXT)'));
  }
};

// Настройка загрузки
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB максимум
  }
});

// Middleware для установки типа загрузки
const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

module.exports = {
  upload,
  setUploadType
};
