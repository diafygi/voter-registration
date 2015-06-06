//Globals
var countyGeo;
var countyLayers = {active: {}, cached: {}};

//Calculate a polygon box that surrounds an arbitrayrpolygon
//  -Input is a GeoJSON feature (Polygon or MultiPolygon)
//  -Returns the feature with boundaryBoxes added to the feature's properties
//  -Adapted from https://github.com/Turfjs/turf-extent
function addBoxes(feature){

    //add boundaryBoxes to the feature's properties
    feature.properties.boundaryBoxes = [];
    var polys = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];

    for(var p = 0; p < polys.length; p++){

        //default boundaryBox is inverse infinity box
        var bbox = [
            [ 179.999999, -89.999999], //northwest corner
            [-179.999999, -89.999999], //northeast corner
            [-179.999999,  89.999999], //southeast corner
            [ 179.999999,  89.999999], //southwest corner
        ];

        //find the boundary coordinates for this polygon's box
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
        feature.properties.boundaryBoxes.push(bbox);
    }

    return feature;
};

//See if a point is within a feature
//  -Input is a GeoJSON feature (Polygon or MultiPolygon)
//  -Returns true or false
//  -Adapted from https://github.com/Turfjs/turf-inside
function isInside(xy, feature){
    var polys = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];
    var insidePoly = false;
    var i = 0;
    while (i < polys.length && !insidePoly) {

        // check if in boundaryBox
        if(inRing(xy, feature.properties.boundaryBoxes[i])){

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
        }
        i++;
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

            //update the county name
            console.log(countyGeo[countyIndex].properties.NAMELSAD);
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
}


