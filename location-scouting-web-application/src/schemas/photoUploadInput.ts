export type PhotoUploadInput = {
    locationId?: string
    buffer: Buffer
    filename: string
    name?: string
    mimeType: string
    displayOrder?: number
}