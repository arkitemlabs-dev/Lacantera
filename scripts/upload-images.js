const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const https = require('https');
const fs = require('fs');

const firebaseConfig = {
  apiKey: "AIzaSyDjOPRuY4FoZxnYTSlrZWxDRctLWQfzlQY",
  authDomain: "portal-proveedores-web.firebaseapp.com",
  projectId: "portal-proveedores-web",
  storageBucket: "portal-proveedores-web.firebasestorage.app",
  messagingSenderId: "312186975530",
  appId: "1:312186975530:web:5261ece658697686585a53"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

function convertGoogleDriveUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', reject);
  });
}

async function uploadToFirebase(localPath, storagePath) {
  const imageBuffer = fs.readFileSync(localPath);
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, imageBuffer);
  const downloadURL = await getDownloadURL(storageRef);
  
  fs.unlinkSync(localPath);
  return downloadURL;
}

async function main() {
  const images = [
    {
      id: "login-background",
      url: "https://drive.google.com/file/d/1AdWZ07sxlYsQ7-3h2gDBkPbEGSZpGCiz/view?usp=sharing",
      storagePath: "images/login-background.jpg"
    },
    {
      id: "login-logo", 
      url: "https://drive.google.com/file/d/1wvZCUTgQOrFgC-vR1DTEqjRIhLbQW88e/view?usp=sharing",
      storagePath: "images/login-logo.png"
    }
  ];

  for (const image of images) {
    try {
      console.log(`Descargando ${image.id}...`);
      const directUrl = convertGoogleDriveUrl(image.url);
      const tempFile = `temp_${image.id}.jpg`;
      
      await downloadImage(directUrl, tempFile);
      
      console.log(`Subiendo ${image.id} a Firebase...`);
      const firebaseUrl = await uploadToFirebase(tempFile, image.storagePath);
      
      console.log(`${image.id}: ${firebaseUrl}`);
    } catch (error) {
      console.error(`Error con ${image.id}:`, error.message);
    }
  }
}

main().catch(console.error);