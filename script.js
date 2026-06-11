// ============================
// CALIBRATED MAP CONFIGURATION (ZOOM 13.0)
// ============================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [9.2123, 45.4824], 
    zoom: 13.0,                
    minZoom: 13.0,             
    maxZoom: 13.0,             
    
    // EXPERIMENTAL CONTROLS: FIXED VIEWPORT MATRIX
    dragPan: false,            
    doubleClickZoom: false,    
    boxZoom: false,            
    keyboard: false,           
    touchZoomRotate: false,    
    
    pixelRatio: window.devicePixelRatio || 2 
});

// ============================
// GREEN-GREY MAP DESATURATION FILTER
// ============================
map.on('style.load', () => {
    const mapCanvas = map.getCanvas();
    mapCanvas.style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95) hue-rotate(25deg)';
});

// ============================
// EXACT EXTRACTED KML COORDINATE NODES (START POSITIONS)
// ============================
const startPositions = {
    leftNode:  [9.203801, 45.483950], // Top-Left Vertex ("G") 
    rightNode: [9.216763, 45.486383], // Top-Right Vertex ("M") 
    mainNode:  [9.217046, 45.476790]  // Main Bottom Vertex (Blue Pulse) 
};

// ============================
// REAL COHESION TARGET COORDINATES (VIA PALMANOVA CORRIDOR)
// ============================
const targetPositions = {
    leftNode:  [9.185900, 45.487200], // G için Isola Kavşağı (Piazzale Lagosta / Isola)
    rightNode: [9.239500, 45.498800]  // M için Via Palmanova ana arter giriş hattı
};

// ============================
// EXPERIMENT SUBJECTS CONFIGURATION
// ============================
const people = [
    {
        id: "leftNode",
        markerType: "grey-letter-dot",
        initial: "G",
        instance: null
    },
    {
        id: "rightNode",
        markerType: "grey-letter-dot",
        initial: "M",
        instance: null
    },
    {
        id: "mainNode",
        markerType: "blue-pulse-dot",
        instance: null
    }
];

// ============================
// MARKER RENDER ENGINE
// ============================
function createMarkerElement(person) {
    const clusterEl = document.createElement("div");
    clusterEl.className = "marker-cluster";

    const agentEl = document.createElement("div");
    agentEl.className = "agent-node";

    if (person.markerType === "blue-pulse-dot") {
        const mapsDotContainer = document.createElement("div");
        mapsDotContainer.className = "google-maps-dot-container";

        const breathingPulse = document.createElement("div");
        breathingPulse.className = "google-maps-pulse";

        const solidCore = document.createElement("div");
        solidCore.className = "google-maps-core";

        mapsDotContainer.appendChild(breathingPulse);
        mapsDotContainer.appendChild(solidCore);
        agentEl.appendChild(mapsDotContainer);
    } 
    else if (person.markerType === "grey-letter-dot") {
        const greyDot = document.createElement("div");
        greyDot.className = "experimental-grey-letter-dot";
        greyDot.textContent = person.initial;
        agentEl.appendChild(greyDot);
    }

    clusterEl.appendChild(agentEl);
    return clusterEl;
}

function initMarkers() {
    people.forEach(person => {
        person.instance = new maplibregl.Marker({
            element: createMarkerElement(person),
            anchor: "center"
        })
        .setLngLat(startPositions[person.id])
        .addTo(map);
    });
}

// ============================
// COHESION INTERPOLATION ENGINE (10s - 120s)
// ============================
let startTime = null;
const animationDuration = 110; // 120 - 10 = 110 saniye hareket süresi

function animateCohesion(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsedSeconds = (timestamp - startTime) / 1000;

    // İlk 10 saniye başlangıç konumlarında sabit bekleme
    if (elapsedSeconds < 10) {
        people.forEach(person => {
            if (person.instance) person.instance.setLngLat(startPositions[person.id]);
        });
    }
    // 10. ve 120. saniyeler arası hedeflere doğru doğrusal (lineer) ilerleme
    else if (elapsedSeconds >= 10 && elapsedSeconds <= 120) {
        const progress = (elapsedSeconds - 10) / animationDuration;

        people.forEach(person => {
            if (person.id === "leftNode" || person.id === "rightNode") {
                const startLng = startPositions[person.id][0];
                const startLat = startPositions[person.id][1];
                const targetLng = targetPositions[person.id][0];
                const targetLat = targetPositions[person.id][1];

                const currentLng = startLng + (targetLng - startLng) * progress;
                const currentLat = startLat + (targetLat - startLat) * progress;

                if (person.instance) {
                    person.instance.setLngLat([currentLng, currentLat]);
                }
            }
        });
    }
    // 120. saniyeden sonra tam varış noktalarında sabit kalıp döngüyü bitirme
    else if (elapsedSeconds > 120) {
        people.forEach(person => {
            if (person.id === "leftNode" || person.id === "rightNode") {
                if (person.instance) person.instance.setLngLat(targetPositions[person.id]);
            }
        });
        return; 
    }

    requestAnimationFrame(animateCohesion);
}

// Harita tamamen hazır olduğunda sistemi tetikle
map.on('load', () => {
    initMarkers();
    requestAnimationFrame(animateCohesion);
});