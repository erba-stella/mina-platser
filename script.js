/*
    Static imports
*/
// raster map tiles and a functions to find and compile them.
import { mapsArray, getTileLayer } from "./modules/maptiles.js";

/*
    local storage functions / utility functions
*/
const getFromStorage = key => (localStorage.getItem(key)) ? JSON.parse(localStorage.getItem(key)) : false;
const saveToStorage = (key, item) => localStorage.setItem(key, JSON.stringify(item));
// get date in json compatible format (ISO) to save in local storage
const newDateToISO = () => new Date().toISOString();
// Function that takes an ISO date string andformat ISO date string
const getYear = (ISOdate) => new Date(ISOdate).getFullYear();
const getDate = (ISOdate) => `${new Date(ISOdate).getDate()}/${new Date(ISOdate).getMonth()}`;

// Select elements by id
const selectID = (selector, parent = document) => parent.getElementById(selector);
// Returns an object with form data on submit
const collectFormData = formElem => Object.fromEntries(new FormData(formElem));

/*
    DOM References
*/
const mapElemID = 'map';
const errorElem = selectID('error-message');

// Menu, and menu controls
const menuToggleElem = selectID('menu-toggle');
const menuElem = selectID('menu');
const watchPositionControlID = 'watch-my-position';
const savePositionControlID = 'save-my-position';
const openMapSettingsID = 'open-map-settings';

// Map sidebar
const mapSidebarElem = selectID('map-sidebar');
// Map options (chose map type)
const mapOptionsElem = selectID('map-options-container');
// Read and edit place data
const placeFormElem = selectID('edit-place-form');
const placeInfoElem = selectID('place-info');
const placeNameElem = selectID('place-name');
const deleteButton = selectID('delete');

/*
    Map settings 
*/ 
const mapOptions = {
    zoom: 13,
    minZoom: 2,
    zoomControl: false,
    // preferCanvas: true
};
// Initial view
let viewCenter = getFromStorage('map_viewCenter') || [59.120403, 17.649355];
let currentZoom = getFromStorage('map_currentZoom') || 5;

// Chosen map tiles and fallback tiles
let tileName = getFromStorage('mapType') || 'Stamen Terrain';
let tileName_fallback = 'OpenStreetMap';

// To log current activity
const activeState = {
    watchPosition: false,
    watchCircle: false,
    placeElemSelected: false
};

/*  ==================================================
    MAP: 
    This is the container for all map content
    (with a view and optional controls)

    on page load:
    -   Configure the map and set the initial map view
    -   (get saved settings from local storage if there is any)
    -   Render to UI and don't let the users scroll away from the world

*/

// Render map to UI
const map = L.map(mapElemID, mapOptions).setView(viewCenter, currentZoom);

// Prevent users from scrolling away from the world
map.setMaxBounds([[-90, -180], [90, 180]]);


/*  *******************************************
    MAP TILES: 
    This is the map-images, the visual representation of the map.
    We are using raster XYZ-tiles (jpg images positioned side by side on the x and y-axes, and layered in diferent zoom levels on the z-axis).

    On page load:
    -   Find and prepaire the default map tiles (imported from maptiles.js)
    -   Put them in a tile layer and render to the map UI
    -   Add error handling for the tile layer (using built in functionality from the Leaflet library)
        More info on error handling for tile layers: https://gis.stackexchange.com/questions/347646/specify-an-alternative-url-for-a-tilelayer-to-use-in-leaflet
     
*/


let tileLayer = getTileLayer(tileName);
tileLayer.addTo(map);
tileLayer.on('tileerror', tileError);

// If the chosen map tiles cant be loaded, load fallback tiles and send error message.
function tileError(error) {
    console.log(error)
    errorElem.innerHTML = `<p>Kartan ${tileName} kunde inte laddas. Istället visas ${tileName_fallback}</p>`;
    map.removeLayer(tileLayer);
    tileLayer = getTileLayer(tileName_fallback);
    tileLayer.addTo(map);
    tileName = tileName_fallback;
    // Save current map type to local storage
    saveToStorage('mapType', tileName);
    // Remove error message again
    setTimeout(() => {
        errorElem.textContent = '';
    }, 4000);
}

/*  *******************************************
    MAP TILES - Render map Type Options
    - Let the user chose between map tiles and save recent choice to local storage
*/

// Function to generate a list of tiles with name and description
function getTileList(mapsArray = mapsArray) {
    return mapsArray.map(mapTileObj => {
        return { name: mapTileObj.name, desc: mapTileObj.desc };
    });   
}


