// ============================
// CALIBRATED MAP CONFIGURATION (ZOOM: 13.9)
// ============================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [9.2123, 45.4824], 
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
// EXACT EXTRACTED KML COORDINATE NODES (START POSITIONS)
// ============================
const startPositions = {
    leftNode:  [9.203801, 45.483950], // Agent "G"
    rightNode: [9.216763, 45.486383], // Agent "M"
    mainNode:  [9.217046, 45.476790]  // Main Subject (Blue Pulse - STABLE) 
};

// ============================
// CALIBRATED TWO-STAGE INTERPOLATION VECTOR
// ============================
const startG = startPositions.leftNode;
const startM = startPositions.rightNode;

// Stage 1 Target: Midpoint convergence
const midLng = (startG[0] + startM[0]) / 2;
const midLat = (startG[1] + startM[1]) / 2;

const offsetPercent = 0.04; 
const deltaLng = startM[0] - startG[0];
const deltaLat = startM[1] - startG[1];

const midTargetG = [midLng - (deltaLng * offsetPercent), midLat - (deltaLat * offsetPercent)];
const midTargetM = [midLng + (deltaLng * offsetPercent), midLat + (deltaLat * offsetPercent)];

// Stage 2 Target: Joint displacement strictly NORTH (Calibrated distance for slower speed)
const escapeDeltaLng = 0.000000; 
const escapeDeltaLat = 0.004500; // Reduced from 0.012000 to drastically slow down the speed

const finalTargetG = [midTargetG[0] + escapeDeltaLng, midTargetG[1] + escapeDeltaLat];
const finalTargetM = [midTargetM[0] + escapeDeltaLng, midTargetM[1] + escapeDeltaLat];

// ============================
// EXPERIMENT SUBJECTS CONFIGURATION
// ============================
const people = [
    { id: "leftNode", markerType: "grey-letter-dot", initial: "G", instance: null },
    { id: "rightNode", markerType: "grey-letter-dot", initial: "M", instance: null },
    { id: "mainNode", markerType: "blue-pulse-dot", instance: null }
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
// TWO-STAGE INTERPOLATION TIMELINE ENGINE
// ============================
let startTime = null;
const DELAY_DURATION = 5;      // 5 seconds baseline delay
const PHASE_DIVIDER = 20;      // 5s baseline + 15s convergence = 20 seconds point
const TOTAL_DURATION = 30;     // 20s point + 10s joint escape = 30 seconds total absolute completion

function animateCohesion(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsedSeconds = (timestamp - startTime) / 1000;

    // PHASE 1: Baseline stabilization timeline (0s - 5s)
    if (elapsedSeconds < DELAY_DURATION) {
        people.forEach(person => {
            if (person.instance) person.instance.setLngLat(startPositions[person.id]);
        });
    }
    // PHASE 2: Trajectory convergence to midpoint (5s - 20s -> 15 seconds duration)
    else if (elapsedSeconds >= DELAY_DURATION && elapsedSeconds < PHASE_DIVIDER) {
        const progress = (elapsedSeconds - DELAY_DURATION) / (PHASE_DIVIDER - DELAY_DURATION);

        const currentG_Lng = startG[0] + (midTargetG[0] - startG[0]) * progress;
        const currentG_Lat = startG[1] + (midTargetG[1] - startG[1]) * progress;
        if (people[0].instance) people[0].instance.setLngLat([currentG_Lng, currentG_Lat]);

        const currentM_Lng = startM[0] + (midTargetM[0] - startM[0]) * progress;
        const currentM_Lat = startM[1] + (midTargetM[1] - startM[1]) * progress;
        if (people[1].instance) people[1].instance.setLngLat([currentM_Lng, currentM_Lat]);

        if (people[2].instance) people[2].instance.setLngLat(startPositions.mainNode);
    }
    // PHASE 3: Cohesive exclusion trajectory straight UPWARD (20s - 30s -> 10 seconds duration)
    else if (elapsedSeconds >= PHASE_DIVIDER && elapsedSeconds <= TOTAL_DURATION) {
        const progress = (elapsedSeconds - PHASE_DIVIDER) / (TOTAL_DURATION - PHASE_DIVIDER);

        const currentG_Lng = midTargetG[0] + (finalTargetG[0] - midTargetG[0]) * progress;
        const currentG_Lat = midTargetG[1] + (finalTargetG[1] - midTargetG[1]) * progress;
        if (people[0].instance) people[0].instance.setLngLat([currentG_Lng, currentG_Lat]);

        const currentM_Lng = midTargetM[0] + (finalTargetM[0] - midTargetM[0]) * progress;
        const currentM_Lat = midTargetM[1] + (finalTargetM[1] - midTargetM[1]) * progress;
        if (people[1].instance) people[1].instance.setLngLat([currentM_Lng, currentM_Lat]);

        if (people[2].instance) people[2].instance.setLngLat(startPositions.mainNode);
    }
    // PHASE 4: Post-termination freeze matrix (Post 30s)
    else if (elapsedSeconds > TOTAL_DURATION) {
        if (people[0].instance) people[0].instance.setLngLat(finalTargetG);
        if (people[1].instance) people[1].instance.setLngLat(finalTargetM);
        if (people[2].instance) people[2].instance.setLngLat(startPositions.mainNode);
        return; 
    }

    requestAnimationFrame(animateCohesion);
}

// SAFE UNIFIED EVENT INTERACTION
map.on('style.load', () => {
    const mapCanvas = map.getCanvas();
    if (mapCanvas) {
        mapCanvas.style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95)';
    }
    initMarkers();
    requestAnimationFrame(animateCohesion);
});