export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) : number {
    // distance between lats and longs
    let dLat : number = (lat2 - lat1) * Math.PI / 180.0
    let dLon : number = (lng2 - lng1) * Math.PI / 180.0

    //convert to radiansa
    lat1 = (lat1) * Math.PI / 180.0
    lat2 = (lat2) * Math.PI / 180.0

    // apply formulae
    let a : number = Math.pow(Math.sin(dLat / 2), 2) +
                    Math.pow(Math.sin(dLon / 2), 2) *
                    Math.cos(lat1) *
                    Math.cos(lat2);
    let rad : number = 6371;
    let c : number = 2 * Math.asin(Math.sqrt(a))
    return rad * c;
}