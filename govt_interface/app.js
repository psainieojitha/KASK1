/* =========================================================================
   STATE & DATA MOCKING
   ========================================================================= */

// To represent realistic scenarios, we use a central coordinates array corresponding to a generic city (e.g. San Francisco coordinates for visual reference)
const CITY_CENTER = [37.7749, -122.4194];

// Database structures simulated via JS Objects and Arrays
const DB = {
    hazardReports: [],
    citizenReports: [],
    dashcamReports: [],
    repairTasks: []
};

// Seed Data Configuration
const HAZARD_TYPES = ['Citizen', 'Dashcam'];
const ROAD_NAMES = ['Main St', 'Oak Ave', 'Pine Blvd', 'Maple Dr', 'MG Road', 'Broadway'];
const CREWS = ['Alpha Team', 'Beta Squad', 'Delta Force', 'Rapid Response 1'];

/* =========================================================================
   INITIALIZATION
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initMap();
    initCharts();
    seedInitialData();
    renderDashboard();

    // Event Listeners
    document.getElementById('btn-simulate-report').addEventListener('click', simulateIncomingReport);
});

/* =========================================================================
   UTILS & UI
   ========================================================================= */
function initClock() {
    const clockEl = document.getElementById('clock');
    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
}

function dismissAlert() {
    document.getElementById('alert-modal').classList.add('hidden');
}

function generateId(prefix) {
    return prefix + '-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

// Distance formula (Haversine approximation for short distances)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
}

/* =========================================================================
   MAP (LEAFLET)
   ========================================================================= */
let map;
let markers = [];

