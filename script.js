// ============================
// CALIBRATED MAP CONFIGURATION (ZOOM: 13.9 & CENTER REALIGNED)
// ============================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [9.2103, 45.4815], 
    zoom: 13.9,                
    minZoom: 13.9,             
    maxZoom: 13.9,             
    
    // EXPERIMENTAL CONTROLS: FIXED VIEWPORT MATRIX
    dragPan: false,            
    doubleClickZoom: false,    
    boxZoom: false,            
    keyboard: false,           
    touchZoomRotate: false,    
    
    pixelRatio: window.devicePixelRatio || 2 
});

// ============================
// ORIGINAL KML GEOMETRY VERTICES (triangle corners of the scene)
// ============================
const positions = {
    leftNode:  [9.203801, 45.483950], // G Actor - Left Top Corner
    rightNode: [9.216763, 45.486383], // M Actor - Right Top Corner
    mainNode:  [9.217046, 45.476790]  // Main Actor - Bottom Corner
};

// ============================
// EXPERIMENT SUBJECTS CONFIGURATION
// ============================
const people = [
    { id: "leftNode", markerType: "grey-letter-dot", initial: "G" },
    { id: "rightNode", markerType: "grey-letter-dot", initial: "M" },
    { id: "mainNode", markerType: "blue-pulse-dot" }
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

const markerInstances = {};

function initMarkers() {
    people.forEach(person => {
        const marker = new maplibregl.Marker({
            element: createMarkerElement(person),
            anchor: "center"
        })
        .setLngLat(positions[person.id])
        .addTo(map);

        markerInstances[person.id] = marker;
    });
}

// Initialize components immediately on execution matrix
initMarkers();

// ============================
// TIMED LINEAR INTERPOLATION ENGINE WITH VECTOR SEPARATION
// ============================
const DELAY_DURATION = 5 * 1000;       // 5 seconds stable
const CONVERGE_DURATION = 10 * 1000;   // 10 seconds convergence window
const ESCAPE_DURATION = 15 * 1000;     // 15 seconds northward translation window
const TOTAL_DURATION = DELAY_DURATION + CONVERGE_DURATION + ESCAPE_DURATION; 

const startG = positions.leftNode;
const startM = positions.rightNode;

// Top corners' midpoint (Meeting axis)
const midLng = (startG[0] + startM[0]) / 2;
const midLat = (startG[1] + startM[1]) / 2; 

// Buffer to prevent overlapping when two actors come side by side
const offsetPercent = 0.04; 
const deltaLng = startM[0] - startG[0];
const deltaLat = startM[1] - startG[1];

const midTargetG = [midLng - (deltaLng * offsetPercent), midLat - (deltaLat * offsetPercent)];
const midTargetM = [midLng + (deltaLng * offsetPercent), midLat + (deltaLat * offsetPercent)];

// Controlled northern translation offset (Prevents flying off-screen within 15s)
const escapeDeltaLng = 0.000000;
const escapeDeltaLat = 0.004500; 

const finalTargetG = [midTargetG[0] + escapeDeltaLng, midTargetG[1] + escapeDeltaLat];
const finalTargetM = [midTargetM[0] + escapeDeltaLng, midTargetM[1] + escapeDeltaLat];

// Realism Noise Multipliers (To mimic actual street grid alignment instead of straight vectors)
const DEVIATION_AMPLITUDE = 0.0008; 
const DEVIATION_FREQUENCY = 2.5;    

let startTime = null;

function animateNodes(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // PHASE 1: Baseline stabilization timeline (0s - 5s)
    if (elapsed < DELAY_DURATION) {
        if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat(positions.leftNode);
        if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat(positions.rightNode);
    }
    // PHASE 2: Trajectory convergence to midpoint (5s - 15s -> 10 seconds duration)
    else if (elapsed >= DELAY_DURATION && elapsed < (DELAY_DURATION + CONVERGE_DURATION)) {
        const progress = (elapsed - DELAY_DURATION) / CONVERGE_DURATION;

        const currentG_Lng = startG[0] + (midTargetG[0] - startG[0]) * progress;
        const currentG_Lat = startG[1] + (midTargetG[1] - startG[1]) * progress;

        const currentM_Lng = startM[0] + (midTargetM[0] - startM[0]) * progress;
        const currentM_Lat = startM[1] + (midTargetM[1] - startM[1]) * progress;

        if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat([currentG_Lng, currentG_Lat]);
        if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat([currentM_Lng, currentM_Lat]);
    }
    // PHASE 3: Cohesive exclusion trajectory northward with street alignment behavior (15s - 30s -> 15 seconds)
    else if (elapsed >= (DELAY_DURATION + CONVERGE_DURATION) && elapsed <= TOTAL_DURATION) {
        const progress = (elapsed - DELAY_DURATION - CONVERGE_DURATION) / ESCAPE_DURATION;

        let currentG_Lng = midTargetG[0] + (finalTargetG[0] - midTargetG[0]) * progress;
        const currentG_Lat = midTargetG[1] + (finalTargetG[1] - midTargetG[1]) * progress;

        let currentM_Lng = midTargetM[0] + (finalTargetM[0] - midTargetM[0]) * progress;
        const currentM_Lat = midTargetM[1] + (finalTargetM[1] - midTargetM[1]) * progress;

        // Introduces localized sine lateral displacement to simulate navigating road turnoffs
        const deviationNoise = Math.sin(progress * Math.PI * 2 * DEVIATION_FREQUENCY) * DEVIATION_AMPLITUDE;
        currentG_Lng += deviationNoise;
        currentM_Lng += deviationNoise;

        if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat([currentG_Lng, currentG_Lat]);
        if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat([currentM_Lng, currentM_Lat]);
    }
    // PHASE 4: Post-termination freeze matrix (Post 30s)
    else if (elapsed > TOTAL_DURATION) {
        if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat(finalTargetG);
        if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat(finalTargetM);
        return;
    }

    if (elapsed < TOTAL_DURATION) {
        requestAnimationFrame(animateNodes);
    }
}
map.on('load', () => {
    const mapCanvas = map.getCanvas();
    if (mapCanvas) {
        mapCanvas.style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95) hue-rotate(25deg)';
    }
    requestAnimationFrame(animateNodes);

});