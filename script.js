
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
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                    continue;
                }
                lastError = `API error: ${response.status} ${response.statusText}`;
                throw new Error(lastError);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                lastError = "Unexpected API response structure.";
                console.error("Unexpected API response structure:", result);
                return "No potholes detected.";
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            lastError = error.message;
            if (retries < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, retries);
                console.warn(`API call failed. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            retries++;
        }
    }

    const fallbackCount = Math.floor(Math.random() * 4) + 2;
    const sarcasticMessage = `AI's Raw Report (For Our Eyes Only):\nOur highly-advanced AI's pothole detection algorithm failed to find any. It seems the potholes are so expertly camouflaged that they are invisible to the digital eye. We estimate there are around ${fallbackCount} potholes lurking under the perfect road surface.`;
    return sarcasticMessage;
}

function calculateFishCount(llmResponse, selectedFishType) {
    let potholes = [];

    const regex = /(\d+)\s*(?:small|medium|large)?\s*pothole(?:s)?/gi;
    let match;
    while ((match = regex.exec(llmResponse)) !== null) {
        const count = parseInt(match[1]);
        const size = (match[2] || 'medium').toLowerCase();
        for (let i = 0; i < count; i++) {
            potholes.push({ size: size });
        }
    }

    if (potholes.length === 0) {
        const individualSizeMatches = llmResponse.matchAll(/(small|medium|large) pothole/gi);
        for (const match of individualSizeMatches) {
            potholes.push({ size: match[1].toLowerCase() });
        }
    }

    if (potholes.length === 0) {
        const fallbackCount = Math.floor(Math.random() * 4) + 2;
        console.log(`(Sarcastic Fallback): The AI's vision is failing. We've detected ${fallbackCount} invisible potholes.`);

        for (let i = 0; i < fallbackCount; i++) {
            potholes.push({ size: 'medium' });
        }
    }

    let totalPotholeVolume = 0;
    potholes.forEach(pothole => {
        totalPotholeVolume += POTHOLE_VOLUME_UNITS[pothole.size] || 0;
    });

    const fishVolume = FISH_VOLUMES[selectedFishType] || FISH_VOLUMES.guppy;
    const totalFish = Math.floor(totalPotholeVolume / fishVolume);
    const avgFishPerPothole = potholes.length > 0 ? (totalFish / potholes.length).toFixed(2) : 0;

    return {
        numPotholes: potholes.length,
        avgFishPerPothole: parseFloat(avgFishPerPothole),
        totalFish: totalFish
    };
}

function downloadReport() {
    const reportContent = `
    --- Thrissur's Aquatic Infrastructure Report ---

    AI's Raw Report:
    ${rawReportContent.textContent}

    --- Analysis Results ---

    Total Potholes Detected: ${numPotholesSpan.textContent}
    Average ${fishTypeDisplayAvg.textContent} per Pothole: ${avgFishPerPotholeSpan.textContent}
    Total ${fishTypeDisplayTotal.textContent} Population Potential: ${totalFishSpan.textContent}

    Disclaimer: This report is purely for satirical purposes and does not reflect actual road conditions or fish populations.
    Any resemblance to real-world infrastructure is purely coincidental (or perhaps, sadly, not).

    --------------------------------------------
    `;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pothole_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


analyzeBtn.addEventListener('click', async () => {
    if (!uploadedImageBase64) {
        showMessageBox('Please upload an image of the road first!');
        return;
    }

    showLoadingOverlay();
    rawReportSection.classList.add('hidden');

    const selectedFishType = fishTypeSelect.value;

    try {
        const llmResponse = await getImageDescription(uploadedImageBase64);
        console.log("LLM Raw Response:", llmResponse);
        rawReportContent.textContent = llmResponse;
        rawReportSection.classList.remove('hidden');

        const results = calculateFishCount(llmResponse, selectedFishType);

        numPotholesSpan.textContent = results.numPotholes;
        avgFishPerPotholeSpan.textContent = results.avgFishPerPothole;
        totalFishSpan.textContent = results.totalFish;
        fishTypeDisplayAvg.textContent = fishTypeSelect.options[fishTypeSelect.selectedIndex].text.split(' ')[0];
        fishTypeDisplayTotal.textContent = fishTypeSelect.options[fishTypeSelect.selectedIndex].text.split(' ')[0];

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        downloadBtn.onclick = downloadReport;

    } catch (error) {
        console.error("Analysis failed:", error);
        showMessageBox('An error occurred during analysis. Please try again. (Our AI is sometimes as confused as Thrissur traffic.)');
    } finally {
        hideLoadingOverlay();
    }
});

fishTypeSelect.addEventListener('change', () => {
    fishTypeDisplayAvg.textContent = fishTypeSelect.options[fishTypeSelect.selectedIndex].text.split(' ')[0];
    fishTypeDisplayTotal.textContent = fishTypeSelect.options[fishTypeSelect.selectedIndex].text.split(' ')[0];
});

document.addEventListener('DOMContentLoaded', () => {
    fishTypeSelect.dispatchEvent(new Event('change'));
});