function initMap() {
    map = L.map('city-map').setView(CITY_CENTER, 13);
    
    // Dark mode tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}

function getMarkerColor(severity) {
    if (severity >= 80) return '#FF3333'; // Red
    if (severity >= 60) return '#FF9900'; // Orange
    if (severity >= 40) return '#FFF200'; // Yellow
    return '#00FF88'; // Green
}

function renderMapPoints() {
    // Clear existing
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    DB.hazardReports.forEach(hazard => {
        const color = getMarkerColor(hazard.Severity_Score);
        
        const circle = L.circleMarker([hazard.Location_GPS.lat, hazard.Location_GPS.lng], {
            radius: 8 + (hazard.Report_Count), // Size scales slightly with reports
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        }).addTo(map);

        circle.bindPopup(`
            <div style="font-family:'Inter',sans-serif; background:#1E293B; color:#fff; padding:5px; border-radius:4px;">
                <h3 style="font-family:'Orbitron',sans-serif; margin:0 0 5px; color:${color}; font-size:14px;">HASARD: ${hazard.Report_ID}</h3>
                <p style="margin:2px 0; font-size:12px;"><strong>Severity:</strong> ${hazard.Severity_Score}/100</p>
                <p style="margin:2px 0; font-size:12px;"><strong>Reports:</strong> ${hazard.Report_Count}</p>
                <p style="margin:2px 0; font-size:12px;"><strong>Location:</strong> ${hazard.Road_Name}</p>
            </div>
        `);
        markers.push(circle);
    });
}

/* =========================================================================
   CHARTS (CHART.JS)
   ========================================================================= */
function initCharts() {
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Monthly Trend Chart
    const ctx1 = document.getElementById('monthlyTrendChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [{
                label: 'Reported Potholes',
                data: [120, 190, 300, 250, 400, 342],
                borderColor: '#00E1FF',
                backgroundColor: 'rgba(0, 225, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    // Repair Sources (Bar)
    const ctx2 = document.getElementById('repairSourceChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Dashcam AI', 'Citizen App', 'City Patrol'],
            datasets: [{
                label: 'Reports by Source',
                data: [450, 230, 85],
                backgroundColor: ['#00FF88', '#00E1FF', '#FF9900'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

/* =========================================================================
   CORE LOGIC & DATA HANDLING
   ========================================================================= */
function processNewReport(lat, lng, roadName, severity, source) {
    // 1. Check for duplicates within 20 meters
    let existingHazard = null;
    
    for (const h of DB.hazardReports) {
        const dist = getDistance(lat, lng, h.Location_GPS.lat, h.Location_GPS.lng);
        if (dist <= 20) {
            existingHazard = h;
            break;
        }
    }

    if (existingHazard) {
        existingHazard.Report_Count += 1;
        // Increase severity slightly if more reports come in
        existingHazard.Severity_Score = Math.min(100, existingHazard.Severity_Score + 2);
        checkAlertCondition(existingHazard);
        return existingHazard.Report_ID;
    } else {
        // Create new
        const newHazard = {
            Report_ID: generateId('HAZ'),
            Location_GPS: { lat, lng },
            Road_Name: roadName,
            Severity_Score: severity,
            Report_Type: source,
            Report_Count: 1,
            Timestamp: new Date().toISOString(),
            Repair_Status: 'Pending'
        };
        DB.hazardReports.push(newHazard);

        // Auto-create a repair task
        DB.repairTasks.push({
            Repair_ID: generateId('REP'),
            Report_ID: newHazard.Report_ID,
            Assigned_Crew: 'Unassigned',
            Contractor_Name: 'N/A',
            Repair_Start_Date: null,
            Repair_End_Date: null,
            Repair_Cost: Math.floor(Math.random() * 500) + 100,
            Repair_Status: 'Pending'
        });

        checkAlertCondition(newHazard);
        return newHazard.Report_ID;
    }
}

function checkAlertCondition(hazard) {
    // Alert logic: Reports >= 15 OR Severity >= 92
    if (hazard.Report_Count >= 15 || hazard.Severity_Score >= 92) {
        triggerAlert(hazard);
    }
}

function triggerAlert(hazard) {
    const modal = document.getElementById('alert-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('alert-location').textContent = hazard.Road_Name;
    document.getElementById('alert-severity').textContent = hazard.Severity_Score;
    document.getElementById('alert-reports').textContent = hazard.Report_Count;
    document.getElementById('alert-priority-level').textContent = "LEVEL 1";
}

// Simulate one report coming in randomly
function simulateIncomingReport() {
    const lat = CITY_CENTER[0] + (Math.random() - 0.5) * 0.05;
    const lng = CITY_CENTER[1] + (Math.random() - 0.5) * 0.05;
    const road = ROAD_NAMES[Math.floor(Math.random() * ROAD_NAMES.length)];
    const severity = Math.floor(Math.random() * 40) + 60; // 60-100 to trigger alerts occasionally
    const source = HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)];

    processNewReport(lat, lng, road, severity, source);
    renderDashboard();
}

function updateTaskStatus(repairId, newStatus) {
    const task = DB.repairTasks.find(t => t.Repair_ID === repairId);
    if (task) {
        task.Repair_Status = newStatus;
        if(newStatus === 'Assigned' && task.Assigned_Crew === 'Unassigned') {
            task.Assigned_Crew = CREWS[Math.floor(Math.random()*CREWS.length)];
        }
        
        // update main hazard status too
        const hazard = DB.hazardReports.find(h => h.Report_ID === task.Report_ID);
        if(hazard) hazard.Repair_Status = newStatus;
        
        renderTable();
    }
}

function assignCrew(repairId, crewName) {
    const task = DB.repairTasks.find(t => t.Repair_ID === repairId);
    if (task) {
        task.Assigned_Crew = crewName;
        task.Repair_Status = 'Assigned'; // auto update status
        renderTable();
    }
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function renderDashboard() {
    // 1. Update KPIs
    const totalHazards = DB.hazardReports.length;
    const critical = DB.hazardReports.filter(h => h.Severity_Score >= 80).length;
    
    document.getElementById('kpi-total-hazards').textContent = totalHazards;
    document.getElementById('kpi-critical-hazards').textContent = critical;
    
    // 2. Render Map
    renderMapPoints();

    // 3. Render Table
    renderTable();
}

function getBadgeClass(severity) {
    if(severity >= 80) return 'badge-red';
    if(severity >= 60) return 'badge-orange';
    if(severity >= 40) return 'badge-yellow';
    return 'badge-green';
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'Pending': return 'badge-red';
        case 'Assigned': return 'badge-orange';
        case 'Repair in Progress': return 'badge-yellow';
        case 'Completed': return 'badge-green';
        default: return 'badge-green';
    }
}

function renderTable() {
    const tbody = document.querySelector('#repair-table tbody');
    tbody.innerHTML = '';

    // Sort heavily critical matters to top roughly
    const sortedTasks = [...DB.repairTasks].reverse();

    sortedTasks.forEach(task => {
        const hazard = DB.hazardReports.find(h => h.Report_ID === task.Report_ID);
        if (!hazard) return;

        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${task.Report_ID}</strong></td>
            <td>${hazard.Road_Name}</td>
            <td><span class="badge ${getBadgeClass(hazard.Severity_Score)}">${hazard.Severity_Score}</span></td>
            <td>
                <select class="dropdown crew-select" data-id="${task.Repair_ID}">
                    <option value="Unassigned" ${task.Assigned_Crew === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
                    ${CREWS.map(c => `<option value="${c}" ${task.Assigned_Crew === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </td>
            <td>$${task.Repair_Cost}</td>
            <td>
                <select class="dropdown status-select badge ${getStatusBadgeClass(task.Repair_Status)}" data-id="${task.Repair_ID}">
                    <option value="Pending" ${task.Repair_Status === 'Pending' ? 'selected' : ''} class="badge-red">Pending</option>
                    <option value="Assigned" ${task.Repair_Status === 'Assigned' ? 'selected' : ''} class="badge-orange">Assigned</option>
                    <option value="Repair in Progress" ${task.Repair_Status === 'Repair in Progress' ? 'selected' : ''} class="badge-yellow">In Progress</option>
                    <option value="Completed" ${task.Repair_Status === 'Completed' ? 'selected' : ''} class="badge-green">Completed</option>
                </select>
            </td>
            <td>
                <button class="btn btn-outline btn-sm"><i class="ri-eye-line"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach listeners strictly for select changes
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            updateTaskStatus(e.target.dataset.id, e.target.value);
        });
    });

    document.querySelectorAll('.crew-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            assignCrew(e.target.dataset.id, e.target.value);
        });
    });
}

// Initial dummy data
function seedInitialData() {
    for(let i=0; i<15; i++) {
        const lat = CITY_CENTER[0] + (Math.random() - 0.5) * 0.05;
        const lng = CITY_CENTER[1] + (Math.random() - 0.5) * 0.05;
        const road = ROAD_NAMES[Math.floor(Math.random() * ROAD_NAMES.length)];
        const severity = Math.floor(Math.random() * 90) + 10;
        const source = HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)];
        
        // Use true back-end flow to seed to reuse duplicate logic
        processNewReport(lat, lng, road, severity, source);
    }
}
