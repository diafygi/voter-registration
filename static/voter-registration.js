//Globals
var countyGeo;
var countyLayers = {active: {}, cached: {}};

//Calculate a polygon box that surrounds an arbitrayrpolygon
//  -Input is a GeoJSON feature (Polygon or MultiPolygon)
//  -Returns the feature with boundaryBoxes added to the feature's properties
//  -Adapted from https://github.com/Turfjs/turf-extent
function addBoxes(feature){

    //add boundaryBoxes to the feature's properties
    var polys = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];

    //default boundaryBox is inverse infinity box
    var bbox = [
        [ 179.999999, -89.999999], //northwest corner
        [-179.999999, -89.999999], //northeast corner
        [-179.999999,  89.999999], //southeast corner
        [ 179.999999,  89.999999], //southwest corner
    ];

    //find the boundary coordinates for all of the polygons
    for(var p = 0; p < polys.length; p++){
        for(var i = 0; i < polys[p][0].length; i++){

            //longitude west edge
            if ((bbox[0][0]+180.0)%360.0 > (polys[p][0][i][0]+180.0)%360.0)
                bbox[0][0] = bbox[3][0] = polys[p][0][i][0];

            //longitude east edge
            if ((bbox[1][0]+180.0)%360.0 < (polys[p][0][i][0]+180.0)%360.0)
                bbox[1][0] = bbox[2][0] = polys[p][0][i][0];

            //latitude north edge
            if ((bbox[0][1]+90.0)%180.0 < (polys[p][0][i][1]+90.0)%180.0)
                bbox[0][1] = bbox[1][1] = polys[p][0][i][1];

            //latitude south edge
            if ((bbox[2][1]+90.0)%180.0 > (polys[p][0][i][1]+90.0)%180.0)
                bbox[2][1] = bbox[3][1] = polys[p][0][i][1];
        }
    }

    feature.properties['boundaryBoxes'] = bbox;

    return feature;
};

//See if a point is within a feature
//  -Input is a GeoJSON feature (Polygon or MultiPolygon)
//  -Returns true or false
//  -Adapted from https://github.com/Turfjs/turf-inside
function isInside(xy, feature){
    var polys = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];
    var insidePoly = false;

    // check if in overall boundaryBox
    if(inRing(xy, feature.properties.boundaryBoxes)){

        var i = 0;
        while (i < polys.length && !insidePoly){

            // check if it is in the outer ring
            if(inRing(xy, polys[i][0])){
                var inHole = false;
                var k = 1;

                // check for the point in any of the holes
                while(k < polys[i].length && !inHole){
                    if(inRing(xy, polys[i][k]))
                        inHole = true;
                    k++;
                }
                if(!inHole)
                    insidePoly = true;
            }
            i++;
        }
    }
    return insidePoly;
}

// Adapted from https://github.com/Turfjs/turf-inside
// pt is [x,y] and ring is [[x,y], [x,y],..]
function inRing(xy, ring){
    var isInside = false;
    for(var i = 0, j = ring.length - 1; i < ring.length; j = i++){
        var xi = ring[i][0], yi = ring[i][1];
        var xj = ring[j][0], yj = ring[j][1];
        var intersect = ((yi > xy[1]) !== (yj > xy[1])) && (xy[0] < (xj - xi) * (xy[1] - yi) / (yj - yi) + xi);
        if(intersect)
            isInside = !isInside;
    }
    return isInside;
}

//Find the feature that contains the point
function searchFeatures(xy, features){
    for(var i = 0; i < features.length; i++)
        if(isInside(xy, features[i]))
            return i;
    return null;
}

//Pin behavior
function updatePin(e){

    //udpate the pin
    var latlng = e.latlng !== undefined ? e.latlng : e.target.getLatLng();
    pin.setLatLng(latlng);

    //update the county
    var countyIndex = searchFeatures([latlng.lng, latlng.lat], countyGeo);
    if(countyIndex !== null){

        //add the county layer if not already active
        if(countyLayers.active[countyIndex] === undefined){

            //remove all the active layers
            for(var l in countyLayers.active){
                map.removeLayer(countyLayers.active[l]);
                countyLayers.cached[l] = countyLayers.active[l];
                delete countyLayers.active[l];
            }

            //add the county layer from cache
            if(countyLayers.cached[countyIndex] !== undefined){
                countyLayers.active[countyIndex] = countyLayers.cached[countyIndex];
                delete countyLayers.cached[countyIndex];
                map.addLayer(countyLayers.active[countyIndex]);
            }

            //not in cache, so load it from the geojson
            else{
                countyLayers.active[countyIndex] = L.GeoJSON.geometryToLayer(countyGeo[countyIndex]);
                countyLayers.active[countyIndex].setStyle({
                    color: "#47ACE3",
                    opacity: 0.8,
                    fill: false,
                });
                countyLayers.active[countyIndex].on("click", updatePin);
                map.addLayer(countyLayers.active[countyIndex]);
            }
        }
    }

    //no matching counties, so clear the map
    else{
        for(var l in countyLayers.active){
            map.removeLayer(countyLayers.active[l]);
            countyLayers.cached[l] = countyLayers.active[l];
            delete countyLayers.active[l];
        }
    }

    return countyIndex;
}

//update the popup contents
function updatePopup(countyIndex, show){
    var popup = pin.getPopup();
    if(popup === undefined){
        popup = new L.popup();
    }
    var content = document.createElement("p");
    content.appendChild(document.createTextNode(countyGeo[countyIndex].properties.NAMELSAD));
    popup.setContent(content.innerHTML);
    pin.unbindPopup();
    pin.bindPopup(popup, {offset: L.point(0, -35)});
    pin.on("click", function(e){pin.openPopup();});
}

