mapboxgl.accessToken = mapToken;
var map = new mapboxgl.Map({
  container: "map", // container ID
  style: 'mapbox://styles/mapbox/streets-v11', // style URL
  center: houseObj.geometry.coordinates, // starting position [lng, lat]
  zoom: 15 // starting zoom
});
var marker = new mapboxgl.Marker({
  color: "#ABAAFF"
}).setLngLat(houseObj.geometry.coordinates)
  .addTo(map);