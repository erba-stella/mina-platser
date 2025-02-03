
// A function to find a specific map tile by name
export const getMapTileObjByName = (array, name) => array.find(rasterMap => rasterMap.name === name);

// Function to create and return a map tile layer
export function getTileLayer(tileName, tilesArray = mapsArray) {
    // Prepare map tiles: collect and compile the tile data
    const tilesObj = getMapTileObjByName(tilesArray, tileName);
    const tilesData = getCompiledTileData(tilesObj);
    // Now we have a tilesData object, structured like this: 
    // { endpoint: <string>, options: <obj>}

    return L.tileLayer(tilesData.endpoint, tilesData.options);
}

// a collection of raster map tiles to use in our map
export const mapsArray = [
    {
        name: 'OpenStreetMap',
        tileName: '',
        APIname: 'OpenStreetMap',
        maxZoom: 20,
        attributionNames: ['OpenStreetMap contributors'],
        desc: 'OpenStreetMap är byggt av en gemenskap av kartografer som bidrar och underhåller data om vägar, stigar, caféer, järnvägsstationer och mycket mer, över hela världen.'
    },
    {
        name: 'Humanitarian',
        tileName: 'hot',
        APIname: 'OpenStreetMap France',
        maxZoom: 19,
        attributionNames: ['OpenStreetMap contributors', 'Humanitarian OpenStreetMap Team', 'OpenStreetMap France'],
        desc: 'This map style is focused on resources useful for humanitarian organizations and citizens in general in emergency situations.'
    },
    {
        name: 'Stadia Outdoors',
        tileName: 'outdoors',
        APIname: 'Stadia Maps',
        maxZoom: 20,
        attributionNames: ['Stadia Maps', 'OpenMapTiles', 'OpenStreetMap'],
        desc: 'Adds useful outdoor features such as ski slopes, and displays natural features such as mountains, parks, and paths.'
    },
    {
        name: 'Stamen Terrain',
        tileName: 'stamen_terrain',
        APIname: 'Stadia Maps',
        maxZoom: 20,
        attributionNames: ['Stadia Maps', 'Stamen Design', 'OpenMapTiles', 'OpenStreetMap'],
        desc: 'Terrängkarta med höjdskuggor och naturligt färgad vegetation.'
    },
    {
        name: 'Stamen Watercolor',
        tileName: 'stamen_watercolor',
        APIname: 'Stadia Maps',
        maxZoom: 16,
        attributionNames: ['Stadia Maps', 'Stamen Design', 'OpenMapTiles', 'OpenStreetMap'],
        desc: 'Reminiscent of hand drawn maps, the watercolor maps from Stamen Design apply raster effect area washes and organic edges over a paper texture to add warm pop to any map.'

    },
    {
        name: 'Alidade Smoth',
        tileName: 'alidade_smooth',
        APIname: 'Stadia Maps',
        maxZoom: 20,
        attributionNames: ['Stadia Maps', 'OpenMapTiles', 'OpenStreetMap'],
        desc: 'Designed for maps that use a lot of markers or overlays, our custom Alidade Smooth style is the ideal canvas for your complex map integration.Featuring a muted color scheme and fewer points of interest,'
    },
    {
        name: 'Thunderforest Outdoors',
        tileName: 'outdoors',
        APIname: 'Thunderforest',
        maxZoom: 20,
        attributionNames: ['Thunderforest', 'OpenStreetMap contributors'],
        desc: 'A map designed for hiking',
    },
    {
        name: 'Landscape',
        tileName: 'landscape',
        APIname: 'Thunderforest',
        maxZoom: 20,
        attributionNames: ['Thunderforest', 'OpenStreetMap contributors'],
        desc: 'En landskapskarta',
    },
    {
        name: 'Testkarta som inte kan laddas',
        tileName: 'my_name_does_not_exist',
        APIname: 'Stadia Maps',
        maxZoom: 20,
        attributionNames: ['Stadia Maps'],
        desc: 'A map that does not exist. Use this to test the error handling'
    }
];

// Sammanställer datan vi behöver för att skapa ett tileLayer (kartbildslager) för vald karta 
export function getCompiledTileData(rasterMap, API_key) {
    const data = {
        'Stadia Maps': {
            API_url: `https://tiles-eu.stadiamaps.com/tiles/${rasterMap.tileName}/{z}/{x}/{y}.jpg`,
            url: 'https://stadiamaps.com/'
        },
        'OpenMapTiles': {
            url: 'https://openmaptiles.org/'
        },
        'OpenStreetMap': {
            API_url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            url: 'https://www.openstreetmap.org/copyright'
        },
        'OpenStreetMap contributors': {
            url: 'https://www.openstreetmap.org/copyright'
        },
        'Humanitarian OpenStreetMap Team': {
            url: 'https://www.hotosm.org/'
        },
        'OpenStreetMap France': {
            API_url: `https://{s}.tile.openstreetmap.fr/${rasterMap.tileName}/{z}/{x}/{y}.png`,
            url: 'https://openstreetmap.fr/'
        },
        'Thunderforest': {
            API_url: `https://tile.thunderforest.com/${rasterMap.tileName}/{z}/{x}/{y}.png?apikey=${API_key}`,
            url: 'https://www.thunderforest.com/'
        },
        'Stamen Design': {
            url: 'https://stamen.com/'
        }
    };

    const endpoint = data[rasterMap.APIname].API_url;
    const maxZoom = rasterMap.maxZoom;
    const attribution = rasterMap.attributionNames.map(name => {
        return `&copy; <a href="${data[name].url}" target="_blank">${name}</a>`;
    }).join(' ');

    return {
        endpoint,
        options: { maxZoom, attribution }
    }      
}