function updateDropdown(e){

    //update the dropdown
    var dd = document.getElementById("dropdown");
    var newIndex = updatePin(e);
    var currentIndex = dd.selectedIndex - 1;
    if(newIndex !== null && newIndex !== currentIndex){
        dd.value = "" + newIndex;
        //updatePopup(newIndex);
    }
    if(newIndex !== null){
        document.getElementById("go").disabled = false;
        //pin.openPopup();
    }
    else{
        dd.value = "-1";
        document.getElementById("go").disabled = true;
        //pin.closePopup();
    }

    return newIndex;
}

function changeCounty(e){
    //make sure the target county is not selected
    if(e.target.selectedIndex > 0){
        var countyIndex = e.target.selectedIndex - 1;
        if(countyLayers.active[countyIndex] === undefined){
            var county = countyGeo[countyIndex];
            var bbox = county.properties.boundaryBoxes;

            //move the map to center on the county
            map.fitBounds([
                [bbox[3][1], bbox[3][0]], //southwest point
                [bbox[1][1], bbox[1][0]], //northeast point
            ]);

            //find a point in the county
            var midLat = ((bbox[1][1]+90.0 + bbox[3][1]+90.0) / 2) - 90.0;
            var midLng = ((bbox[1][0]+180.0 + bbox[3][0]+180.0) / 2) - 180.0;

            //move the midpoint to a location inside the county
            if(!isInside([midLng, midLat], county)){

                //find the closest point
                var polys = county.geometry.type === "MultiPolygon" ? county.geometry.coordinates[0][0] : county.geometry.coordinates[0];
                var closestXY = 0;
                var closestDist = Math.pow(Math.pow(polys[closestXY][0]-midLng, 2) + Math.pow(polys[closestXY][1]-midLat, 2), 0.5);
                for(var i = 1; i < polys.length; i++){
                    var x = polys[i][0];
                    var y = polys[i][1];
                    var dist = Math.pow(Math.pow(x-midLng, 2) + Math.pow(y-midLat, 2), 0.5);
                    if(closestDist > dist){
                        closestXY = i;
                        closestDist = dist;
                    }
                }
                midLng = polys[closestXY][0];
                midLat = polys[closestXY][1];
            }

            //update the pin and popup
            updatePin({latlng: new L.latLng(midLat, midLng)});
            document.getElementById("go").disabled = false;
            //updatePopup(countyIndex);
            //pin.openPopup();
        }
    }
}

function toggleForm(e){
    var mw = document.getElementById("map-wrapper");
    var go = document.getElementById("go");
    if(mw.className === "map-start" || mw.className === "map-tall"){
        mw.className = "map-short";
        go.innerHTML = "Hide Voter Form";
    }
    else{
        mw.className = "map-tall";
        go.innerHTML = "Request Voter Form";
    }
}

function rezoomMap(e){
    if(e.target.className === "map-short" || e.target.className === "map-tall"){
        map.setView(pin.getLatLng());
        map.invalidateSize(true);
    }
}

function loadCountyData(){
        //Load state border
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "static/geojson/tiger2014.state.ca.geo.json");
        xhr.overrideMimeType("application/json");
        xhr.onload = function(){
            var ca = L.GeoJSON.geometryToLayer(JSON.parse(this.responseText).features[0]);
            ca.setStyle({
                color: "#F95252",
                opacity: 0.5,
                fill: false,
            });
            map.addLayer(ca);
        };
        xhr.send();

        //Load counties
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "static/geojson/tiger2014.county.ca.geo.json");
        xhr.overrideMimeType("application/json");
        xhr.onload = function(){
            //Parse counties
            countyGeo = JSON.parse(this.responseText).features;
            for(var i = 0; i < countyGeo.length; i++){
                addBoxes(countyGeo[i]);
            }

            //sort alphabetically
            countyGeo.sort(function(a, b){
                return a.properties.NAMELSAD.toLowerCase().localeCompare(b.properties.NAMELSAD, "en", {sensitivity: "base"});
            });

            //Initialize the pin
            pin.on("drag", updatePin);
            pin.on("dragend", updateDropdown);
            map.on("click", updateDropdown);
            pin.addTo(map);
            //updatePin({latlng: new L.latLng(defaultLatLng[0], defaultLatLng[1])});

            //Initialize the dropdown
            var dd = document.getElementById("dropdown");
            for(var i = 0; i < countyGeo.length; i++){
                var option = document.createElement("option");
                option.value = i+"";
                option.appendChild(document.createTextNode(countyGeo[i].properties.NAMELSAD));
                dd.appendChild(option);
            }
            document.getElementById("loading").style.display = "none";
            document.getElementById("menu").style.display = "block";
            dd.value = "-1";
            dd.addEventListener("change", changeCounty);

            //Initialize request form toggle
            var gobtn = document.getElementById("go");
            gobtn.disabled = true;
            gobtn.addEventListener("click", toggleForm);
            document.getElementById("map-wrapper").addEventListener("transitionend", rezoomMap);
        };
        xhr.send();

        //request user's location
        function showPosition(position){
            if(countyGeo){
                var ll = new L.latLng(position.coords.latitude, position.coords.longitude);
                var newIndex = updateDropdown({latlng: ll});
                if(newIndex !== null){
                    map.setView(ll, 14);
                    toggleForm();
                }
                else{
                    map.setView(ll);
                }
            }
            else{
                setTimeout(showPosition, 300, position);
            }
        }
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
                showPosition, function(){}, {enableHighAccuracy: true});
        }
}

