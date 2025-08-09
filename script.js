
// Function to show a custom message box instead of alert()
function showMessageBox(message) {
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    const messageCloseBtn = document.getElementById('message-close-btn');

    messageText.textContent = message;
    messageBox.classList.remove('hidden');

    // Close the message box when the button is clicked
    messageCloseBtn.onclick = () => {
        messageBox.classList.add('hidden');
    };
}

// Function to show/hide the loading overlay
function showLoadingOverlay() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').classList.add('hidden');
}


// --- Drag and Drop Intro Page Logic ---
const fish = document.getElementById('fish');
const pothole = document.getElementById('pothole');
const introPage = document.getElementById('intro-page');
const mainAppPage = document.getElementById('main-app-page');

// Prevent default drag behaviors
pothole.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow drop
    pothole.classList.add('border-green-500', 'scale-105'); // Visual feedback for drag over
});

pothole.addEventListener('dragleave', () => {
    pothole.classList.remove('border-green-500', 'scale-105');
});

pothole.addEventListener('drop', (e) => {
    e.preventDefault();
    pothole.classList.remove('border-green-500', 'scale-105');

    const data = e.dataTransfer.getData('text/plain');
    if (data === 'fish') {
        // Animate the fish into the pothole by hiding it smoothly
        fish.style.transition = 'all 0.5s ease-out';
        fish.style.opacity = '0';
        fish.style.transform = 'scale(0.5)';

        // After a small delay, hide the intro page and show the main app
        setTimeout(() => {
            introPage.classList.add('hidden');
            mainAppPage.classList.remove('hidden');
            mainAppPage.classList.remove('opacity-0', 'scale-95');
            mainAppPage.classList.add('opacity-100', 'scale-100');
        }, 500);
    }
});

fish.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'fish');
    fish.classList.add('opacity-75');
});

fish.addEventListener('dragend', () => {
    fish.classList.remove('opacity-75');
});


// --- Main Application Page Logic ---
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const previewText = document.getElementById('preview-text');
const previewImg = imagePreview.querySelector('img');
const fishTypeSelect = document.getElementById('fish-type');
const analyzeBtn = document.getElementById('analyze-btn');
const downloadBtn = document.getElementById('download-btn');
const resultsSection = document.getElementById('results-section');
const numPotholesSpan = document.getElementById('num-potholes');
const avgFishPerPotholeSpan = document.getElementById('avg-fish-per-pothole');
const totalFishSpan = document.getElementById('total-fish');
const fishTypeDisplayAvg = document.getElementById('fish-type-display-avg');
const fishTypeDisplayTotal = document.getElementById('fish-type-display-total');
const rawReportSection = document.getElementById('ai-raw-report');
const rawReportContent = document.getElementById('raw-report-content');

let uploadedImageBase64 = null; // To store the base64 string of the uploaded image
let currentReportContent = ""; // To store the analysis results for the download button

// Handle image upload and preview
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            showMessageBox('Image file is too large! Please select an image under 4MB.');
            imageUpload.value = '';
            previewImg.classList.add('hidden');
            previewImg.src = '';
            previewText.classList.remove('hidden');
            uploadedImageBase64 = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewImg.classList.remove('hidden');
            previewText.classList.add('hidden');
            uploadedImageBase64 = event.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    } else {
        previewImg.classList.add('hidden');
        previewImg.src = '';
        previewText.classList.remove('hidden');
        uploadedImageBase64 = null;
    }
});

imagePreview.addEventListener('click', () => {
    imageUpload.click();
});

imagePreview.addEventListener('dragover', (e) => {
    e.preventDefault();
    imagePreview.classList.add('border-blue-500', 'bg-blue-50');
});

imagePreview.addEventListener('dragleave', () => {
    imagePreview.classList.remove('border-blue-500', 'bg-blue-50');
});

imagePreview.addEventListener('drop', (e) => {
    e.preventDefault();
    imagePreview.classList.remove('border-blue-500', 'bg-blue-50');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        imageUpload.files = files;
        imageUpload.dispatchEvent(new Event('change'));
    }
});


// --- Pothole and Fish Calculation Logic (Simulated with LLM) ---
const FISH_VOLUMES = {
    guppy: 1,
    sardine: 3,
    goldfish: 5,
    catfish: 10,
    arowana: 25
};

const POTHOLE_VOLUME_UNITS = {
    small: 50,
    medium: 150,
    large: 300
};

async function getImageDescription(base64ImageData) {
    const prompt = "Analyze the image of a road. Provide a detailed, paragraph-long description of any potholes or road damage you can identify. Be as specific as possible about the number and size (small, medium, or large) of the potholes. If no potholes are visible, state that clearly in your description.";
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64ImageData
                        }
                    }
                ]
            }
        ]
    };

    const apiKey = "AIzaSyCZtpe5uVc9UHQWzQbW8SP_TbMj9UH7DU4";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000;

    let lastError = "Unknown error.";

    while (retries < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const delay = baseDelay * Math.pow(2, retries);
