const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors()); // Activation de CORS
app.use(express.json()); // Permet à l'API de traiter le JSON

// Middleware pour servir les fichiers statiques depuis le dossier "public"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = 3000;

// Répertoire public pour stocker et servir des images
const uploadDir = 'uploads/';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuration de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Routes
// Route POST pour uploader une image
app.post('/upload', upload.single('image'), (req, res) => {
    const imageName = req.body.imageName || req.file.originalname;
    const imageEvent = req.body.imageEvent || '';
    const imageId = `image_${Date.now()}`;
    const fileExtension = path.extname(req.file.originalname);
    const newNameWithExtension = imageName + (imageName !== req.file.originalname ? fileExtension : '');
    const newPath = path.join(uploadDir, newNameWithExtension, imageEvent);
    fs.rename(req.file.path, newPath, (err) => {
        if (err) {
            res.status(500).send({
                message: 'Unable to rename the uploaded image!',
                error: err
            });
        } else {
            res.redirect('/');
        }
    });
});


// Route pour afficher toutes les images
app.get('/images', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            res.status(500).send({
                message: 'Unable to scan images directory!',
                error: err
            });
        } else {
            const images = files.map(file => path.join(req.protocol + '://' + req.get('host'), uploadDir, file));
            res.send(images);
        }
    });
});

// route pour l'affichage individuel des images
app.get('/images/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const imagePath = path.join(uploadDir, imageName);

    if (fs.existsSync(imagePath)) {
        const imageHTML = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Image Viewer</title>
                <style>
                    body {
                        margin: 0;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background-color: rgba(0, 0, 0, 0.9);
                    }

                    img {
                        max-width: 100%;
                        max-height: 100%;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }

                    /* Fermer le bouton */
                    .close-btn {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        color: #fff;
                        font-size: 24px;
                        cursor: pointer;
                        z-index: 100;
                    }
                </style>
            </head>
            <body>
                <span class="close-btn" onclick="closeImage()">×</span>
                <img src="/uploads/${imageName}" alt="Image">
                <script>
                    function closeImage() {
                        window.location.href = '/';
                    }
                </script>
            </body>
            </html>
        `;

        res.send(imageHTML);
    } else {
        res.status(404).send('Image not found');
    }
});


// Modification de la route principale pour inclure le formulaire et les images
app.get('/', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            res.status(500).send({
                message: 'Unable to scan images directory!',
                error: err
            });
        } else {
            const shuffledFiles = shuffleArray(files);
            const imagesHTML = shuffledFiles.map((file, index) => {
                const fileNameWithoutExtension = path.parse(file).name;
                const imageUrl = `${req.protocol + '://' + req.get('host')}/uploads/${file}`;
                console.log(imageUrl);
                const imageId = `image_${Date.now() + index}`; // Utilisez un ID unique
                const imageEvent = req.body[`imageEvent_${imageId}`] || ''; // Récupère l'événement associé
            
                return `
                    <div class="image-card" id="${imageId}">
                        <img src="${imageUrl}" alt="${fileNameWithoutExtension}" onclick="openImage('${file}')">
                        <div class="image-info">
                            <p>${fileNameWithoutExtension}</p>
                            <p>${imageEvent}</p>
                            <button onclick="likeImage('${file}')" class="like-button">Like</button>
                            <span id="likeCount_${file}">0</span> Likes
                            <button onclick="shareImage('${imageUrl}', '${imageUrl}')" class="share-button">
                                <span class="share-icon">➤</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            
            
            const formHTML = `
                <form id="uploadForm" action="/upload" method="post" enctype="multipart/form-data">
                    <label for="image">Choisir une image :</label>
                    <input type="file" name="image" id="image" required>
                    <label for="imageName">Nom de l'image :</label>
                    <input type="text" name="imageName" id="imageName" placeholder="Nom du fichier">
                    <label for="imageEvent">Événement :</label>
                    <input type="text" name="imageEvent" id="imageEvent" placeholder="Événement associé">
                    <button type="submit">Télécharger</button>
                </form>
            `;

            const mainPageHTML = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Image Upload and Gallery</title>
                    <style>
                        body {
                            text-align: center;
                            background-color: #f4f4f4;
                            padding: 20px;
                        }

                        h1 {
                            color: #333;
                        }

                        .image-container {
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: center;
                        }

                        .image-card {
                            margin: 10px;
                            padding: 10px;
                            border: 1px solid #ddd;
                            background-color: #fff;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            border-radius: 8px;
                            text-align: center;
                            transition: transform 0.3s ease;
                        }

                        .image-card img {
                            max-width: 100%;
                            max-height: 200px;
                            object-fit: cover;
                            border-radius: 4px;
                        }
                        .image-card:hover {
                            transform: scale(1.1);
                        }
                        .image-info {
                            margin-top: 10px;
                        }

                        footer {
                            margin-top: 20px;
                            color: #777;
                        }

                        #uploadForm {
                            margin: 20px;
                            padding: 20px;
                            border: 1px solid #ddd;
                            background-color: #fff;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            border-radius: 8px;
                            text-align: center;
                        }

                        #uploadForm label {
                            display: block;
                            margin-top: 10px;
                        }

                        #uploadForm input {
                            width: 100%;
                            padding: 10px;
                            margin-top: 5px;
                            margin-bottom: 10px;
                            box-sizing: border-box;
                        }

                        #uploadForm button {
                            background-color: #4CAF50;
                            color: #fff;
                            padding: 10px 20px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        }

                        #uploadForm button:hover {
                            background-color: #45a049;
                        }
                        .like-button {
                            background-color: #4CAF50;
                            color: #fff;
                            padding: 5px 10px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            margin-top: 5px;
                            float: right;
                        }

                        .like-button:hover {
                            background-color: #45a049;
                        }
                        .share-button {
                            display: inline-block;
                            margin-right: 10px;
                            padding: 8px;
                            background-color: #3498db; /* Couleur bleue */
                            color: #fff;
                            text-decoration: none;
                            border-radius: 50%; /* Rend le bouton rond */
                            cursor: pointer;
                            transition: background-color 0.3s ease;
                            position: relative;
                            float: left;
                        }
                        
                        .share-button:hover {
                            background-color: #2980b9; /* Couleur bleue légèrement plus sombre au survol */
                        }
                        
                        .share-icon {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                        }                        
                    </style>
                    <script>
                        function likeImage(imageName) {
                            const likeCountElement = document.getElementById('likeCount_' + imageName);
                            let likeCount = parseInt(likeCountElement.innerText);
                            likeCount++;
                            likeCountElement.innerText = likeCount;
                        }
                    </script>
                </head>
                <body>
                    <h1>L'Instant</h1>

                    <div class="image-container">
                        ${imagesHTML.join('\n')}
                    </div>

                    ${formHTML}

                    <script>
                        function openImage(imageName) {
                            window.location.href = '/images/' + imageName;
                        }
                    </script>
                    <script>
                        function shareImage(imageUrl) {
                            const textarea = document.createElement('textarea');
                            textarea.value = imageUrl;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            alert('URL copiée dans le presse-papiers : ' + imageUrl);
                        }
                    </script>

                </body>
                </html>
            `;

            res.send(mainPageHTML);
        }
    });
});



function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // Échange des éléments
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

// Fonction pour formater la date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

// Fonction pour ajouter un zéro devant les chiffres inférieurs à 10
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

// Démarrage du serveur
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
