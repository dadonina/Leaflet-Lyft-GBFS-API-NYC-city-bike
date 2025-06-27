// Mapa base
const map = L.map('map', { zoomControl: true }).setView([40.730610, -73.935242], 12);

// Tilesets
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and others',
        maxZoom: 19
    }
);

osm.addTo(map);

const baseLayers = {
    "Open Street Maps": osm,
    "Esri Salellite": esriSat
};

L.control.layers(baseLayers).addTo(map);

// URLs APIs Lyft/Citi Bike NYC
const STATION_INFO_URL = 'https://gbfs.lyft.com/gbfs/1.1/bkn/es/station_information.json';
const STATION_STATUS_URL = 'https://gbfs.lyft.com/gbfs/1.1/bkn/es/station_status.json';

// Global cache para estados (status) con timestamp
let stationStatusCache = {
    timestamp: 0,
    data: {}
};

// Contenedor markers
let markers = [];

// Loader UI
const loadingEl = document.getElementById('loading');
/**
 * Muestra u oculta el elemento de loading
 * @param {boolean} show Indica si se debe mostrar (true) o ocultar (false)
 */
function showLoading(show) {
    loadingEl.style.display = show ? 'block' : 'none';
}

// Función para cargar info de estaciones (solo info)
async function fetchStationInformation() {
    showLoading(true);
    try {
        const res = await fetch(STATION_INFO_URL);
        const json = await res.json();
        return json.data.stations;
    } catch (e) {
        alert('Error while fetching station information');
        console.error(e);
        return [];
    } finally {
        showLoading(false);
    }
}

// Función para cargar estado estaciones (status)
async function fetchStationStatus() {
    try {
        const res = await fetch(STATION_STATUS_URL);
        const json = await res.json();
        const stationsStatus = {};
        json.data.stations.forEach(station => {
            stationsStatus[station.station_id] = station;
        });
        stationStatusCache = {
            timestamp: Date.now(),
            data: stationsStatus
        };
        return stationsStatus;
    } catch (e) {
        console.error('Error al cargar status:', e);
        return stationStatusCache.data || {};
    }
}

// Añadir markers a mapa
function addMarkers(stations) {
    // Limpiar anteriores
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    stations.forEach(station => {
        const marker = L.circleMarker([station.lat, station.lon], {
            radius: 7,
            fillColor: '#1db954',
            color: '#0a7c2e',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.8,
            className: 'station-marker'
        });

        marker.addTo(map);
        markers.push(marker);

        // Listener click para cargar status y mostrar popup
        marker.on('click', async () => {
            // Mostrar popup provisional
            marker.bindPopup(`<div style="font-weight:700; color:#1db954; font-size:1.1em;">${station.name}</div>
                            <div>Loading status...</div>`).openPopup();

            // Comprobar caché
            const now = Date.now();
            let statusData;
            if (now - stationStatusCache.timestamp < 60000 && stationStatusCache.data[station.station_id]) {
                statusData = stationStatusCache.data;
            } else {
                showLoading(true);
                statusData = await fetchStationStatus();
                showLoading(false);
            }

            const stStatus = statusData[station.station_id];

            // Info popup
            let popupHtml = `<div class="station-name">${station.name}</div>
                            <div class="stat"><span>Total capacity:</span><span class="value">${station.capacity}</span></div>`;

            if (stStatus) {
                popupHtml += `<div class="stat"><span>Bikes available:</span><span class="value">${stStatus.num_bikes_available}</span></div>
                            <div class="stat"><span>E-bikes available:</span><span class="value">${stStatus.num_ebikes_available}</span></div>`;
            } else {
                popupHtml += `<div style="color:#f44336; font-weight:700;">No status data available.</div>`;
            }


            marker.setPopupContent(popupHtml).openPopup();
        });
    });
}

// Init
async function init() {
    const stations = await fetchStationInformation();
    addMarkers(stations);
}

init();