// Function to render a map options form to the UI
function renderMapTypeOptions(tileList, parentElem) {
    // DOM reference when listening for changes of map types
    const changeMapTypeID = 'change-map-type';

    // first, create HTML for all map type options
    let mapTypesHTML = '';
    tileList.forEach(mapType => {
        mapTypesHTML += `
<h3><label><input type='radio' name='mapName' value='${mapType.name}'> ${mapType.name} </label></h3>
<details>
    <summary>Läs mer</summary>
    <p>${mapType.desc}</p>
</details>`;
    });

    // then, compile all the form content
    let formContent = `
<fieldset id="${changeMapTypeID}">
    <legend><h2>Välj kart-typ:</h2></legend>
    ${mapTypesHTML}
</fieldset>`;

    // create the form, add content, and render to the UI
    const form = document.createElement('form');
    form.innerHTML = formContent;
    parentElem.append(form);

    // Listen for map type changes and change tiles
    selectID(changeMapTypeID).addEventListener('change', function (event) {
        console.log('ev target', event.target.value);
        // save the currently used map tiles as fallback, before changing to new map tiles
        tileName_fallback = tileName;
        // Get the new tile name
        tileName = event.target.value;
        // Remove the old tile layer and add the new
        map.removeLayer(tileLayer);
        tileLayer = getTileLayer(tileName);
        tileLayer.addTo(map);
        // Add error handling
        tileLayer.on('tileerror', tileError);
        // Save choice to local storage
        saveToStorage('mapType', tileName);
    });
}

renderMapTypeOptions(getTileList(mapsArray), mapOptionsElem);


/*  *******************************************
    Places:
    This is data attached to coordinates on the map that is saved/created by the user
    (markers, user created content about the place, collected geodata, cration date, and so on...)

    On page load:
    -   Get prevously saved places from local storage (place objects in an array)
    -   Render to UI (if there is any saved places)
*/

const places = getFromStorage('Mina Platser') || [];
renderPlacesToMapUI(places);


/* *******************************************
    Toggle watch position (using the Geolocation API)
    Render a position circle to the map
*/

function ToggleWatchPosition(watch, watchID = activeState.watchPosition) {
    const a = activeState;
    let circle = a.watchCircle;
    if (circle) a.watchCircle.removeFrom(map);

    if (watch === true) {
        a.watchPosition = navigator.geolocation.watchPosition(success, positionError);
    }
    if (watch === false) {
        navigator.geolocation.clearWatch(watchID);
    }

    function success(position) {
        // Clear previous error messages
        errorElem.textContent = '';
        // collect position data
        const latlng = getPositionLatlng(position);
        const radius = getPositionRadius(position);

        // Move map view to the new position
        map.setView(latlng, 15);

        // Add "watch circle" to map IU
        if (circle) {
            circle.setRadius(radius).setLatLng(latlng).addTo(map);
        } else {
            a.watchCircle = L.circle(latlng, {
                radius: radius,
                className: 'pulse',
            }).addTo(map);
        };
    }
}



// Listen for clicks on the items in the menu list
menuElem.addEventListener("click", event => {
    const target = event.target;
    mapSidebarElem.classList.remove('place_active');
    mapSidebarElem.classList.remove('mapp-settings_active');

    // If user clicked the "watch position" checkbox button:
    if (target.id === watchPositionControlID) {
        // Toggle "geolocation watch position" on/of with boleean argument
        ToggleWatchPosition(target.checked);
    }
    // If user clicked the "save my place" button:
    if (event.target.id === savePositionControlID) {
        // Get current geolocation position and create a new placeobject
        createNewPlaceFromCurrentPosition();
        menuToggleElem.checked = false;
    }
    // If user clicked to open map settings 
    if (event.target.id === openMapSettingsID) {
        // Get current geolocation position and create a new placeobject
        mapSidebarElem.classList.add('mapp-settings_active');
        menuToggleElem.checked = false;
    }
});

// Listen for click on the map
map.on('click', event => {
    mapSidebarElem.classList.remove('mapp-settings_active');
});


// Listen for zoom change
map.on('zoomend', function (e) {
    currentZoom = map.getZoom();
    console.log('Current zoom level:', map.getZoom());
    saveToStorage('map_currentZoom', currentZoom);
});



/* *******************************************
    PLACES FUNCTIONS:
    - Render place features (icons/circles/markers) to Map UI
*/

// Render place features to the UI (from array of saved places)
function renderPlacesToMapUI(placesArr) {
    if (placesArr.lengt < 1) return;
    placesArr.forEach(place => {
        renderPlaceToMapUI(place);
        console.log(place.latlng)
    });
}

// Render place features for one place to the UI
function renderPlaceToMapUI(place) {
    // Create marker and circle
    const marker = L.marker(place.latlng)
        .bindPopup(`<h2>${place.name}</h2>`);
    const circle = L.circle(place.latlng, {
        radius: place.radius,
        color: 'rgba(86, 209, 205, 0.67)',
        fillColor: 'gray',
        className: 'radius-circle'
    });
    // Put them in a feature group and render to map UI
    const placeFeatures = L.featureGroup([marker, circle])
        .addTo(map);
    marker.openPopup();
    
    // Add click event listener to the place feature group
    placeFeatures.on('click', function (e) {
        // bring the selected feature group to front and save a reference to it so we can find it later
        this.bringToFront();
        // Open the selected place on the map for reading / editing
        placeSelected(e, placeFeatures);
    });
}

/* *******************************************
    PLACES FUNCTIONS:
    - Find a place object in the places array by its coordinates
*/

