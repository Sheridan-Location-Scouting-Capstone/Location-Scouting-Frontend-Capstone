interface LocationSchema {
    id: number;
    name: string;
    contact: string;
    province: string;
    city: string;
    zipcode: string;
    address: string;
    locationKeywords: string[]
}

// Note: that multiple locations can use the same photo