# pbfish 🐟

A simple, zero-dependency module for handling Google Maps' loosely protobuf-inspired data formats. This module can handle the following two encodings:

 * urlencoded protobuf, as seen in many Google Maps urls, i.e. [in this link](https://www.google.com/maps/@53.2115687,6.566413,3a,75y,255.84h,90t/data=!3m7!1e1!3m5!1sJ1lsIa1AUTItTwcisKl26Q!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fpanoid%3DJ1lsIa1AUTItTwcisKl26Q%26cb_client%3Dmaps_sv.tactile.gps%26w%3D203%26h%3D100%26yaw%3D247.16174%26pitch%3D0%26thumbfov%3D100!7i16384!8i8192) the entire part after `data=`
 * JSON-encoded protobuf, as seen in many internal Google Maps endpoints (such as SingleImageSearch), aka pretty much anything with a `application/json+protobuf` content-type.

## Usage

You can install this package by typing `npm i @gmaps-tools/pbfish`

This tool was built around JSON representations of protobuf definitions. In case you have a `.proto` file, you must first convert it to a JSON definition using [protobufjs-cli](https://www.npmjs.com/package/protobufjs-cli).

Once you have a JSON definition, you can do something like this:

```ts
import pbfish from "@gmaps-tools/pbfish";
const parser = new pbfish(yourDefinition);
const currentLocation = parser.create("Location"); // loads the protobuf definition called Location from your json
```

You can then use the following methods to parse and manipulate data:
```ts
currentLocation.value = {lat: 53.210, lng: 6.564, notes: {country: "nl", subdivision: "groningen"}} // loads in a value to the the parser
// note setting .value again, i.e. doing something along the lines of currentLocation.value = {lat: 1, lng: 2} will only overwrite the changed values, and not unset any previously set value
currentLocation.toUrl(); // exports a value as a url-encoded protobuf format, i.e. "!1d53.210!2d6.564!3m2!1snl!2sgroningen"
currentLocation.toJSON(); // exports value as a json-encoded protobuf format, i.e. '[53.210,6.564,null,["nl", "groningen"]]'
currentLocation.toArray(); // exports value as a json-encoded protobuf format (decoded into an array), i.e. [53.210,6.564,undefined,["nl", "groningen"]]
currentLocation.fromUrl("!1d53.21034178655471!2d6.564304111160638!3m2!1snl!2sgroningen"); // loads a value from a url-encoded format
currentLocation.fromJSON('[53.21034178655471,6.56430411111160638,null,["nl", "groningen"]]'); // loads a value from a json-encoded protobuf format
currentLocation.fromArray([53.21034178655471,6.56430411111160638,undefined,["nl", "groningen"]]); // loads a value from a json-encoded protobuf format (post-JSON.parse())
```

For enums, you can use either their numerical value or literal text value, i.e. if you have an enum defined as
```json
"ImageFrontendType": {
	"values": {
		"OFFICIAL": 2,
		"UNKNOWN": 3,
		"USER_UPLOADED": 10
	}
}
```
, you can set its value to be either `2` or the string `"OFFICIAL"`.

You can also access the entire data by using `.value`, i.e.
```js
currentLocation.value // returns the entire value of the data, i.e. {lat: 53.210, lng: 6.564, notes: {country: "nl", subdivision: "groningen"}}
```

Specific data points can be accessed (but not set!) with dot accessors, i.e.
```js
currentLocation.notes // returns {country: "nl", subdivision: "groningen"}
currentLocation.notes.country // returns "nl"
```

As of now, my current list of reverse engineered protobuf definitions is not publicly available, but I will share them soon, hopefully.

## Limitations

For any project that does not involve Google Maps, you will usually get better results if you use a standard protobuf format, rather than these alternative encodings. If you wish to do so, I recommend the [pbf](https://www.npmjs.com/package/pbf) module since it is very performant.

The following features are missing:

 * `bytes` datatype (I am yet to see a practical example of this in my reverse engineering, so I don't know what it looks like on Google's side)
 * urlencoding `repeated` fields (not sure if this is even allowed by Google Maps)