// Extract coordinates from a Feature Group even and get the place object with the same coordinates
function getPlaceFromFeatureGroupCoordinates(e, arr = places) {
    const latlng = Object.values(Object.values(e.target._layers)[0]._latlng);
    return getPlaceFromCoordinates(latlng, arr);
}
// find and get place from coordinates
function getPlaceFromCoordinates(latlng, arr = places) {
    return arr.find(obj => obj.latlng[0] === latlng[0] && obj.latlng[1] === latlng[1]) || false;
}

/* *******************************************
    PLACES FUNCTIONS:
    - Get the current position and create a new place there
*/

function createNewPlaceFromCurrentPosition() {
    navigator.geolocation.getCurrentPosition((position) => {
        // Clear previous error messages
        errorElem.textContent = '';
        // Get position data: coordinates and precision radius
        const latlng = getPositionLatlng(position);
        const radius = getPositionRadius(position);        

        // Center map view on the new position
        map.setView(latlng, 16);

        // Check if we already have a place with the same coordinates 
        const place = getPlaceFromCoordinates(latlng);
        if (place) {
            errorElem.innerHTML = `<p>Platsen finns redan.</p>`;
            setTimeout(() => {
                errorElem.textContent = '';
            }, 4000);
            return;
        }
        // If not, create a new place:

        // Render a circle on the map, displaying the position radius for the place
        const circleRadius = L.circle(latlng, { radius: radius }).addTo(map);

        // Open the place form in the sidebar
        mapSidebarElem.classList.add('place_active');

        // Add place info:
        let placeInfo = `Din plats har en radie på ${radius} meter. Du är någonstans i den här cirkeln`;
        if (radius > 10) placeInfo = `Din plats blev ganska stor med en radie på ${radius} meter.  Vi fick inte så exakt platsinformation.`
        placeInfoElem.textContent = placeInfo;

        // Listen for form submit or delete once
        placeFormElem.addEventListener('submit', event => {
            event.preventDefault();

            // Create and save a new place object
            const formData = collectFormData(event.target);

            console.log('formData', formData)
            const newPlace = {
                // name: formData.placeName,
                name: placeNameElem.value,
                latlng,
                radius,
                timestamp: newDateToISO()
            };
            places.push(newPlace);
            saveToStorage('Mina Platser', places);

            // add place features (circle and marker)
            renderPlaceToMapUI(newPlace);

            // Remove form inputs and close the place editor
            circleRadius.remove();
            event.target.reset();
            mapSidebarElem.classList.remove('place_active');

        }, { once: true });

        deleteButton.addEventListener('click', event => { 
            event.preventDefault();

            console.log('remove')
            // Remove form inputs and close the place editor
            circleRadius.remove();
            placeFormElem.reset();
            mapSidebarElem.classList.remove('place_active');
        }, { once: true });
        
    }, positionError);
};


/* *******************************************
    PLACES FUNCTIONS:
    - Open place form in the sidebar
*/

// When a place is selected on the map
function placeSelected(e, placeOnMap, arr = places) {
    // Get the place object with the same coordinates as the place features on the map
    const thisPlace = getPlaceFromFeatureGroupCoordinates(e, arr);

    // Open the place form 
    mapSidebarElem.classList.add('place_active');
    // and fill it with the place data
    placeNameElem.value = thisPlace.name;
    placeInfoElem.innerHTML =
    `<p>Datum: ${getDate(thisPlace.timestamp)} ${getYear(thisPlace.timestamp)}</p>
    <p>Platsens radie: ${thisPlace.radius} meter</p>`;
   
    // Listen for form submit or delete once
    placeFormElem.addEventListener('submit', event => {
        event.preventDefault();

        // Add changes to the place object
        const formData = collectFormData(event.target);
        thisPlace.name = formData.placeName;
        saveToStorage('Mina Platser', places);

        // Update place features (circle and marker)
        placeOnMap.remove();
        renderPlaceToMapUI(thisPlace);

        // Remove form inputs and close the place editor
        event.target.reset();
        mapSidebarElem.classList.remove('place_active');

    }, { once: true });

    deleteButton.addEventListener('click', event => {
        event.preventDefault();
        // Delete the place, remove form inputs and close the place editor
        placeOnMap.remove();
        const index = places.findIndex(place => {
            return place.latlng[0] === thisPlace.latlng[0] && place.latlng[1] === thisPlace.latlng[1];
        }); 
        if (index !== -1) places.splice(index, 1); 
        saveToStorage('Mina Platser', places);
        placeFormElem.reset();
        mapSidebarElem.classList.remove('place_active');

        console.log(places)
    }, { once: true });
}

/* *******************************************
    Geolocation:
*/
if (!"geolocation" in navigator) {
    errorElem.textContent = 'Din webbläsare stöder inte geolocation. Därför kan du inte använda de kartfunktioner där webbläsaren behöver kunna se din plats.';
}
/*
    Geolocation: Return position data functions
*/
function getPositionLatlng(position) {
    const c = position.coords;
    return [c.latitude, c.longitude];
}
function getPositionRadius(position) {
    return Math.ceil(position.coords.accuracy);
}


function positionError(error) {
    console.warn(`ERROR(${error.code}): ${error.message}`);
    errorElem.innerHTML = '<p>Det gick inte att hitta din plats just nu</p>';
}