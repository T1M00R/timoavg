const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Handle file uploads
app.post('/upload', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), (req, res) => {
    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const audioPath = req.files.audio[0].path;
    const imagePath = req.files.image[0].path;
    
    res.json({
        success: true,
        audioPath,
        imagePath
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 