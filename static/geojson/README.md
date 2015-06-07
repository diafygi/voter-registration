###GeoJSON from U.S. Census shapefiles

The county boundaries in this dataset are from the U.S. Census
TIGER 2014 shapefiles. Here's the commands that were used to
download and convert them from their shapefile format to
GeoJSON.

###Prerequisites

* ogr2ogr

###Commands

```bash
#make a temporary directory
mkdir /tmp/shapefiles
cd /tmp/shapefiles

#download the state shapefiles and unzip
curl ftp://ftp2.census.gov/geo/tiger/TIGER2014/STATE/tl_2014_us_state.zip > tl_2014_us_state.zip
unzip tl_2014_us_state.zip -d .

#extract California (state id 6)
ogr2ogr -f GeoJSON -t_srs crs:84 -where "statefp = '06'" tiger2014.state.ca.geo.json tl_2014_us_state.shp

#download the county shapefiles and unzip
curl ftp://ftp2.census.gov/geo/tiger/TIGER2014/COUNTY/tl_2014_us_county.zip > tl_2014_us_county.zip
unzip tl_2014_us_county.zip -d .

#extract California counties
ogr2ogr -f GeoJSON -t_srs crs:84 -where "statefp = '06'" tiger2014.county.ca.geo.json tl_2014_us_county.shp
```
