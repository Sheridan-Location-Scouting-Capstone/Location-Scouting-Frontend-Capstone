export type PhotoUploadInput = {
    locationId: string
    buffer: Buffer
    fileName: string
    mimeType: string
    displayOrder?: number
}